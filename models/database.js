const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Create database connection
const db = new sqlite3.Database('./voting.db', (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to SQLite database');
    }
});

// Initialize database with schema
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

// Create default admin user
const createAdminUser = () => {
    const crypto = require('crypto');
    const adminUsername = process.env.ADMIN_USERNAME || 'Will';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const adminEmail = process.env.ADMIN_EMAIL || 'will@community.com';
    
    // Hash the password
    const hashedPassword = crypto.createHash('sha256').update(adminPassword).digest('hex');
    
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

// Initialize database on first run
initializeDatabase();

// Helper function to run queries with promises
db.getAsync = function(sql, params) {
    return new Promise((resolve, reject) => {
        this.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

db.allAsync = function(sql, params) {
    return new Promise((resolve, reject) => {
        this.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

db.runAsync = function(sql, params) {
    return new Promise((resolve, reject) => {
        this.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve({ id: this.lastID, changes: this.changes });
        });
    });
};

module.exports = db;