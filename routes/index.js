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
 * Home page - displays the 10 most recent active polls
 * Only shows polls that are:
 * - Active (not deleted)
 * - Not expired (closes_at is in the future)
 * Includes vote count for each poll
 */
router.get('/', async (req, res) => {
    try {
        // Fetch recent active polls with vote counts
        const polls = await new Promise((resolve, reject) => {
            db.all(`
                SELECT p.*, COUNT(DISTINCT v.id) as vote_count
                FROM polls p
                LEFT JOIN votes v ON p.id = v.poll_id
                WHERE p.is_active = 1 AND datetime(p.closes_at) > datetime('now')
                GROUP BY p.id
                ORDER BY p.created_at DESC
                LIMIT 10
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        res.render('index', {
            polls,
            user: req.session.user || null
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