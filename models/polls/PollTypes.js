/**
 * Poll Types Configuration
 * 
 * Centralized configuration for all available poll types in the system.
 * Provides metadata about each poll type including display information
 * and availability status.
 */

const PollTypes = {
    /**
     * Simple single-choice poll (default)
     */
    simple: {
        name: 'Simple Poll',
        description: 'Traditional single-choice voting where each user selects one option',
        icon: '🗳️',
        available: true,
        features: [
            'One vote per user',
            'Easy to understand',
            'Clear winner determination',
            'Real-time results'
        ],
        comingSoon: false
    },

    /**
     * Ranked choice voting (future)
     */
    ranked: {
        name: 'Ranked Choice',
        description: 'Voters rank options in order of preference for more nuanced results',
        icon: '📊',
        available: false,
        features: [
            'Rank all options by preference',
            'Instant runoff calculation',
            'Reduces strategic voting',
            'Better consensus finding'
        ],
        comingSoon: true
    },

    /**
     * Approval voting (future)
     */
    approval: {
        name: 'Approval Voting',
        description: 'Vote for as many options as you approve of',
        icon: '✅',
        available: false,
        features: [
            'Select multiple options',
            'Simple to understand',
            'Reduces vote splitting',
            'Find broadly acceptable options'
        ],
        comingSoon: true
    },

    /**
     * Quadratic voting (future)
     */
    quadratic: {
        name: 'Quadratic Voting',
        description: 'Allocate voting credits with increasing cost for stronger preferences',
        icon: '💹',
        available: false,
        features: [
            'Express preference intensity',
            'Prevents domination by majority',
            'Uses voting credits system',
            'Better for budget allocation'
        ],
        comingSoon: true
    },

    /**
     * Weighted voting (future)
     */
    weighted: {
        name: 'Weighted Voting',
        description: 'Votes carry different weights based on user contributions',
        icon: '⚖️',
        available: false,
        features: [
            'Contribution-based voting power',
            'Rewards active participation',
            'Transparent weight calculation',
            'Incentivizes engagement'
        ],
        comingSoon: true
    }
};

/**
 * Get poll type configuration
 * @param {string} type - Poll type identifier
 * @returns {Object|null} Poll type configuration or null if not found
 */
function getPollType(type) {
    return PollTypes[type] || null;
}

/**
 * Get all available poll types
 * @returns {Array} Array of available poll type configurations
 */
function getAvailablePollTypes() {
    return Object.entries(PollTypes)
        .filter(([_, config]) => config.available)
        .map(([type, config]) => ({ type, ...config }));
}

/**
 * Get all poll types (including coming soon)
 * @returns {Array} Array of all poll type configurations
 */
function getAllPollTypes() {
    return Object.entries(PollTypes)
        .map(([type, config]) => ({ type, ...config }));
}

/**
 * Check if a poll type is available
 * @param {string} type - Poll type to check
 * @returns {boolean} True if type exists and is available
 */
function isTypeAvailable(type) {
    return PollTypes[type] && PollTypes[type].available;
}

module.exports = {
    PollTypes,
    getPollType,
    getAvailablePollTypes,
    getAllPollTypes,
    isTypeAvailable
};