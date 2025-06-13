/**
 * Poll Module Index
 * 
 * Main export file for the poll class system.
 * Provides a clean interface for importing poll-related classes and utilities.
 */

const BasePoll = require('./BasePoll');
const SimplePoll = require('./SimplePoll');
const PollFactory = require('./PollFactory');
const PollTypes = require('./PollTypes');

module.exports = {
    BasePoll,
    SimplePoll,
    PollFactory,
    PollTypes
};