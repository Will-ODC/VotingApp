/**
 * Poll Routes
 * 
 * This module handles all poll-related functionality:
 * - Creating new polls
 * - Viewing polls and results
 * - Voting on polls
 * - Managing polls (admin only)
 * 
 * Polls have an expiration date and track voting history
 */

const express = require('express');
const router = express.Router();
const { db } = require('../models/database');
const { PollFactory, PollTypes } = require('../models/polls');
const PollService = require('../src/services/PollService');
const PollRepository = require('../src/repositories/PollRepository');
const VoteRepository = require('../src/repositories/VoteRepository');
const { validateRequest, sanitizeRequest } = require('../src/middleware/validation');
const { pollSchemas } = require('../src/validators/schemas');

// Initialize dependencies
const pollRepository = new PollRepository(db);
const voteRepository = new VoteRepository(db);
const pollService = new PollService(pollRepository, voteRepository);

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
 * Middleware to require admin privileges
 * Returns 403 error if user is not an admin
 */
function requireAdmin(req, res, next) {
    if (!req.session.user || !req.session.user.is_admin) {
        return res.status(403).render('error', { message: 'Admin access required' });
    }
    next();
}

/**
 * GET /polls/create
 * Display poll creation form (requires authentication)
 */
router.get('/create', requireAuth, (req, res) => {
    res.render('polls/create', { user: req.session.user });
});

/**
 * POST /polls/create
 * Process poll creation form
 * Now uses PollService and validation middleware
 */
router.post('/create', 
    requireAuth,
    sanitizeRequest,
    validateRequest(pollSchemas.create),
    async (req, res) => {
        const userId = req.session.user.id;
        
        try {
            // Delegate to service layer
            const poll = await pollService.createPoll(userId, req.body);
            
            // Redirect to the newly created poll
            res.redirect(`/polls/${poll.id}`);
        } catch (error) {
            console.error('Error creating poll:', error);
            req.flash('error', error.message);
            res.redirect('/polls/create');
        }
    }
);

/**
 * GET /polls/all
 * Display all polls with their status (active/expired/deleted)
 * Shows vote counts and creator information
 * Supports filtering by status: ?filter=deleted|active|expired|all
 * Supports search: ?search=query
 * Requires authentication
 */
router.get('/all', requireAuth, async (req, res) => {
    try {
        const filter = req.query.filter || 'all';
        const search = req.query.search || '';
        
        // Delegate to service layer
        const allPolls = await pollService.getAllPollsWithStatus({
            filter,
            search
        });

        res.render('polls/all', {
            polls: allPolls,
            user: req.session.user,
            currentFilter: filter,
            searchQuery: search
        });
    } catch (error) {
        console.error('Error fetching all polls:', error);
        res.status(500).render('error', { message: 'Failed to load polls' });
    }
});

/**
 * GET /polls/:id
 * Display individual poll with options and results
 * Shows vote counts and percentages
 * Checks if current user has already voted
 */
router.get('/:id', async (req, res) => {
    const pollId = req.params.id;
    
    try {
        // Delegate to service layer
        const displayData = await pollService.getPollForDisplay(
            pollId, 
            req.session.user?.id
        );
        
        if (!displayData) {
            return res.status(404).render('error', { message: 'Poll not found' });
        }

        res.render('polls/view', {
            poll: displayData.poll,
            options: displayData.options,
            hasVoted: displayData.hasVoted,
            userVote: displayData.userVote,
            canChangeVote: displayData.canChangeVote,
            totalVotes: displayData.results.totalVotes,
            results: displayData.results,
            votingInterface: displayData.votingInterface,
            user: req.session.user || null
        });
    } catch (error) {
        console.error('Error fetching poll:', error);
        res.status(500).render('error', { message: 'Failed to load poll' });
    }
});

/**
 * POST /polls/:id/vote
 * Submit or change a vote for a poll option
 * - Allows vote changes until poll expires
 * - Records user's vote choice
 * - Requires authentication
 */
router.post('/:id/vote', requireAuth, async (req, res) => {
    const pollId = req.params.id;
    const { optionId } = req.body;
    const userId = req.session.user.id;

    try {
        // Delegate to service layer
        await pollService.submitVote(userId, pollId, optionId);

        // Redirect back to poll to see updated results
        res.redirect(`/polls/${pollId}`);
    } catch (error) {
        console.error('Error voting:', error);
        req.flash('error', error.message);
        res.redirect(`/polls/${pollId}`);
    }
});

/**
 * GET /polls/:id/delete
 * Soft delete a poll (admin only)
 * Sets is_active flag to 0 rather than removing from database
 * Preserves voting history and data integrity
 */
router.get('/:id/delete', requireAdmin, async (req, res) => {
    const pollId = req.params.id;
    
    try {
        // Delegate to service layer
        await pollService.deletePoll(pollId, req.session.user.id);
        
        res.redirect('/');
    } catch (error) {
        console.error('Error deleting poll:', error);
        res.status(500).render('error', { message: 'Failed to delete poll' });
    }
});

// Export the router for use in main app
module.exports = router;