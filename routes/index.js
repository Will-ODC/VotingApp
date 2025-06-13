/**
 * Index Routes
 * 
 * This module handles the main pages of the application:
 * - Home page with active polls listing
 * - About page with application information
 */

const express = require('express');
const router = express.Router();
const { db } = require('../models/database');

/**
 * GET /
 * Home page - displays polls sorted by popularity and activity
 * Supports sorting: ?sort=popular|recent|active
 * Supports search: ?search=query
 * Default shows most popular polls (by vote count)
 * Only shows polls that are:
 * - Active (not deleted)
 * - Not expired (end_date is in the future)
 * Includes vote count for each poll
 */
router.get('/', async (req, res) => {
    try {
        // Simplified query for debugging
        const polls = await db.all(`
            SELECT p.*, 
                   COUNT(DISTINCT v.id) as vote_count
            FROM polls p
            LEFT JOIN votes v ON p.id = v.poll_id
            WHERE p.is_active = TRUE AND (p.end_date IS NULL OR p.end_date > CURRENT_TIMESTAMP)
            GROUP BY p.id, p.title, p.description, p.creator_id, p.created_at, p.end_date, p.is_active, p.vote_threshold, p.is_approved, p.approved_at
            ORDER BY vote_count DESC, p.created_at DESC
            LIMIT 10
        `);

        res.render('index', {
            polls,
            user: req.session.user || null,
            currentSort: 'popular',
            searchQuery: '',
            currentCategory: ''
        });
    } catch (error) {
        console.error('Error fetching polls:', error);
        res.status(500).render('error', { 
            message: 'Failed to load polls', 
            error: error.message,
            user: req.session.user || null 
        });
    }
});

/**
 * GET /about
 * Display the about page with application information
 */
router.get('/about', (req, res) => {
    res.render('about', { user: req.session.user || null });
});

// Export the router for use in main app
module.exports = router;