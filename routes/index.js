/**
 * Index Routes
 * 
 * This module handles the main pages of the application:
 * - Home page with active polls listing
 * - About page with application information
 * 
 * Refactored to follow clean architecture pattern with service layer
 */

const express = require('express');
const router = express.Router();
const { db } = require('../models/database');
const HomeService = require('../src/services/HomeService');
const SearchService = require('../src/services/SearchService');
const PollRepository = require('../src/repositories/PollRepository');

// Initialize dependencies
const pollRepository = new PollRepository(db);
const searchService = new SearchService(pollRepository);
const homeService = new HomeService(pollRepository, searchService);

/**
 * GET /
 * Home page - redirects to /polls
 * This is a permanent redirect (301) to the polls listing page
 * Preserves any session messages that might be set
 */
router.get('/', (req, res) => {
    // Perform a permanent redirect to /polls
    // This will preserve session messages and any query parameters
    res.redirect(301, '/polls');
});


/**
 * GET /api/search/suggestions
 * API endpoint for search suggestions (for autocomplete)
 */
router.get('/api/search/suggestions', async (req, res) => {
    try {
        const query = req.query.q || '';
        const limit = parseInt(req.query.limit) || 5;
        
        if (query.length < 2) {
            return res.json([]);
        }
        
        const suggestions = await searchService.getSearchSuggestions(query, limit);
        res.json(suggestions);
    } catch (error) {
        console.error('Error fetching search suggestions:', error);
        res.status(500).json({ error: 'Failed to fetch suggestions' });
    }
});

/**
 * GET /polls
 * Display all polls in a Reddit-style single column layout
 * Supports infinite scroll and shows all poll types
 * Includes placeholders for images/URLs
 */
router.get('/polls', async (req, res) => {
    try {
        // Get initial set of polls (first page)
        const limit = 20;
        const offset = 0;
        
        // Fetch polls with vote counts and creator info
        const pollsQuery = `
            SELECT 
                p.*,
                u.username as creator_name,
                COUNT(DISTINCT v.id) as vote_count,
                CASE 
                    WHEN p.is_active = false THEN 'deleted'
                    WHEN p.end_date < NOW() THEN 'expired'
                    ELSE 'active'
                END as status
            FROM polls p
            JOIN users u ON p.created_by = u.id
            LEFT JOIN votes v ON p.id = v.poll_id
            WHERE p.is_active = true
            GROUP BY p.id, u.username
            ORDER BY p.created_at DESC
            LIMIT $1 OFFSET $2
        `;
        
        const polls = await db.all(pollsQuery, [limit, offset]);
        
        // Get total count for pagination
        const countQuery = `
            SELECT COUNT(*) as total 
            FROM polls 
            WHERE is_active = true
        `;
        const { total } = await db.get(countQuery);
        
        res.render('all-polls', {
            polls,
            user: req.session.user || null,
            hasMore: total > limit,
            nextOffset: offset + limit
        });
    } catch (error) {
        console.error('Error fetching all polls:', error);
        res.status(500).render('error', { message: 'Failed to load polls' });
    }
});

/**
 * GET /action-initiatives
 * Display all action initiatives in a carousel format
 * Shows only active action initiatives with voting capability
 */
router.get('/action-initiatives', async (req, res) => {
    try {
        // Get the user ID for tracking voting status
        const userId = req.session.user?.id || null;
        
        res.render('action-initiatives', { 
            user: req.session.user || null,
            formatDatePST: (date) => {
                if (!date) return '';
                const d = new Date(date);
                return d.toLocaleDateString('en-US', {
                    timeZone: 'America/Los_Angeles',
                    year: 'numeric',
                    month: 'numeric',
                    day: 'numeric'
                });
            }
        });
    } catch (error) {
        console.error('Error loading action initiatives page:', error);
        res.status(500).render('error', { message: 'Failed to load action initiatives' });
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