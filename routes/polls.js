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
    const { title, description, options, end_date, vote_threshold, category } = req.body;
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
        
        console.log('Creating poll with end_date:', closesAt, 'threshold:', threshold);
        
        // Insert poll into database with threshold and category
        const result = await db.run(
            `INSERT INTO polls (title, description, created_by, end_date, vote_threshold, category) 
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
            [title, description, userId, closesAt, threshold, category || 'general']
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
            `SELECT p.id, p.title, p.description, p.created_at, p.end_date, p.is_active, p.vote_threshold, p.is_approved, p.category,
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
             GROUP BY p.id, p.title, p.description, p.created_at, p.end_date, p.is_active, p.vote_threshold, p.is_approved, p.category, u.username
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
        // Fetch poll details with creator information and approval status
        const poll = await db.get(
            `SELECT p.id, p.title, p.description, p.created_at, p.end_date, p.is_active, p.vote_threshold, p.is_approved, p.category,
             u.username as creator_name, COUNT(DISTINCT v.id) as current_vote_count
             FROM polls p 
             JOIN users u ON p.created_by = u.id 
             LEFT JOIN votes v ON p.id = v.poll_id
             WHERE p.id = $1
             GROUP BY p.id, p.title, p.description, p.created_at, p.end_date, p.is_active, p.vote_threshold, p.is_approved, p.category, u.username`,
            [pollId]
        );

        if (!poll) {
            return res.status(404).render('error', { message: 'Poll not found' });
        }

        // Fetch poll options with vote counts
        const options = await db.all(
            `SELECT o.id, o.poll_id, o.option_text, o.created_at, COUNT(v.id) as vote_count
             FROM options o
             LEFT JOIN votes v ON o.id = v.option_id
             WHERE o.poll_id = $1
             GROUP BY o.id, o.poll_id, o.option_text, o.created_at`,
            [pollId]
        );

        // Check if current user has already voted and get their vote details
        let hasVoted = false;
        let userVote = null;
        let canChangeVote = false;
        
        if (req.session.user) {
            const vote = await db.get(
                'SELECT option_id, voted_at FROM votes WHERE poll_id = $1 AND user_id = $2',
                [pollId, req.session.user.id]
            );
            hasVoted = !!vote;
            userVote = vote;
            
            // User can change vote if poll is active and not expired
            canChangeVote = hasVoted && poll.is_active && new Date(poll.end_date) > new Date();
        }

        // Calculate total votes for percentage display
        const totalVotes = options.reduce((sum, opt) => sum + parseInt(opt.vote_count), 0);

        res.render('polls/view', {
            poll,
            options,
            hasVoted,
            userVote,
            canChangeVote,
            totalVotes,
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
        // Check if poll is still active
        const poll = await db.get('SELECT * FROM polls WHERE id = $1 AND is_active = TRUE', [pollId]);

        if (!poll) {
            return res.status(400).json({ error: 'Poll not found or inactive' });
        }

        // Check if poll has expired
        if (new Date(poll.end_date) <= new Date()) {
            return res.status(400).json({ error: 'This poll has expired and no longer accepts votes' });
        }

        // Check if user has already voted in this poll
        const existingVote = await db.get('SELECT id, option_id FROM votes WHERE poll_id = $1 AND user_id = $2', [pollId, userId]);

        if (existingVote) {
            // User has voted before - update their vote
            await db.run(
                'UPDATE votes SET option_id = $1, voted_at = CURRENT_TIMESTAMP WHERE poll_id = $2 AND user_id = $3',
                [optionId, pollId, userId]
            );
        } else {
            // First time voting - insert new vote
            await db.run(
                'INSERT INTO votes (poll_id, option_id, user_id) VALUES ($1, $2, $3)',
                [pollId, optionId, userId]
            );
        }

        // Check if poll now meets its approval threshold
        await db.checkPollThreshold(pollId);

        // Redirect back to poll to see updated results
        res.redirect(`/polls/${pollId}`);
    } catch (error) {
        console.error('Error voting:', error);
        res.status(500).json({ error: 'Failed to submit vote' });
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