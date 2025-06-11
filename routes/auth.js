/**
 * Authentication Routes
 * 
 * This module handles all authentication-related routes:
 * - User login
 * - User registration
 * - Logout functionality
 * 
 * All passwords are hashed using SHA-256 before storage
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { db } = require('../models/database');

/**
 * GET /auth/login
 * Display the login page
 */
router.get('/login', (req, res) => {
    res.render('auth/login', { error: null, user: req.session.user || null });
});

/**
 * POST /auth/login
 * Process login form submission
 * - Validates username and password
 * - Creates session for authenticated users
 * - Redirects to home page on success
 */
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    
    try {
        // Look up user by username
        const user = await new Promise((resolve, reject) => {
            db.get(
                'SELECT * FROM users WHERE username = $1',
                [username],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });

        // Check if user exists
        if (!user) {
            return res.render('auth/login', { error: 'Invalid username or password', user: null });
        }

        // Hash the provided password and compare with stored hash
        const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
        
        if (user.password !== hashedPassword) {
            return res.render('auth/login', { error: 'Invalid username or password', user: null });
        }

        // Create session for authenticated user
        req.session.user = {
            id: user.id,
            username: user.username,
            is_admin: user.is_admin
        };

        // Redirect to home page after successful login
        res.redirect('/');
    } catch (error) {
        console.error('Login error:', error);
        res.render('auth/login', { error: 'An error occurred during login', user: null });
    }
});

/**
 * GET /auth/register
 * Display the registration page
 */
router.get('/register', (req, res) => {
    res.render('auth/register', { error: null, user: req.session.user || null });
});

/**
 * POST /auth/register
 * Process registration form submission
 * - Validates password requirements
 * - Checks for existing usernames
 * - Creates new user account
 */
router.post('/register', async (req, res) => {
    const { username, password, confirmPassword } = req.body;

    // Validate password confirmation
    if (password !== confirmPassword) {
        return res.render('auth/register', { error: 'Passwords do not match', user: null });
    }

    // Validate password length
    if (password.length < 6) {
        return res.render('auth/register', { error: 'Password must be at least 6 characters', user: null });
    }

    try {
        // Check if username already exists
        const existingUser = await new Promise((resolve, reject) => {
            db.get(
                'SELECT id FROM users WHERE username = $1',
                [username],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });

        if (existingUser) {
            return res.render('auth/register', { error: 'Username already exists', user: null });
        }

        // Hash password before storing
        const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
        
        // Create new user account
        await new Promise((resolve, reject) => {
            db.run(
                'INSERT INTO users (username, password) VALUES ($1, $2)',
                [username, hashedPassword],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });

        // Redirect to login page after successful registration
        res.redirect('/auth/login');
    } catch (error) {
        console.error('Registration error:', error);
        res.render('auth/register', { error: 'An error occurred during registration', user: null });
    }
});

/**
 * GET /auth/logout
 * Destroy user session and redirect to home page
 */
router.get('/logout', (req, res) => {
    req.session.destroy();  // Clear session data
    res.redirect('/');
});

// Export the router for use in main app
module.exports = router;