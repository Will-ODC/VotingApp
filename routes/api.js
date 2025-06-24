/**
 * API Routes
 * 
 * This module handles API endpoints that return JSON responses
 * for AJAX/dynamic frontend interactions
 */

const express = require('express');
const router = express.Router();
const { db } = require('../models/database');
const HomeService = require('../src/services/HomeService');
const PollService = require('../src/services/PollService');
const PollRepository = require('../src/repositories/PollRepository');
const VoteRepository = require('../src/repositories/VoteRepository');

// Initialize dependencies
const pollRepository = new PollRepository(db);
const voteRepository = new VoteRepository(db);
const pollService = new PollService(pollRepository, voteRepository);
const homeService = new HomeService(pollRepository, null); // SearchService not needed for these endpoints

/**
 * GET /api/action-initiatives/active
 * Returns active action initiatives with vote counts and user vote status
 * Used for dynamic frontend displays (carousel, inline voting)
 */
router.get('/action-initiatives/active', async (req, res) => {
    try {
        console.log('API: /action-initiatives/active called');
        const userId = req.session.user?.id || null;
        console.log('User ID:', userId);
        
        // First, let's try a simpler query to see if it works
        let initiatives = [];
        try {
            // Try with action initiative columns
            const query = `
                SELECT 
                    p.*,
                    u.username as creator_username,
                    COALESCE(vote_counts.total_votes, 0) as vote_count
                FROM polls p
                INNER JOIN users u ON p.created_by = u.id
                LEFT JOIN (
                    SELECT 
                        o.poll_id, 
                        COUNT(v.id) as total_votes
                    FROM options o
                    LEFT JOIN votes v ON o.id = v.option_id
                    GROUP BY o.poll_id
                ) vote_counts ON p.id = vote_counts.poll_id
                WHERE p.is_action_initiative = TRUE 
                    AND p.is_active = TRUE 
                    AND (p.end_date IS NULL OR p.end_date > CURRENT_TIMESTAMP)
                    AND p.action_status IN ('pending', 'stage2_voting')
                ORDER BY vote_counts.total_votes DESC, p.created_at DESC
                LIMIT 10
            `;
            initiatives = await db.all(query);
            console.log('Found initiatives:', initiatives.length);
        } catch (err) {
            // If action initiative columns don't exist, try fallback query
            console.error('Action initiative query failed:', err.message);
            console.error('Full error:', err);
            // Try simpler query for active polls
            const fallbackQuery = `
                SELECT 
                    p.*,
                    u.username as creator_username,
                    COALESCE(vote_counts.total_votes, 0) as vote_count
                FROM polls p
                INNER JOIN users u ON p.created_by = u.id
                LEFT JOIN (
                    SELECT 
                        o.poll_id, 
                        COUNT(v.id) as total_votes
                    FROM options o
                    LEFT JOIN votes v ON o.id = v.option_id
                    GROUP BY o.poll_id
                ) vote_counts ON p.id = vote_counts.poll_id
                WHERE p.is_active = TRUE 
                    AND (p.end_date IS NULL OR p.end_date > CURRENT_TIMESTAMP)
                ORDER BY vote_counts.total_votes DESC, p.created_at DESC
                LIMIT 5
            `;
            initiatives = await db.all(fallbackQuery);
        }
        
        // For each initiative, get options and user vote status
        const initiativesWithDetails = await Promise.all(
            initiatives.map(async (initiative) => {
                // Get poll options with vote counts
                const options = await db.all(`
                    SELECT 
                        o.id,
                        o.poll_id,
                        o.option_text,
                        o.created_at,
                        COUNT(v.id) as vote_count
                    FROM options o
                    LEFT JOIN votes v ON o.id = v.option_id
                    WHERE o.poll_id = $1
                    GROUP BY o.id, o.poll_id, o.option_text, o.created_at
                    ORDER BY o.id
                `, [initiative.id]);
                
                // Calculate percentages
                const totalVotes = initiative.vote_count;
                const optionsWithPercentages = options.map(option => ({
                    ...option,
                    percentage: totalVotes > 0 ? ((option.vote_count / totalVotes) * 100).toFixed(1) : 0
                }));
                
                // Get user's vote if logged in
                let userVote = null;
                if (userId) {
                    userVote = await db.get(`
                        SELECT v.*, o.option_text 
                        FROM votes v
                        JOIN options o ON v.option_id = o.id
                        WHERE v.user_id = $1 AND v.poll_id = $2
                    `, [userId, initiative.id]);
                }
                
                // Check if in stage 2 and get stage 2 vote if applicable
                let stage2Vote = null;
                if (initiative.action_status === 'stage2_voting' && userId) {
                    try {
                        stage2Vote = await db.get(`
                            SELECT * FROM stage2_votes
                            WHERE user_id = $1 AND poll_id = $2
                        `, [userId, initiative.id]);
                    } catch (e) {
                        // Table might not exist yet, ignore error
                    }
                }
                
                return {
                    id: initiative.id,
                    title: initiative.title,
                    description: initiative.description,
                    category: initiative.category,
                    creatorUsername: initiative.creator_username,
                    voteCount: initiative.vote_count,
                    voteThreshold: initiative.vote_threshold,
                    endDate: initiative.end_date,
                    actionPlan: initiative.action_plan,
                    actionDeadline: initiative.action_deadline,
                    actionStatus: initiative.action_status,
                    stage2Deadline: initiative.stage2_deadline,
                    options: optionsWithPercentages,
                    userVote: userVote ? {
                        optionId: userVote.option_id,
                        optionText: userVote.option_text,
                        votedAt: userVote.voted_at
                    } : null,
                    stage2Vote: stage2Vote ? {
                        approval: stage2Vote.approval,
                        votedAt: stage2Vote.voted_at
                    } : null,
                    hasVoted: !!userVote,
                    hasVotedStage2: !!stage2Vote,
                    isAuthenticated: !!userId
                };
            })
        );
        
        res.json({
            success: true,
            initiatives: initiativesWithDetails,
            user: req.session.user ? {
                id: req.session.user.id,
                username: req.session.user.username
            } : null,
            message: initiativesWithDetails.length === 0 ? 'No active action initiatives found' : undefined
        });
        
    } catch (error) {
        console.error('Error fetching action initiatives:', error);
        console.error('Stack trace:', error.stack);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch action initiatives',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * GET /api/polls/:id
 * Returns poll data with options and user vote status
 * Used for dynamic poll displays
 */
router.get('/polls/:id', async (req, res) => {
    const pollId = req.params.id;
    const userId = req.session.user?.id || null;
    
    try {
        const displayData = await pollService.getPollForDisplay(pollId, userId);
        
        if (!displayData) {
            return res.status(404).json({
                success: false,
                error: 'Poll not found'
            });
        }
        
        res.json({
            success: true,
            poll: {
                id: displayData.poll.id,
                title: displayData.poll.title,
                description: displayData.poll.description,
                category: displayData.poll.category,
                creatorUsername: displayData.poll.creator_username,
                voteCount: displayData.results.totalVotes,
                voteThreshold: displayData.poll.vote_threshold,
                endDate: displayData.poll.end_date,
                isActionInitiative: displayData.poll.is_action_initiative,
                actionPlan: displayData.poll.action_plan,
                actionDeadline: displayData.poll.action_deadline,
                actionStatus: displayData.poll.action_status,
                stage2Deadline: displayData.poll.stage2_deadline,
                options: displayData.options.map(opt => ({
                    id: opt.id,
                    text: opt.option_text,
                    voteCount: opt.vote_count || 0,
                    percentage: displayData.results.options.find(r => r.id === opt.id)?.percentage || 0
                })),
                userVote: displayData.userVote,
                hasVoted: displayData.hasVoted,
                isAuthenticated: !!userId
            }
        });
        
    } catch (error) {
        console.error('Error fetching poll:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch poll',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;