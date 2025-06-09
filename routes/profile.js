/**
 * Profile Routes
 * 
 * This module handles user profile functionality:
 * - View user's created polls and voting history
 * - Change password functionality
 * - Personal statistics and activity
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../models/database');

/**
 * Middleware to require user authentication
 * Redirects to login page if user is not authenticated
 */
function requireAuth(req, res, next) {
    if (!req.session.user) {
        return res.redirect('/auth/login');
    }
    next();
}

/**
 * GET /profile
 * Display user profile page with:
 * - Polls created by the user
 * - Polls the user has voted in
 * - Vote counts for user's polls
 */
router.get('/', requireAuth, async (req, res) => {
    const userId = req.session.user.id;
    
    try {
        // Fetch polls created by the user with vote counts
        const userPolls = await new Promise((resolve, reject) => {
            db.all(
                `SELECT p.*, COUNT(DISTINCT v.id) as vote_count
                 FROM polls p
                 LEFT JOIN votes v ON p.id = v.poll_id
                 WHERE p.created_by = ?
                 GROUP BY p.id
                 ORDER BY p.created_at DESC`,
                [userId],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });

        // Fetch polls the user has voted in with their selected option
        const votedPolls = await new Promise((resolve, reject) => {
            db.all(
                `SELECT p.*, o.option_text as voted_option
                 FROM votes v
                 JOIN polls p ON v.poll_id = p.id
                 JOIN options o ON v.option_id = o.id
                 WHERE v.user_id = ?
                 ORDER BY v.voted_at DESC`,
                [userId],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });

        res.render('profile/index', {
            user: req.session.user,
            userPolls,
            votedPolls
        });
    } catch (error) {
        console.error('Error loading profile:', error);
        res.status(500).render('error', { message: 'Failed to load profile' });
    }
});

/**
 * GET /profile/change-password
 * Display password change form
 */
router.get('/change-password', requireAuth, (req, res) => {
    res.render('profile/change-password', { 
        user: req.session.user,
        error: null,
        success: null
    });
});

/**
 * POST /profile/change-password
 * Process password change request
 * - Validates current password
 * - Enforces password requirements
 * - Updates password hash in database
 */
router.post('/change-password', requireAuth, async (req, res) => {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const userId = req.session.user.id;

    // Validate password confirmation
    if (newPassword !== confirmPassword) {
        return res.render('profile/change-password', {
            user: req.session.user,
            error: 'New passwords do not match',
            success: null
        });
    }

    // Validate password length requirement
    if (newPassword.length < 6) {
        return res.render('profile/change-password', {
            user: req.session.user,
            error: 'Password must be at least 6 characters',
            success: null
        });
    }

    try {
        // Fetch current password hash from database
        const user = await new Promise((resolve, reject) => {
            db.get(
                'SELECT password FROM users WHERE id = ?',
                [userId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });

        // Verify current password is correct
        const hashedCurrent = crypto.createHash('sha256').update(currentPassword).digest('hex');
        
        if (user.password !== hashedCurrent) {
            return res.render('profile/change-password', {
                user: req.session.user,
                error: 'Current password is incorrect',
                success: null
            });
        }

        // Hash new password and update in database
        const hashedNew = crypto.createHash('sha256').update(newPassword).digest('hex');
        
        await new Promise((resolve, reject) => {
            db.run(
                'UPDATE users SET password = ? WHERE id = ?',
                [hashedNew, userId],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });

        // Show success message
        res.render('profile/change-password', {
            user: req.session.user,
            error: null,
            success: 'Password changed successfully'
        });
    } catch (error) {
        console.error('Error changing password:', error);
        res.render('profile/change-password', {
            user: req.session.user,
            error: 'An error occurred while changing password',
            success: null
        });
    }
});

// Export the router for use in main app
module.exports = router;