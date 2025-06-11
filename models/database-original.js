/**
 * Database Module
 * 
 * This module handles all database operations for the VotingApp.
 * It initializes the SQLite database, creates tables, sets up the
 * default admin user, and provides async wrapper functions for
 * database operations.
 */

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

/**
 * Create SQLite database connection
 * Database file is stored in the root directory as 'voting.db'
 */
const db = new sqlite3.Database('./voting.db', (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to SQLite database');
    }
});

/**
 * Initialize database with schema
 * Reads the schema.sql file and creates all necessary tables:
 * - users: Stores user accounts and authentication data
 * - polls: Stores poll information with thresholds
 * - options: Stores poll options/choices
 * - votes: Records user votes
 * After table creation, runs migrations and creates the default admin user
 */
const initializeDatabase = () => {
    const schemaPath = path.join(__dirname, '..', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    db.exec(schema, (err) => {
        if (err) {
            console.error('Error creating tables:', err);
        } else {
            console.log('Database tables created successfully');
            runMigrations();
        }
    });
};

/**
 * Run database migrations to add new columns to existing tables
 * Adds vote_threshold, is_approved, and approved_at columns to polls table
 */
const runMigrations = () => {
    // Check if vote_threshold column exists
    db.get("PRAGMA table_info(polls)", (err, result) => {
        if (err) {
            console.error('Error checking table info:', err);
            createAdminUser();
            return;
        }
        
        // Get all columns
        db.all("PRAGMA table_info(polls)", (err, columns) => {
            if (err) {
                console.error('Error getting column info:', err);
                createAdminUser();
                return;
            }
            
            const hasThreshold = columns.some(col => col.name === 'vote_threshold');
            const hasApproved = columns.some(col => col.name === 'is_approved');
            const hasApprovedAt = columns.some(col => col.name === 'approved_at');
            const hasCategory = columns.some(col => col.name === 'category');
            
            let migrationsToRun = [];
            
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
            
            if (migrationsToRun.length > 0) {
                console.log('Running database migrations...');
                const runNextMigration = (index) => {
                    if (index >= migrationsToRun.length) {
                        console.log('Migrations completed successfully');
                        createAdminUser();
                        return;
                    }
                    
                    db.run(migrationsToRun[index], (err) => {
                        if (err) {
                            console.error('Migration error:', err);
                        } else {
                            console.log('Migration completed:', migrationsToRun[index]);
                        }
                        runNextMigration(index + 1);
                    });
                };
                runNextMigration(0);
            } else {
                console.log('No migrations needed');
                createAdminUser();
            }
        });
    });
};

/**
 * Create default admin user
 * Creates an admin user account on first run using environment variables
 * or default values if not specified.
 * 
 * Environment variables:
 * - ADMIN_USERNAME: Admin username (default: 'admin')
 * - ADMIN_PASSWORD: Admin password (default: 'admin123')
 * - ADMIN_EMAIL: Admin email (default: 'admin@community.com')
 * 
 * The password is hashed using SHA-256 before storage.
 * Uses INSERT OR IGNORE to prevent duplicate admin accounts.
 */
const createAdminUser = () => {
    const crypto = require('crypto');
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@community.com';
    
    // Hash the password using SHA-256
    const hashedPassword = crypto.createHash('sha256').update(adminPassword).digest('hex');
    
    // Insert admin user with is_admin and is_verified flags set to true
    db.run(
        `INSERT OR IGNORE INTO users (username, password, email, name, is_admin, is_verified) VALUES (?, ?, ?, ?, 1, 1)`,
        [adminUsername, hashedPassword, adminEmail, 'Administrator'],
        (err) => {
            if (err) {
                console.error('Error creating admin user:', err);
            } else {
                console.log('Admin user created/verified');
                console.log('Default admin credentials: username=admin, password=admin123');
            }
        }
    );
};

// Initialize database tables and admin user on application start
initializeDatabase();

/**
 * Promise-based wrapper for db.get()
 * Retrieves a single row from the database
 * @param {string} sql - SQL query to execute
 * @param {Array} params - Query parameters for prepared statement
 * @returns {Promise<Object>} Promise resolving to the row object or null
 */
db.getAsync = function(sql, params) {
    return new Promise((resolve, reject) => {
        this.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

/**
 * Promise-based wrapper for db.all()
 * Retrieves all matching rows from the database
 * @param {string} sql - SQL query to execute
 * @param {Array} params - Query parameters for prepared statement
 * @returns {Promise<Array>} Promise resolving to array of row objects
 */
db.allAsync = function(sql, params) {
    return new Promise((resolve, reject) => {
        this.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

/**
 * Promise-based wrapper for db.run()
 * Executes an INSERT, UPDATE, or DELETE statement
 * @param {string} sql - SQL statement to execute
 * @param {Array} params - Statement parameters for prepared statement
 * @returns {Promise<Object>} Promise resolving to {id: lastID, changes: changes}
 */
db.runAsync = function(sql, params) {
    return new Promise((resolve, reject) => {
        this.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve({ id: this.lastID, changes: this.changes });
        });
    });
};

/**
 * Check if a poll meets its vote threshold and mark it as approved
 * @param {number} pollId - The ID of the poll to check
 * @returns {Promise<boolean>} Promise resolving to true if poll was approved
 */
db.checkPollThreshold = async function(pollId) {
    try {
        // Get poll info including threshold and current vote count
        const pollInfo = await new Promise((resolve, reject) => {
            this.get(
                `SELECT p.vote_threshold, p.is_approved, COUNT(DISTINCT v.id) as vote_count
                 FROM polls p
                 LEFT JOIN votes v ON p.id = v.poll_id
                 WHERE p.id = ? AND p.vote_threshold IS NOT NULL AND p.is_approved = 0
                 GROUP BY p.id`,
                [pollId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });

        // If poll has threshold and isn't already approved, check if threshold is met
        if (pollInfo && pollInfo.vote_count >= pollInfo.vote_threshold) {
            await new Promise((resolve, reject) => {
                this.run(
                    'UPDATE polls SET is_approved = 1, approved_at = datetime("now") WHERE id = ?',
                    [pollId],
                    (err) => {
                        if (err) reject(err);
                        else resolve();
                    }
                );
            });
            
            console.log(`Poll ${pollId} approved! Reached threshold of ${pollInfo.vote_threshold} votes with ${pollInfo.vote_count} votes.`);
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('Error checking poll threshold:', error);
        return false;
    }
};

// Export the database object with async methods attached
module.exports = db;