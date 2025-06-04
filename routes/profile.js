const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../models/database');

function requireAuth(req, res, next) {
    if (!req.session.user) {
        return res.redirect('/auth/login');
    }
    next();
}

router.get('/', requireAuth, async (req, res) => {
    const userId = req.session.user.id;
    
    try {
        const userPolls = await new Promise((resolve, reject) => {
            db.all(
                `SELECT p.*, COUNT(DISTINCT v.id) as vote_count
                 FROM polls p
                 LEFT JOIN votes v ON p.id = v.poll_id
                 WHERE p.created_by = ?
                 GROUP BY p.id
                 ORDER BY p.created_at DESC`,
                [userId],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });

        const votedPolls = await new Promise((resolve, reject) => {
            db.all(
                `SELECT p.*, o.option_text as voted_option
                 FROM votes v
                 JOIN polls p ON v.poll_id = p.id
                 JOIN options o ON v.option_id = o.id
                 WHERE v.user_id = ?
                 ORDER BY v.voted_at DESC`,
                [userId],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });

        res.render('profile/index', {
            user: req.session.user,
            userPolls,
            votedPolls
        });
    } catch (error) {
        console.error('Error loading profile:', error);
        res.status(500).render('error', { message: 'Failed to load profile' });
    }
});

router.get('/change-password', requireAuth, (req, res) => {
    res.render('profile/change-password', { 
        user: req.session.user,
        error: null,
        success: null
    });
});

router.post('/change-password', requireAuth, async (req, res) => {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const userId = req.session.user.id;

    if (newPassword !== confirmPassword) {
        return res.render('profile/change-password', {
            user: req.session.user,
            error: 'New passwords do not match',
            success: null
        });
    }

    if (newPassword.length < 6) {
        return res.render('profile/change-password', {
            user: req.session.user,
            error: 'Password must be at least 6 characters',
            success: null
        });
    }

    try {
        const user = await new Promise((resolve, reject) => {
            db.get(
                'SELECT password FROM users WHERE id = ?',
                [userId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });

        const hashedCurrent = crypto.createHash('sha256').update(currentPassword).digest('hex');
        
        if (user.password !== hashedCurrent) {
            return res.render('profile/change-password', {
                user: req.session.user,
                error: 'Current password is incorrect',
                success: null
            });
        }

        const hashedNew = crypto.createHash('sha256').update(newPassword).digest('hex');
        
        await new Promise((resolve, reject) => {
            db.run(
                'UPDATE users SET password = ? WHERE id = ?',
                [hashedNew, userId],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });

        res.render('profile/change-password', {
            user: req.session.user,
            error: null,
            success: 'Password changed successfully'
        });
    } catch (error) {
        console.error('Error changing password:', error);
        res.render('profile/change-password', {
            user: req.session.user,
            error: 'An error occurred while changing password',
            success: null
        });
    }
});

module.exports = router;