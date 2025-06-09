/**
 * Index Routes
 * 
 * This module handles the main pages of the application:
 * - Home page with active polls listing
 * - About page with application information
 */

const express = require('express');
const router = express.Router();
const db = require('../models/database');

/**
 * GET /
 * Home page - displays polls sorted by popularity and activity
 * Supports sorting: ?sort=popular|recent|active
 * Supports search: ?search=query
 * Default shows most popular polls (by vote count)
 * Only shows polls that are:
 * - Active (not deleted)
 * - Not expired (closes_at is in the future)
 * Includes vote count for each poll
 */
router.get('/', async (req, res) => {
    try {
        const sort = req.query.sort || 'popular';
        const search = req.query.search || '';
        
        // Build search condition
        let searchCondition = '';
        let queryParams = [];
        if (search.trim()) {
            searchCondition = `AND (p.title LIKE ? OR p.description LIKE ?)`;
            const searchPattern = `%${search.trim()}%`;
            queryParams = [searchPattern, searchPattern];
        }
        
        // Determine order clause based on sort parameter
        let orderClause = 'ORDER BY vote_count DESC, p.created_at DESC'; // Default: popular
        if (sort === 'recent') {
            orderClause = 'ORDER BY p.created_at DESC';
        } else if (sort === 'active') {
            // Sort by activity (recent votes + creation time)
            orderClause = 'ORDER BY last_vote_time DESC, p.created_at DESC';
        }

        // Fetch active polls with vote counts, search, and sorting
        const polls = await new Promise((resolve, reject) => {
            db.all(`
                SELECT p.*, 
                       COUNT(DISTINCT v.id) as vote_count,
                       MAX(v.voted_at) as last_vote_time
                FROM polls p
                LEFT JOIN votes v ON p.id = v.poll_id
                WHERE p.is_active = 1 AND datetime(p.closes_at) > datetime('now')
                ${searchCondition}
                GROUP BY p.id
                ${orderClause}
                LIMIT 10
            `, queryParams, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        res.render('index', {
            polls,
            user: req.session.user || null,
            currentSort: sort,
            searchQuery: search
        });
    } catch (error) {
        console.error('Error fetching polls:', error);
        res.status(500).render('error', { message: 'Failed to load polls' });
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