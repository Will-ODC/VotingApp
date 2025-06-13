/**
 * Base Poll Class
 * 
 * Abstract base class for all poll types in the VotingApp.
 * Defines the common interface and properties that all poll types must implement.
 * This allows for polymorphic handling of different voting methods.
 */

class BasePoll {
    /**
     * Normalize vote count to ensure consistent integer handling
     * @param {string|number} count - Vote count from database
     * @returns {number} Normalized integer count
     */
    static normalizeVoteCount(count) {
        if (typeof count === 'string') {
            const parsed = parseInt(count);
            return isNaN(parsed) ? 0 : parsed;
        }
        return typeof count === 'number' ? count : 0;
    }

    /**
     * Constructor for BasePoll
     * @param {Object} data - Poll data from database
     */
    constructor(data) {
        this.id = data.id;
        this.title = data.title;
        this.description = data.description;
        this.category = data.category || 'general';
        this.createdBy = data.created_by;
        this.createdAt = data.created_at;
        this.endDate = data.end_date;
        this.isActive = data.is_active;
        this.voteThreshold = data.vote_threshold;
        this.isApproved = data.is_approved;
        this.approvedAt = data.approved_at;
        this.pollType = data.poll_type || 'simple';
    }

    /**
     * Validate a vote submission
     * @param {number} userId - ID of the user voting
     * @param {*} voteData - Vote data (format depends on poll type)
     * @returns {Object} { valid: boolean, error?: string }
     */
    validateVote(userId, voteData) {
        throw new Error('validateVote must be implemented by subclass');
    }

    /**
     * Record a vote in the database
     * @param {Object} db - Database connection
     * @param {number} userId - ID of the user voting
     * @param {*} voteData - Vote data to record
     * @returns {Promise<boolean>} Success status
     */
    async recordVote(db, userId, voteData) {
        throw new Error('recordVote must be implemented by subclass');
    }

    /**
     * Calculate and return poll results
     * @param {Object} db - Database connection
     * @returns {Promise<Object>} Results object with type-specific format
     */
    async calculateResults(db) {
        throw new Error('calculateResults must be implemented by subclass');
    }

    /**
     * Get the voting interface type for this poll
     * @returns {string} Interface type (e.g., 'radio', 'checkbox', 'ranking')
     */
    getVotingInterface() {
        throw new Error('getVotingInterface must be implemented by subclass');
    }

    /**
     * Check if poll is expired
     * @returns {boolean} True if poll has passed its end date
     */
    isExpired() {
        return new Date(this.endDate) <= new Date();
    }

    /**
     * Check if poll is open for voting
     * @returns {boolean} True if poll can accept votes
     */
    isOpen() {
        return this.isActive && !this.isExpired();
    }

    /**
     * Get poll status
     * @returns {string} 'active', 'expired', or 'deleted'
     */
    getStatus() {
        if (!this.isActive) return 'deleted';
        if (this.isExpired()) return 'expired';
        return 'active';
    }

    /**
     * Check if a user has already voted
     * @param {Object} db - Database connection
     * @param {number} userId - User ID to check
     * @returns {Promise<Object|null>} Existing vote or null
     */
    async getUserVote(db, userId) {
        const vote = await db.get(
            'SELECT * FROM votes WHERE poll_id = $1 AND user_id = $2',
            [this.id, userId]
        );
        return vote;
    }

    /**
     * Get poll options
     * @param {Object} db - Database connection
     * @returns {Promise<Array>} Array of option objects
     */
    async getOptions(db) {
        const options = await db.all(
            'SELECT * FROM options WHERE poll_id = $1 ORDER BY id',
            [this.id]
        );
        return options;
    }

    /**
     * Get total vote count
     * @param {Object} db - Database connection
     * @returns {Promise<number>} Total number of votes
     */
    async getTotalVotes(db) {
        const result = await db.get(
            'SELECT COUNT(*) as count FROM votes WHERE poll_id = $1',
            [this.id]
        );
        return parseInt(result.count);
    }

    /**
     * Check if poll meets approval threshold
     * @param {Object} db - Database connection
     * @returns {Promise<boolean>} True if threshold is met
     */
    async checkThreshold(db) {
        if (!this.voteThreshold || this.isApproved) {
            return this.isApproved;
        }

        const totalVotes = await this.getTotalVotes(db);
        if (totalVotes >= this.voteThreshold) {
            await db.run(
                'UPDATE polls SET is_approved = TRUE, approved_at = CURRENT_TIMESTAMP WHERE id = $1',
                [this.id]
            );
            this.isApproved = true;
            this.approvedAt = new Date();
            return true;
        }

        return false;
    }

    /**
     * Convert poll to JSON-serializable object
     * Provides both camelCase and snake_case properties for template compatibility
     * @returns {Object} Poll data object
     */
    toJSON() {
        return {
            // Primary properties (camelCase)
            id: this.id,
            title: this.title,
            description: this.description,
            category: this.category,
            createdBy: this.createdBy,
            createdAt: this.createdAt,
            endDate: this.endDate,
            isActive: this.isActive,
            voteThreshold: this.voteThreshold,
            isApproved: this.isApproved,
            approvedAt: this.approvedAt,
            pollType: this.pollType,
            status: this.getStatus(),
            isOpen: this.isOpen(),
            
            // Template compatibility properties (snake_case)
            created_by: this.createdBy,
            created_at: this.createdAt,
            end_date: this.endDate,
            closes_at: this.endDate, // Legacy compatibility
            is_active: this.isActive,
            vote_threshold: this.voteThreshold,
            is_approved: this.isApproved,
            approved_at: this.approvedAt,
            poll_type: this.pollType
        };
    }
}

module.exports = BasePoll;