const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../models/database');

router.get('/login', (req, res) => {
    res.render('auth/login', { error: null, user: req.session.user || null });
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    
    try {
        const user = await new Promise((resolve, reject) => {
            db.get(
                'SELECT * FROM users WHERE username = ?',
                [username],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });

        if (!user) {
            return res.render('auth/login', { error: 'Invalid username or password', user: null });
        }

        const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
        
        if (user.password !== hashedPassword) {
            return res.render('auth/login', { error: 'Invalid username or password', user: null });
        }

        req.session.user = {
            id: user.id,
            username: user.username,
            is_admin: user.is_admin
        };

        res.redirect('/');
    } catch (error) {
        console.error('Login error:', error);
        res.render('auth/login', { error: 'An error occurred during login', user: null });
    }
});

router.get('/register', (req, res) => {
    res.render('auth/register', { error: null, user: req.session.user || null });
});

router.post('/register', async (req, res) => {
    const { username, password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
        return res.render('auth/register', { error: 'Passwords do not match', user: null });
    }

    if (password.length < 6) {
        return res.render('auth/register', { error: 'Password must be at least 6 characters', user: null });
    }

    try {
        const existingUser = await new Promise((resolve, reject) => {
            db.get(
                'SELECT id FROM users WHERE username = ?',
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

        const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
        
        await new Promise((resolve, reject) => {
            db.run(
                'INSERT INTO users (username, password) VALUES (?, ?)',
                [username, hashedPassword],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });

        res.redirect('/auth/login');
    } catch (error) {
        console.error('Registration error:', error);
        res.render('auth/register', { error: 'An error occurred during registration', user: null });
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

module.exports = router;