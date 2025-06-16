/**
 * Database Module - PostgreSQL Only
 * 
 * This module handles all database operations for the VotingApp using PostgreSQL.
 * It initializes the database, creates tables, sets up the default admin user,
 * and provides async functions for database operations.
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Create PostgreSQL connection pool
const connectionConfig = process.env.DATABASE_URL ? {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
} : {
    host: 'localhost',
    port: 5432,
    database: 'votingapp',
    user: 'postgres',
    password: 'postgres'
};

const pool = new Pool({
    ...connectionConfig,
    max: parseInt(process.env.DB_MAX_CONNECTIONS) || 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 30000,
});

// Database interface
const db = {
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
            // If RETURNING was used, return the first row's data
            if (result.rows && result.rows.length > 0) {
                return {
                    id: result.rows[0].id || null,
                    changes: result.rowCount,
                    ...result.rows[0]
                };
            }
            return {
                id: null,
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

/**
 * Test database connection
 */
const testConnection = async () => {
    try {
        await pool.query('SELECT 1');
        console.log('PostgreSQL connection verified');
        return true;
    } catch (error) {
        console.error('PostgreSQL connection failed:', error);
        throw error;
    }
};

/**
 * Initialize database with schema
 */
const initializeDatabase = async () => {
    try {
        // Create tables
        const tables = [
            // Users table
            `CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                name TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_admin BOOLEAN DEFAULT FALSE,
                is_verified BOOLEAN DEFAULT FALSE
            )`,
            
            // Polls table
            `CREATE TABLE IF NOT EXISTS polls (
                id SERIAL PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                created_by INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                end_date TIMESTAMP,
                is_active BOOLEAN DEFAULT TRUE,
                is_deleted BOOLEAN DEFAULT FALSE,
                vote_threshold INTEGER DEFAULT NULL,
                is_approved BOOLEAN DEFAULT FALSE,
                approved_at TIMESTAMP DEFAULT NULL,
                category TEXT DEFAULT 'general',
                poll_type TEXT DEFAULT 'simple'
            )`,
            
            // Options table
            `CREATE TABLE IF NOT EXISTS options (
                id SERIAL PRIMARY KEY,
                poll_id INTEGER REFERENCES polls(id),
                option_text TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            
            // Votes table
            `CREATE TABLE IF NOT EXISTS votes (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                poll_id INTEGER REFERENCES polls(id),
                option_id INTEGER REFERENCES options(id),
                vote_data JSONB,
                voted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, poll_id)
            )`
        ];
        
        // Create each table
        for (const tableSQL of tables) {
            await db.exec(tableSQL);
        }
        
        // Create indexes for better performance
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_polls_created_by ON polls(created_by)',
            'CREATE INDEX IF NOT EXISTS idx_polls_is_active ON polls(is_active)',
            'CREATE INDEX IF NOT EXISTS idx_polls_end_date ON polls(end_date)',
            'CREATE INDEX IF NOT EXISTS idx_votes_user_id ON votes(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_votes_poll_id ON votes(poll_id)'
        ];
        
        for (const indexSQL of indexes) {
            await db.exec(indexSQL);
        }
        
        console.log('Database tables created successfully');
        await createAdminUser();
        
    } catch (error) {
        console.error('Error initializing database:', error);
        throw error;
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
        
        // PostgreSQL uses ON CONFLICT instead of INSERT OR IGNORE
        await db.run(
            `INSERT INTO users (username, password, email, name, is_admin, is_verified) 
             VALUES ($1, $2, $3, $4, $5, $6) 
             ON CONFLICT (username) DO NOTHING`,
            [adminUsername, hashedPassword, adminEmail, 'Administrator', true, true]
        );
        
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
        const sql = `SELECT p.vote_threshold, p.is_approved, COUNT(DISTINCT v.id) as vote_count
                     FROM polls p
                     LEFT JOIN options o ON p.id = o.poll_id
                     LEFT JOIN votes v ON o.id = v.option_id
                     WHERE p.id = $1 AND p.vote_threshold IS NOT NULL AND p.is_approved = FALSE
                     GROUP BY p.id, p.vote_threshold, p.is_approved`;
        
        const pollInfo = await db.get(sql, [pollId]);

        if (pollInfo && pollInfo.vote_count >= pollInfo.vote_threshold) {
            await db.run(
                'UPDATE polls SET is_approved = TRUE, approved_at = CURRENT_TIMESTAMP WHERE id = $1',
                [pollId]
            );
            
            console.log(`Poll ${pollId} approved! Reached threshold of ${pollInfo.vote_threshold} votes with ${pollInfo.vote_count} votes.`);
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('Error checking poll threshold:', error);
        return false;
    }
};

/**
 * Initialize the database module
 */
const initialize = async () => {
    try {
        await testConnection();
        await initializeDatabase();
        return true;
    } catch (error) {
        console.error('Database initialization failed:', error);
        throw error;
    }
};

// Add async methods for backward compatibility
db.getAsync = db.get;
db.allAsync = db.all;
db.runAsync = db.run;
db.checkPollThreshold = checkPollThreshold;

// Export the database object and initialize function
module.exports = { db, initialize };