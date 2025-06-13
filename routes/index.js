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
    console.log('🏠 HOME PAGE REQUEST');
    console.log('🔑 Session ID:', req.sessionID);
    console.log('👤 Session user:', req.session.user);
    console.log('📋 Session data:', req.session);
    
    try {
        const sort = req.query.sort || 'popular';
        const search = req.query.search || '';
        const category = req.query.category || '';
        
        // Build search and filter conditions
        let conditions = [];
        let queryParams = [];
        let paramIndex = 1;
        
        if (search.trim()) {
            conditions.push(`(p.title LIKE $${paramIndex++} OR p.description LIKE $${paramIndex++})`);
            const searchPattern = `%${search.trim()}%`;
            queryParams.push(searchPattern, searchPattern);
        }
        
        if (category.trim()) {
            conditions.push(`p.category = $${paramIndex++}`);
            queryParams.push(category.trim());
        }
        
        const searchCondition = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';
        
        // Determine order clause based on sort parameter
        let orderClause = 'ORDER BY vote_count DESC, p.created_at DESC'; // Default: popular
        if (sort === 'recent') {
            orderClause = 'ORDER BY p.created_at DESC';
        } else if (sort === 'active') {
            // Sort by activity (recent votes + creation time)
            orderClause = 'ORDER BY last_vote_time DESC, p.created_at DESC';
        }

        // Fetch active polls with vote counts, search, and sorting
        // Fixed PostgreSQL GROUP BY with all non-aggregated columns
        const polls = await db.all(`
            SELECT p.*, 
                   COUNT(DISTINCT v.id) as vote_count,
                   MAX(v.voted_at) as last_vote_time
            FROM polls p
            LEFT JOIN votes v ON p.id = v.poll_id
            WHERE p.is_active = TRUE AND (p.end_date IS NULL OR p.end_date > CURRENT_TIMESTAMP)
            ${searchCondition}
            GROUP BY p.id, p.title, p.description, p.created_by, p.created_at, p.end_date, p.is_active, p.is_deleted, p.vote_threshold, p.is_approved, p.approved_at, p.category, p.poll_type
            ${orderClause}
            LIMIT 10
        `, queryParams);

        res.render('index', {
            polls,
            user: req.session.user || null,
            currentSort: sort,
            searchQuery: search,
            currentCategory: category
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