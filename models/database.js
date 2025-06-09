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
 * - polls: Stores poll information
 * - options: Stores poll options/choices
 * - votes: Records user votes
 * After table creation, creates the default admin user
 */
const initializeDatabase = () => {
    const schemaPath = path.join(__dirname, '..', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    db.exec(schema, (err) => {
        if (err) {
            console.error('Error creating tables:', err);
        } else {
            console.log('Database tables created successfully');
            createAdminUser();
        }
    });
};

/**
 * Create default admin user
 * Creates an admin user account on first run using environment variables
 * or default values if not specified.
 * 
 * Environment variables:
 * - ADMIN_USERNAME: Admin username (default: 'Will')
 * - ADMIN_PASSWORD: Admin password (default: 'admin123')
 * - ADMIN_EMAIL: Admin email (default: 'will@community.com')
 * 
 * The password is hashed using SHA-256 before storage.
 * Uses INSERT OR IGNORE to prevent duplicate admin accounts.
 */
const createAdminUser = () => {
    const crypto = require('crypto');
    const adminUsername = process.env.ADMIN_USERNAME || 'Will';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const adminEmail = process.env.ADMIN_EMAIL || 'will@community.com';
    
    // Hash the password using SHA-256
    const hashedPassword = crypto.createHash('sha256').update(adminPassword).digest('hex');
    
    // Insert admin user with is_admin and is_verified flags set to true
    db.run(
        `INSERT OR IGNORE INTO users (username, password, email, name, is_admin, is_verified) VALUES (?, ?, ?, ?, 1, 1)`,
        [adminUsername, hashedPassword, adminEmail, 'Will'],
        (err) => {
            if (err) {
                console.error('Error creating admin user:', err);
            } else {
                console.log('Admin user created/verified');
                console.log('Default admin credentials: username=Will, password=admin123');
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

// Export the database object with async methods attached
module.exports = db;