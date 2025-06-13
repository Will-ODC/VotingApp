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
const { db } = require('../models/database');

/**
 * Middleware to require user authentication
 * Redirects to login page if user is not authenticated
 */
function requireAuth(req, res, next) {
    console.log('🔐 AUTH CHECK');
    console.log('🔑 Session ID:', req.sessionID);
    console.log('👤 Session user:', req.session.user);
    console.log('📋 Full session:', req.session);
    
    if (!req.session.user) {
        console.log('❌ No session user found, redirecting to login');
        return res.redirect('/auth/login');
    }
    
    console.log('✅ Auth check passed');
    next();
}

/**
 * GET /profile
 * Display user profile page with:
 * - Polls created by the user
 * - Polls the user has voted in (with pagination)
 * - Vote counts for user's polls
 * Supports ?page=1,2,3... for participation results (10 per page)
 */
router.get('/', requireAuth, async (req, res) => {
    const userId = req.session.user.id;
    const page = parseInt(req.query.page) || 1; // Default to page 1
    const perPage = 10; // Fixed at 10 per page
    const offset = (page - 1) * perPage;
    
    try {
        // Fetch polls created by the user with vote counts
        const userPolls = await db.all(
            `SELECT p.*, COUNT(DISTINCT v.id) as vote_count
             FROM polls p
             LEFT JOIN votes v ON p.id = v.poll_id
             WHERE p.created_by = $1
             GROUP BY p.id
             ORDER BY p.created_at DESC`,
            [userId]
        );

        // Get total count of voted polls for pagination info
        const totalResult = await db.get('SELECT COUNT(*) as count FROM votes WHERE user_id = $1', [userId]);
        const totalVotedPolls = totalResult.count;

        // Calculate pagination info
        const totalPages = Math.ceil(totalVotedPolls / perPage);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        // Fetch polls the user has voted in with their selected option and poll status
        const votedPolls = await db.all(
            `SELECT p.id, p.title, p.description, p.created_at, p.end_date, p.is_active, p.vote_threshold, p.is_approved,
             o.option_text as voted_option, v.voted_at,
             COUNT(DISTINCT v2.id) as total_votes,
             CASE 
                WHEN p.end_date > CURRENT_TIMESTAMP AND p.is_active = TRUE THEN 'active'
                WHEN p.end_date <= CURRENT_TIMESTAMP AND p.is_active = TRUE THEN 'expired'
                ELSE 'deleted'
             END as poll_status,
             u.username as creator_name
             FROM votes v
             JOIN polls p ON v.poll_id = p.id
             JOIN options o ON v.option_id = o.id
             JOIN users u ON p.created_by = u.id
             LEFT JOIN votes v2 ON p.id = v2.poll_id
             WHERE v.user_id = $1
             GROUP BY p.id, p.title, p.description, p.created_at, p.end_date, p.is_active, p.vote_threshold, p.is_approved, 
                      o.option_text, v.voted_at, u.username, v.id
             ORDER BY v.voted_at DESC
             LIMIT $2 OFFSET $3`,
            [userId, perPage, offset]
        );

        res.render('profile/index', {
            user: req.session.user,
            userPolls,
            votedPolls,
            currentPage: page,
            totalPages,
            totalVotedPolls,
            hasNextPage,
            hasPrevPage,
            perPage,
            showingCount: votedPolls.length
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
        const user = await db.get('SELECT password FROM users WHERE id = $1', [userId]);

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
        
        await db.run('UPDATE users SET password = $1 WHERE id = $2', [hashedNew, userId]);

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