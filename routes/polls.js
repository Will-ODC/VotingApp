const express = require('express');
const router = express.Router();
const db = require('../models/database');

function requireAuth(req, res, next) {
    if (!req.session.user) {
        return res.redirect('/auth/login');
    }
    next();
}

function requireAdmin(req, res, next) {
    if (!req.session.user || !req.session.user.is_admin) {
        return res.status(403).render('error', { message: 'Admin access required' });
    }
    next();
}

router.get('/create', requireAuth, (req, res) => {
    res.render('polls/create', { user: req.session.user });
});

router.post('/create', requireAuth, async (req, res) => {
    const { title, description, options, end_date } = req.body;
    const userId = req.session.user.id;

    try {
        const pollId = await new Promise((resolve, reject) => {
            let closesAt;
            if (end_date) {
                // Convert datetime-local format to ISO string
                closesAt = new Date(end_date).toISOString();
            } else {
                // Default to 30 days from now
                closesAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
            }
            
            console.log('Creating poll with closes_at:', closesAt);
            
            db.run(
                `INSERT INTO polls (title, description, created_by, closes_at) 
                 VALUES (?, ?, ?, ?)`,
                [title, description, userId, closesAt],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });

        if (options && Array.isArray(options)) {
            for (const option of options) {
                if (option.trim()) {
                    await new Promise((resolve, reject) => {
                        db.run(
                            'INSERT INTO options (poll_id, option_text, created_by, is_approved) VALUES (?, ?, ?, 1)',
                            [pollId, option.trim(), userId],
                            (err) => {
                                if (err) reject(err);
                                else resolve();
                            }
                        );
                    });
                }
            }
        }

        res.redirect(`/polls/${pollId}`);
    } catch (error) {
        console.error('Error creating poll:', error);
        res.status(500).render('error', { message: 'Failed to create poll' });
    }
});

router.get('/all', requireAuth, async (req, res) => {
    try {
        const allPolls = await new Promise((resolve, reject) => {
            db.all(
                `SELECT p.*, u.username as creator_name, COUNT(DISTINCT v.id) as vote_count,
                 CASE 
                    WHEN datetime(p.closes_at) > datetime('now') AND p.is_active = 1 THEN 'active'
                    WHEN datetime(p.closes_at) <= datetime('now') THEN 'expired'
                    ELSE 'deleted'
                 END as status
                 FROM polls p 
                 JOIN users u ON p.created_by = u.id 
                 LEFT JOIN votes v ON p.id = v.poll_id
                 GROUP BY p.id
                 ORDER BY p.created_at DESC`,
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });

        res.render('polls/all', {
            polls: allPolls,
            user: req.session.user
        });
    } catch (error) {
        console.error('Error fetching all polls:', error);
        res.status(500).render('error', { message: 'Failed to load polls' });
    }
});

router.get('/:id', async (req, res) => {
    const pollId = req.params.id;
    
    try {
        const poll = await new Promise((resolve, reject) => {
            db.get(
                `SELECT p.*, u.username as creator_name 
                 FROM polls p 
                 JOIN users u ON p.created_by = u.id 
                 WHERE p.id = ?`,
                [pollId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });

        if (!poll) {
            return res.status(404).render('error', { message: 'Poll not found' });
        }

        const options = await new Promise((resolve, reject) => {
            db.all(
                `SELECT o.*, COUNT(v.id) as vote_count
                 FROM options o
                 LEFT JOIN votes v ON o.id = v.option_id
                 WHERE o.poll_id = ?
                 GROUP BY o.id`,
                [pollId],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });

        let hasVoted = false;
        if (req.session.user) {
            const vote = await new Promise((resolve, reject) => {
                db.get(
                    'SELECT id FROM votes WHERE poll_id = ? AND user_id = ?',
                    [pollId, req.session.user.id],
                    (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    }
                );
            });
            hasVoted = !!vote;
        }

        const totalVotes = options.reduce((sum, opt) => sum + opt.vote_count, 0);

        res.render('polls/view', {
            poll,
            options,
            hasVoted,
            totalVotes,
            user: req.session.user || null
        });
    } catch (error) {
        console.error('Error fetching poll:', error);
        res.status(500).render('error', { message: 'Failed to load poll' });
    }
});

router.post('/:id/vote', requireAuth, async (req, res) => {
    const pollId = req.params.id;
    const { optionId } = req.body;
    const userId = req.session.user.id;

    try {
        const existingVote = await new Promise((resolve, reject) => {
            db.get(
                'SELECT id FROM votes WHERE poll_id = ? AND user_id = ?',
                [pollId, userId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });

        if (existingVote) {
            return res.status(400).json({ error: 'You have already voted in this poll' });
        }

        await new Promise((resolve, reject) => {
            db.run(
                'INSERT INTO votes (poll_id, option_id, user_id) VALUES (?, ?, ?)',
                [pollId, optionId, userId],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });

        res.redirect(`/polls/${pollId}`);
    } catch (error) {
        console.error('Error voting:', error);
        res.status(500).json({ error: 'Failed to submit vote' });
    }
});

router.get('/:id/delete', requireAdmin, async (req, res) => {
    const pollId = req.params.id;
    
    try {
        await new Promise((resolve, reject) => {
            db.run('UPDATE polls SET is_active = 0 WHERE id = ?', [pollId], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        
        res.redirect('/');
    } catch (error) {
        console.error('Error deleting poll:', error);
        res.status(500).render('error', { message: 'Failed to delete poll' });
    }
});

module.exports = router;