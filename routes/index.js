const express = require('express');
const router = express.Router();
const db = require('../models/database');

router.get('/', async (req, res) => {
    try {
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

router.get('/about', (req, res) => {
    res.render('about', { user: req.session.user || null });
});

module.exports = router;