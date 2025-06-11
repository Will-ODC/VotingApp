/**
 * Database Module - Multi-Database Support
 * 
 * This module handles all database operations for the VotingApp.
 * It supports both SQLite (development) and PostgreSQL (production).
 * It initializes the database, creates tables, sets up the default admin user,
 * and provides async wrapper functions for database operations.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Determine which database to use based on environment
const isProduction = process.env.NODE_ENV === 'production';
const usePostgreSQL = process.env.DATABASE_URL || isProduction;

let db;

if (usePostgreSQL) {
    // PostgreSQL setup for production
    const { Pool } = require('pg');
    
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    db = {
        // PostgreSQL connection pool
        pool: pool,
        
        // Execute a query that returns a single row
        get: async function(sql, params = []) {
            try {
                const result = await pool.query(sql, params);
                return result.rows[0] || null;
            } catch (error) {
                throw error;
            }
        },
        
        // Execute a query that returns multiple rows
        all: async function(sql, params = []) {
            try {
                const result = await pool.query(sql, params);
                return result.rows;
            } catch (error) {
                throw error;
            }
        },
        
        // Execute INSERT, UPDATE, DELETE statements
        run: async function(sql, params = []) {
            try {
                const result = await pool.query(sql, params);
                return {
                    id: result.rows[0]?.id || null,
                    changes: result.rowCount
                };
            } catch (error) {
                throw error;
            }
        },
        
        // Execute multiple statements (for schema creation)
        exec: async function(sql) {
            try {
                await pool.query(sql);
                return true;
            } catch (error) {
                throw error;
            }
        }
    };
    
    console.log('Connected to PostgreSQL database');
    
} else {
    // SQLite setup for development
    const sqlite3 = require('sqlite3').verbose();
    
    const sqliteDb = new sqlite3.Database('./voting.db', (err) => {
        if (err) {
            console.error('Error opening database:', err);
        } else {
            console.log('Connected to SQLite database');
        }
    });
    
    db = {
        // SQLite database instance
        db: sqliteDb,
        
        // Execute a query that returns a single row
        get: function(sql, params = []) {
            return new Promise((resolve, reject) => {
                sqliteDb.get(sql, params, (err, row) => {
                    if (err) reject(err);
                    else resolve(row || null);
                });
            });
        },
        
        // Execute a query that returns multiple rows
        all: function(sql, params = []) {
            return new Promise((resolve, reject) => {
                sqliteDb.all(sql, params, (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });
        },
        
        // Execute INSERT, UPDATE, DELETE statements
        run: function(sql, params = []) {
            return new Promise((resolve, reject) => {
                sqliteDb.run(sql, params, function(err) {
                    if (err) reject(err);
                    else resolve({ id: this.lastID, changes: this.changes });
                });
            });
        },
        
        // Execute multiple statements (for schema creation)
        exec: function(sql) {
            return new Promise((resolve, reject) => {
                sqliteDb.exec(sql, (err) => {
                    if (err) reject(err);
                    else resolve(true);
                });
            });
        }
    };
}

/**
 * Convert SQLite schema to PostgreSQL compatible schema
 */
