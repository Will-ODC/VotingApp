/**
 * Poll Factory
 * 
 * Factory pattern implementation for creating poll instances based on type.
 * This allows for easy extension with new poll types while maintaining
 * a consistent interface for poll creation and retrieval.
 */

const SimplePoll = require('./SimplePoll');

class PollFactory {
    /**
     * Registry of available poll types
     * Maps poll type strings to their corresponding classes
     */
    static pollTypes = {
        'simple': SimplePoll,
        // Future poll types will be added here:
        // 'ranked': RankedChoicePoll,
        // 'approval': ApprovalPoll,
        // 'quadratic': QuadraticPoll,
        // 'weighted': WeightedPoll
    };

    /**
     * Create a poll instance from database data
     * @param {Object} pollData - Raw poll data from database
     * @returns {BasePoll} Instance of appropriate poll subclass
     * @throws {Error} If poll type is unknown
     */
    static createPoll(pollData) {
        const pollType = pollData.poll_type || 'simple';
        const PollClass = this.pollTypes[pollType];

        if (!PollClass) {
            throw new Error(`Unknown poll type: ${pollType}`);
        }

        return new PollClass(pollData);
    }

    /**
     * Get a poll instance by ID from the database
     * @param {Object} db - Database connection
     * @param {number} pollId - Poll ID to retrieve
     * @returns {Promise<BasePoll|null>} Poll instance or null if not found
     */
    static async getPollById(db, pollId) {
        const pollData = await db.get(
            `SELECT p.*, u.username as creator_name 
             FROM polls p 
             JOIN users u ON p.created_by = u.id 
             WHERE p.id = $1`,
            [pollId]
        );

        if (!pollData) {
            return null;
        }

        return this.createPoll(pollData);
    }

    /**
     * Get multiple polls with their types
     * @param {Object} db - Database connection
     * @param {string} query - SQL query for fetching polls
     * @param {Array} params - Query parameters
     * @returns {Promise<Array<BasePoll>>} Array of poll instances
     */
    static async getPolls(db, query, params = []) {
        const pollsData = await db.all(query, params);
        return pollsData.map(data => this.createPoll(data));
    }

    /**
     * Register a new poll type
     * @param {string} typeName - Name of the poll type
     * @param {Class} PollClass - Poll class constructor
     */
    static registerPollType(typeName, PollClass) {
        if (this.pollTypes[typeName]) {
            throw new Error(`Poll type '${typeName}' is already registered`);
        }
        this.pollTypes[typeName] = PollClass;
    }

    /**
     * Get list of available poll types
     * @returns {Array<string>} Array of registered poll type names
     */
    static getAvailableTypes() {
        return Object.keys(this.pollTypes);
    }

    /**
     * Check if a poll type is registered
     * @param {string} typeName - Poll type to check
     * @returns {boolean} True if type is registered
     */
    static isValidType(typeName) {
        return typeName in this.pollTypes;
    }
}

module.exports = PollFactory;