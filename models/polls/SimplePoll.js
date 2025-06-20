/**
 * Simple Poll Class
 * 
 * Implementation of a basic single-choice poll where users can select
 * one option from a list. This is the default poll type and maintains
 * backward compatibility with the existing voting system.
 */

const BasePoll = require('./BasePoll');

class SimplePoll extends BasePoll {
    /**
     * Constructor for SimplePoll
     * @param {Object} data - Poll data from database
     */
    constructor(data) {
        super(data);
    }

    /**
     * Validate a vote submission for simple polls
     * @param {number} userId - ID of the user voting
     * @param {Object} voteData - Vote data containing optionId
     * @returns {Object} { valid: boolean, error?: string }
     */
    validateVote(userId, voteData) {
        if (!userId) {
            return { valid: false, error: 'User authentication required' };
        }

        if (!voteData || !voteData.optionId) {
            return { valid: false, error: 'Option selection required' };
        }

        if (!Number.isInteger(parseInt(voteData.optionId))) {
            return { valid: false, error: 'Invalid option selected' };
        }

        if (!this.isOpen()) {
            return { valid: false, error: 'Poll is not open for voting' };
        }

        return { valid: true };
    }

    /**
     * Record a vote in the database
     * @param {Object} db - Database connection
     * @param {number} userId - ID of the user voting
     * @param {Object} voteData - Vote data containing optionId
     * @returns {Promise<boolean>} Success status
     */
    async recordVote(db, userId, voteData) {
        const validation = this.validateVote(userId, voteData);
        if (!validation.valid) {
            throw new Error(validation.error);
        }

        const optionId = parseInt(voteData.optionId);

        // Verify option belongs to this poll
        const option = await db.get(
            'SELECT id FROM options WHERE id = $1 AND poll_id = $2',
            [optionId, this.id]
        );

        if (!option) {
            throw new Error('Invalid option for this poll');
        }

        // Check for existing vote
        const existingVote = await this.getUserVote(db, userId);

        if (existingVote) {
            // Update existing vote
            await db.run(
                'UPDATE votes SET option_id = $1, voted_at = CURRENT_TIMESTAMP WHERE poll_id = $2 AND user_id = $3',
                [optionId, this.id, userId]
            );
        } else {
            // Insert new vote
            await db.run(
                'INSERT INTO votes (poll_id, option_id, user_id) VALUES ($1, $2, $3)',
                [this.id, optionId, userId]
            );
        }

        // Check if poll now meets approval threshold
        await this.checkThreshold(db);

        return true;
    }

    /**
     * Calculate and return poll results
     * @param {Object} db - Database connection
     * @returns {Promise<Object>} Results with vote counts and percentages
     */
    async calculateResults(db) {
        // Get options with vote counts
        const options = await db.all(
            `SELECT o.id, o.option_text, o.created_at, COUNT(v.id) as vote_count
             FROM options o
             LEFT JOIN votes v ON o.id = v.option_id
             WHERE o.poll_id = $1
             GROUP BY o.id, o.option_text, o.created_at
             ORDER BY o.created_at, o.id`,
            [this.id]
        );

        const totalVotes = options.reduce((sum, opt) => sum + BasePoll.normalizeVoteCount(opt.vote_count), 0);

        // Calculate percentages
        const results = options.map(option => ({
            id: option.id,
            text: option.option_text,
            voteCount: BasePoll.normalizeVoteCount(option.vote_count),
            percentage: totalVotes > 0 ? (BasePoll.normalizeVoteCount(option.vote_count) / totalVotes) * 100 : 0
        }));

        return {
            type: 'simple',
            totalVotes,
            options: results,
            winner: totalVotes > 0 ? results.reduce((a, b) => a.voteCount > b.voteCount ? a : b) : null
        };
    }

    /**
     * Get the voting interface type for this poll
     * @returns {string} 'radio' for single-choice interface
     */
    getVotingInterface() {
        return 'radio';
    }

    /**
     * Get formatted vote data for a user's existing vote
     * @param {Object} db - Database connection
     * @param {number} userId - User ID
     * @returns {Promise<Object|null>} Formatted vote data or null
     */
    async getUserVoteFormatted(db, userId) {
        const vote = await this.getUserVote(db, userId);
        if (!vote) return null;

        return {
            option_id: vote.option_id,  // Template compatibility
            optionId: vote.option_id,   // JavaScript compatibility
            voted_at: vote.voted_at,    // Template compatibility
            votedAt: vote.voted_at      // JavaScript compatibility
        };
    }

    /**
     * Get display data for rendering the poll
     * @param {Object} db - Database connection
     * @param {number|null} userId - Current user ID (optional)
     * @returns {Promise<Object>} Complete poll data for display
     */
    async getDisplayData(db, userId = null) {
        // Get options with vote counts directly for display
        const optionsRaw = await db.all(
            `SELECT o.id, o.poll_id, o.option_text, o.created_at, COUNT(v.id) as vote_count
             FROM options o
             LEFT JOIN votes v ON o.id = v.option_id
             WHERE o.poll_id = $1
             GROUP BY o.id, o.poll_id, o.option_text, o.created_at
             ORDER BY o.created_at, o.id`,
            [this.id]
        );

        // Convert vote_count to integer for consistent processing
        const options = optionsRaw.map(option => ({
            ...option,
            vote_count: BasePoll.normalizeVoteCount(option.vote_count)
        }));

        const results = await this.calculateResults(db);
        
        let userVote = null;
        let hasVoted = false;
        let canChangeVote = false;

        if (userId) {
            userVote = await this.getUserVoteFormatted(db, userId);
            hasVoted = !!userVote;
            canChangeVote = hasVoted && this.isOpen();
        }

        return {
            poll: this.toJSON(),
            options,
            results,
            hasVoted,
            userVote,
            canChangeVote,
            votingInterface: this.getVotingInterface()
        };
    }
}

module.exports = SimplePoll;