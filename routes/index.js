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
 * Home page - displays polls sorted by popularity and activity
 * Supports sorting: ?sort=popular|recent|active
 * Supports search: ?search=query
 * Default shows most popular polls (by vote count)
 * Only shows polls that are:
 * - Active (not deleted)
 * - Not expired (end_date is in the future)
 * Includes vote count for each poll
 * 
 * Refactored to use HomeService for business logic
 */
router.get('/', async (req, res) => {
    try {
        // Validate and sanitize parameters
        const params = homeService.validateSearchParams(req.query);
        
        // Get polls using service layer
        const polls = await homeService.getHomepagePolls({
            sort: params.sort,
            search: params.search,
            category: params.category
        });

        // Get additional homepage data
        const [stats, categories] = await Promise.all([
            homeService.getHomepageStats(),
            homeService.getCategories()
        ]);

        res.render('index', {
            polls,
            user: req.session.user || null,
            currentSort: params.sort,
            searchQuery: params.search,
            currentCategory: params.category,
            stats,
            categories
        });
    } catch (error) {
        console.error('Error fetching homepage data:', error);
        res.status(500).render('error', { message: 'Failed to load homepage' });
    }
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
 * GET /about
 * Display the about page with application information
 */
router.get('/about', (req, res) => {
    res.render('about', { user: req.session.user || null });
});

// Export the router for use in main app
module.exports = router;