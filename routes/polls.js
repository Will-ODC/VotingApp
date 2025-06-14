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
 * - Creates poll with title, description, and expiration date
 * - Adds initial poll options
 * - Redirects to poll view page
 */
router.post('/create', requireAuth, async (req, res) => {
    const { title, description, options, end_date, vote_threshold, category, poll_type } = req.body;
    const userId = req.session.user.id;

    try {
        // Create the poll with expiration date and threshold
        let closesAt;
        if (end_date) {
            // Convert datetime-local format to ISO string
            closesAt = new Date(end_date).toISOString();
        } else {
            // Default to 30 days from now if no date specified
            closesAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        }
        
        // Parse vote threshold (null if not provided or invalid)
        const threshold = vote_threshold && parseInt(vote_threshold) > 0 ? parseInt(vote_threshold) : null;
        
        // Validate poll type
        const pollType = poll_type || 'simple';
        if (!PollTypes.isTypeAvailable(pollType)) {
            return res.status(400).render('error', { message: 'Invalid poll type selected' });
        }
        
        // Insert poll into database with threshold, category, and type
        const result = await db.run(
            `INSERT INTO polls (title, description, created_by, end_date, vote_threshold, category, poll_type) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
            [title, description, userId, closesAt, threshold, category || 'general', pollType]
        );
        const pollId = result.id;

        // Add poll options if provided
        if (options && Array.isArray(options)) {
            for (const option of options) {
                if (option.trim()) {
                    // Insert each option with auto-approval
                    await db.run(
                        'INSERT INTO options (poll_id, option_text) VALUES ($1, $2)',
                        [pollId, option.trim()]
                    );
                }
            }
        }

        // Redirect to the newly created poll
        res.redirect(`/polls/${pollId}`);
    } catch (error) {
        console.error('Error creating poll:', error);
        res.status(500).render('error', { message: 'Failed to create poll' });
    }
});

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
        
        // Build WHERE clause based on filter
        let whereConditions = [];
        if (filter === 'deleted') {
            whereConditions.push('p.is_active = FALSE');
        } else if (filter === 'active') {
            whereConditions.push('p.is_active = TRUE AND p.end_date > CURRENT_TIMESTAMP');
        } else if (filter === 'expired') {
            whereConditions.push('p.is_active = TRUE AND p.end_date <= CURRENT_TIMESTAMP');
        }
        // 'all' filter shows everything (no filter condition)

        // Add search condition if search query exists
        let queryParams = [];
        if (search.trim()) {
            const searchPattern = `%${search.trim()}%`;
            queryParams = [searchPattern, searchPattern];
            // Build numbered placeholders dynamically
            let paramIndex = 1;
            whereConditions.push(`(p.title LIKE $${paramIndex++} OR p.description LIKE $${paramIndex++})`);
        }

        // Build final WHERE clause
        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        // Determine sort order - active polls show expiring soonest first
        let orderClause = 'ORDER BY p.created_at DESC'; // Default for all/expired/deleted
        if (filter === 'active') {
            orderClause = 'ORDER BY p.end_date ASC'; // Expiring soonest first for active polls
        }

        // Fetch polls with status calculation, filtering, and search
        const allPolls = await db.all(
            `SELECT p.id, p.title, p.description, p.created_at, p.end_date, p.is_active, p.vote_threshold, p.is_approved, p.category, p.poll_type,
             u.username as creator_name, COUNT(DISTINCT v.id) as vote_count,
             CASE 
                WHEN p.end_date > CURRENT_TIMESTAMP AND p.is_active = TRUE THEN 'active'
                WHEN p.end_date <= CURRENT_TIMESTAMP AND p.is_active = TRUE THEN 'expired'
                ELSE 'deleted'
             END as status
             FROM polls p 
             JOIN users u ON p.created_by = u.id 
             LEFT JOIN votes v ON p.id = v.poll_id
             ${whereClause}
             GROUP BY p.id, p.title, p.description, p.created_at, p.end_date, p.is_active, p.vote_threshold, p.is_approved, p.category, p.poll_type, u.username
             ${orderClause}`,
            queryParams
        );

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
        // Fetch poll using factory
        const poll = await PollFactory.getPollById(db, pollId);
        
        if (!poll) {
            return res.status(404).render('error', { message: 'Poll not found' });
        }

        // Get poll creator info
        const creator = await db.get(
            'SELECT username FROM users WHERE id = $1',
            [poll.createdBy]
        );

        // Get display data from poll class
        const displayData = await poll.getDisplayData(db, req.session.user?.id);
        
        // Add creator name to poll data
        displayData.poll.creator_name = creator.username;

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
        // Fetch poll using factory
        const poll = await PollFactory.getPollById(db, pollId);
        
        if (!poll) {
            return res.status(400).json({ error: 'Poll not found' });
        }

        // Prepare vote data (structure depends on poll type)
        const voteData = { optionId };
        
        // Validate and record vote using poll class methods
        const validation = poll.validateVote(userId, voteData);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }
        
        await poll.recordVote(db, userId, voteData);

        // Redirect back to poll to see updated results
        res.redirect(`/polls/${pollId}`);
    } catch (error) {
        console.error('Error voting:', error);
        res.status(500).json({ error: error.message || 'Failed to submit vote' });
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
        // Soft delete by setting is_active to 0
        await db.run('UPDATE polls SET is_active = FALSE WHERE id = $1', [pollId]);
        
        res.redirect('/');
    } catch (error) {
        console.error('Error deleting poll:', error);
        res.status(500).render('error', { message: 'Failed to delete poll' });
    }
});

// Export the router for use in main app
module.exports = router;