/**
 * Profile Routes - Refactored with Clean Architecture
 * 
 * This module handles user profile functionality:
 * - View user's created polls and voting history
 * - Change password functionality
 * - Personal statistics and activity
 * 
 * Now uses ProfileService and validation middleware for better separation of concerns
 */

const express = require('express');
const router = express.Router();
const { db } = require('../models/database');
const ProfileService = require('../src/services/ProfileService');
const UserService = require('../src/services/UserService');
const UserRepository = require('../src/repositories/UserRepository');
const PollRepository = require('../src/repositories/PollRepository');
const VoteRepository = require('../src/repositories/VoteRepository');
const { validateRequest, sanitizeRequest } = require('../src/middleware/validation');
const { userSchemas } = require('../src/validators/schemas');

// Initialize dependencies
const userRepository = new UserRepository(db);
const pollRepository = new PollRepository(db);
const voteRepository = new VoteRepository(db);
const userService = new UserService(userRepository);
const profileService = new ProfileService(userRepository, pollRepository, voteRepository);

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
 * - Polls the user has voted in (with pagination)
 * - Vote counts for user's polls
 * Supports ?page=1,2,3... for participation results (10 per page)
 * Now uses ProfileService for business logic
 */
router.get('/', requireAuth, async (req, res) => {
    const userId = req.session.user.id;
    const page = parseInt(req.query.page) || 1;
    
    try {
        // Get profile dashboard data
        const dashboardData = await profileService.getProfileDashboard(userId);
        
        // Get paginated voting history
        const votingHistory = await profileService.getVotingHistory(userId, page);
        
        res.render('profile/index', {
            user: req.session.user,
            userPolls: dashboardData.userPolls,
            votedPolls: votingHistory.votedPolls,
            currentPage: votingHistory.pagination.currentPage,
            totalPages: votingHistory.pagination.totalPages,
            totalVotedPolls: votingHistory.pagination.totalVotedPolls,
            hasNextPage: votingHistory.pagination.hasNextPage,
            hasPrevPage: votingHistory.pagination.hasPrevPage,
            perPage: votingHistory.pagination.perPage,
            showingCount: votingHistory.pagination.showingCount
        });
    } catch (error) {
        console.error('Error loading profile:', error);
        req.flash('error', 'Failed to load profile');
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
        error: req.flash('error')[0] || null,
        success: req.flash('success')[0] || null
    });
});

/**
 * POST /profile/change-password
 * Process password change request
 * Now uses ProfileService and UserService with validation middleware
 */
router.post('/change-password', 
    requireAuth,
    sanitizeRequest,
    (req, res, next) => {
        // Add confirm password validation middleware
        if (req.body.newPassword !== req.body.confirmPassword) {
            req.flash('error', 'New passwords do not match');
            return res.redirect('/profile/change-password');
        }
        next();
    },
    validateRequest(userSchemas.changePassword),
    async (req, res) => {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        const userId = req.session.user.id;

        try {
            // Delegate change password to ProfileService which uses UserService
            await profileService.changePassword(userService, userId, currentPassword, newPassword, confirmPassword);
            
            req.flash('success', 'Password changed successfully');
            res.redirect('/profile/change-password');
        } catch (error) {
            console.error('Error changing password:', error);
            req.flash('error', error.message);
            res.redirect('/profile/change-password');
        }
    }
);

// Export the router for use in main app
module.exports = router;