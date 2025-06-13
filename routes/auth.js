/**
 * Authentication Routes - Refactored with Clean Architecture
 * 
 * This module handles all authentication-related routes:
 * - User login
 * - User registration
 * - Logout functionality
 * 
 * Now uses services and validation middleware for better separation of concerns
 */

const express = require('express');
const router = express.Router();
const UserService = require('../src/services/UserService');
const UserRepository = require('../src/repositories/UserRepository');
const { db } = require('../models/database');
const { validateRequest, sanitizeRequest } = require('../src/middleware/validation');
const { userSchemas } = require('../src/validators/schemas');

// Initialize dependencies
const userRepository = new UserRepository(db);
const userService = new UserService(userRepository);

/**
 * GET /auth/login
 * Display the login page
 */
router.get('/login', (req, res) => {
    res.render('auth/login', { 
        error: req.flash('error')[0] || null, 
        user: req.session.user || null 
    });
});

/**
 * POST /auth/login
 * Process login form submission
 * Now uses UserService for business logic
 */
router.post('/login', 
    sanitizeRequest,
    validateRequest(userSchemas.login),
    async (req, res) => {
        const { username, password } = req.body;
        
        console.log('🔐 LOGIN ATTEMPT:', { username, timestamp: new Date().toISOString() });
        
        try {
            // Delegate to service layer
            console.log('🔍 Calling userService.authenticate...');
            const user = await userService.authenticate(username, password);
            console.log('✅ Authentication successful:', { 
                userId: user.id, 
                username: user.username, 
                isAdmin: user.is_admin 
            });
            
            // Create session
            console.log('📝 Creating session...');
            req.session.user = {
                id: user.id,
                username: user.username,
                is_admin: user.is_admin
            };
            
            console.log('💾 Session created:', req.session.user);
            console.log('🔑 Session ID:', req.sessionID);
            
            // Save session explicitly
            req.session.save((err) => {
                if (err) {
                    console.error('❌ Session save error:', err);
                    req.flash('error', 'Session creation failed');
                    return res.redirect('/auth/login');
                }
                
                console.log('✅ Session saved successfully, redirecting to /');
                res.redirect('/');
            });
            
        } catch (error) {
            console.error('❌ Login error:', error);
            req.flash('error', error.message);
            res.redirect('/auth/login');
        }
    }
);

/**
 * GET /auth/register
 * Display the registration page
 */
router.get('/register', (req, res) => {
    res.render('auth/register', { 
        error: req.flash('error')[0] || null, 
        user: req.session.user || null 
    });
});

/**
 * POST /auth/register
 * Process registration form submission
 * Now uses UserService and validation middleware
 */
router.post('/register',
    sanitizeRequest,
    (req, res, next) => {
        // Add confirm password validation
        if (req.body.password !== req.body.confirmPassword) {
            req.flash('error', 'Passwords do not match');
            return res.redirect('/auth/register');
        }
        next();
    },
    validateRequest(userSchemas.register),
    async (req, res) => {
        const { username, email, password } = req.body;

        try {
            // Delegate to service layer
            await userService.register(username, email, password);
            
            // Redirect to login page
            req.flash('success', 'Registration successful! Please log in.');
            res.redirect('/auth/login');
        } catch (error) {
            console.error('Registration error:', error);
            req.flash('error', error.message);
            res.redirect('/auth/register');
        }
    }
);

/**
 * GET /auth/logout
 * Destroy user session and redirect to home page
 */
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        res.redirect('/');
    });
});

module.exports = router;