const convertSchemaForPostgreSQL = (sqliteSchema) => {
    return sqliteSchema
        // Convert SQLite types to PostgreSQL types
        .replace(/INTEGER PRIMARY KEY AUTOINCREMENT/g, 'SERIAL PRIMARY KEY')
        .replace(/BOOLEAN DEFAULT 0/g, 'BOOLEAN DEFAULT FALSE')
        .replace(/BOOLEAN DEFAULT 1/g, 'BOOLEAN DEFAULT TRUE')
        .replace(/TIMESTAMP DEFAULT CURRENT_TIMESTAMP/g, 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP')
        .replace(/datetime\("now"\)/g, 'CURRENT_TIMESTAMP')
        // Handle UNIQUE constraints
        .replace(/TEXT UNIQUE/g, 'TEXT')
        .replace(/email TEXT UNIQUE,/g, 'email TEXT,')
        // Add explicit UNIQUE constraints after table creation would be handled separately
        ;
};

/**
 * Initialize database with schema
 */
const initializeDatabase = async () => {
    try {
        const schemaPath = path.join(__dirname, '..', 'schema.sql');
        let schema = fs.readFileSync(schemaPath, 'utf8');
        
        if (usePostgreSQL) {
            schema = convertSchemaForPostgreSQL(schema);
            
            // For PostgreSQL, we need to create tables one by one and handle unique constraints
            const tables = schema.split(';').filter(table => table.trim().length > 0);
            
            for (const tableSQL of tables) {
                try {
                    await db.exec(tableSQL.trim());
                } catch (error) {
                    // Ignore table already exists errors
                    if (!error.message.includes('already exists')) {
                        console.error('Error creating table:', error);
                    }
                }
            }
            
            // Add unique constraints for PostgreSQL
            try {
                await db.exec('ALTER TABLE users ADD CONSTRAINT users_username_unique UNIQUE (username)');
            } catch (error) {
                // Ignore if constraint already exists
            }
            
            try {
                await db.exec('ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email)');
            } catch (error) {
                // Ignore if constraint already exists
            }
            
        } else {
            // SQLite can handle the schema as-is
            await db.exec(schema);
        }
        
        console.log('Database tables created successfully');
        await runMigrations();
        
    } catch (error) {
        console.error('Error initializing database:', error);
    }
};

/**
 * Run database migrations to add new columns to existing tables
 */
const runMigrations = async () => {
    try {
        if (usePostgreSQL) {
            // PostgreSQL migrations
            const migrations = [
                {
                    check: "SELECT column_name FROM information_schema.columns WHERE table_name='polls' AND column_name='vote_threshold'",
                    migration: 'ALTER TABLE polls ADD COLUMN vote_threshold INTEGER DEFAULT NULL'
                },
                {
                    check: "SELECT column_name FROM information_schema.columns WHERE table_name='polls' AND column_name='is_approved'",
                    migration: 'ALTER TABLE polls ADD COLUMN is_approved BOOLEAN DEFAULT FALSE'
                },
                {
                    check: "SELECT column_name FROM information_schema.columns WHERE table_name='polls' AND column_name='approved_at'",
                    migration: 'ALTER TABLE polls ADD COLUMN approved_at TIMESTAMP DEFAULT NULL'
                },
                {
                    check: "SELECT column_name FROM information_schema.columns WHERE table_name='polls' AND column_name='category'",
                    migration: 'ALTER TABLE polls ADD COLUMN category TEXT DEFAULT \'general\''
                }
            ];
            
            for (const migration of migrations) {
                const result = await db.get(migration.check);
                if (!result) {
                    try {
                        await db.exec(migration.migration);
                        console.log('Migration completed:', migration.migration);
                    } catch (error) {
                        console.error('Migration error:', error);
                    }
                }
            }
            
        } else {
            // SQLite migrations (original logic)
            const columns = await db.all("PRAGMA table_info(polls)");
            
            const hasThreshold = columns.some(col => col.name === 'vote_threshold');
            const hasApproved = columns.some(col => col.name === 'is_approved');
            const hasApprovedAt = columns.some(col => col.name === 'approved_at');
            const hasCategory = columns.some(col => col.name === 'category');
            
            const migrationsToRun = [];
            
            if (!hasThreshold) {
                migrationsToRun.push('ALTER TABLE polls ADD COLUMN vote_threshold INTEGER DEFAULT NULL');
            }
            if (!hasApproved) {
                migrationsToRun.push('ALTER TABLE polls ADD COLUMN is_approved BOOLEAN DEFAULT 0');
            }
            if (!hasApprovedAt) {
                migrationsToRun.push('ALTER TABLE polls ADD COLUMN approved_at TIMESTAMP DEFAULT NULL');
            }
            if (!hasCategory) {
                migrationsToRun.push('ALTER TABLE polls ADD COLUMN category TEXT DEFAULT "general"');
            }
            
            for (const migration of migrationsToRun) {
                try {
                    await db.run(migration);
                    console.log('Migration completed:', migration);
                } catch (error) {
                    console.error('Migration error:', error);
                }
            }
        }
        
        console.log('Migrations completed successfully');
        await createAdminUser();
        
    } catch (error) {
        console.error('Error running migrations:', error);
        await createAdminUser();
    }
};

/**
 * Create default admin user
 */
const createAdminUser = async () => {
    try {
        const adminUsername = process.env.ADMIN_USERNAME || 'admin';
        const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@community.com';
        
        // Hash the password using SHA-256
        const hashedPassword = crypto.createHash('sha256').update(adminPassword).digest('hex');
        
        if (usePostgreSQL) {
            // PostgreSQL uses ON CONFLICT instead of INSERT OR IGNORE
            await db.run(
                `INSERT INTO users (username, password, email, name, is_admin, is_verified) 
                 VALUES ($1, $2, $3, $4, $5, $6) 
                 ON CONFLICT (username) DO NOTHING`,
                [adminUsername, hashedPassword, adminEmail, 'Administrator', true, true]
            );
        } else {
            // SQLite uses INSERT OR IGNORE
            await db.run(
                `INSERT OR IGNORE INTO users (username, password, email, name, is_admin, is_verified) VALUES (?, ?, ?, ?, 1, 1)`,
                [adminUsername, hashedPassword, adminEmail, 'Administrator']
            );
        }
        
        console.log('Admin user created/verified');
        console.log(`Default admin credentials: username=${adminUsername}, password=${adminPassword}`);
        
    } catch (error) {
        console.error('Error creating admin user:', error);
    }
};

/**
 * Check if a poll meets its vote threshold and mark it as approved
 */
const checkPollThreshold = async (pollId) => {
    try {
        let sql, params;
        
        if (usePostgreSQL) {
            sql = `SELECT p.vote_threshold, p.is_approved, COUNT(DISTINCT v.id) as vote_count
                   FROM polls p
                   LEFT JOIN votes v ON p.id = v.poll_id
                   WHERE p.id = $1 AND p.vote_threshold IS NOT NULL AND p.is_approved = FALSE
                   GROUP BY p.id, p.vote_threshold, p.is_approved`;
            params = [pollId];
        } else {
            sql = `SELECT p.vote_threshold, p.is_approved, COUNT(DISTINCT v.id) as vote_count
                   FROM polls p
                   LEFT JOIN votes v ON p.id = v.poll_id
                   WHERE p.id = ? AND p.vote_threshold IS NOT NULL AND p.is_approved = 0
                   GROUP BY p.id`;
            params = [pollId];
        }
        
        const pollInfo = await db.get(sql, params);

        if (pollInfo && pollInfo.vote_count >= pollInfo.vote_threshold) {
            if (usePostgreSQL) {
                await db.run(
                    'UPDATE polls SET is_approved = TRUE, approved_at = CURRENT_TIMESTAMP WHERE id = $1',
                    [pollId]
                );
            } else {
                await db.run(
                    'UPDATE polls SET is_approved = 1, approved_at = datetime("now") WHERE id = ?',
                    [pollId]
                );
            }
            
            console.log(`Poll ${pollId} approved! Reached threshold of ${pollInfo.vote_threshold} votes with ${pollInfo.vote_count} votes.`);
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('Error checking poll threshold:', error);
        return false;
    }
};

// Add async methods to the db object for backward compatibility
db.getAsync = db.get;
db.allAsync = db.all;
db.runAsync = db.run;
db.checkPollThreshold = checkPollThreshold;

// Initialize database on module load
initializeDatabase();

module.exports = db;