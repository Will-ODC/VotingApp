/**
 * PostgreSQL Helper Utilities
 * 
 * This module provides utility functions to help with PostgreSQL-specific
 * SQL query formatting, particularly for converting ? placeholders to
 * numbered placeholders ($1, $2, etc.)
 */

/**
 * Convert SQL query with ? placeholders to PostgreSQL numbered placeholders
 * @param {string} query - SQL query with ? placeholders
 * @returns {string} Query with PostgreSQL $1, $2, etc. placeholders
 */
function convertToPostgreSQLPlaceholders(query) {
    let index = 1;
    return query.replace(/\?/g, () => `$${index++}`);
}

/**
 * Build a dynamic WHERE clause with PostgreSQL placeholders
 * @param {Array} conditions - Array of condition strings (e.g., ['title LIKE ?', 'category = ?'])
 * @param {Array} params - Array of parameter values
 * @returns {Object} { whereClause: string, numberedParams: array }
 */
function buildPostgreSQLWhereClause(conditions, params) {
    if (!conditions || conditions.length === 0) {
        return { whereClause: '', numberedParams: [] };
    }
    
    let index = 1;
    const numberedConditions = conditions.map(condition => {
        return condition.replace(/\?/g, () => `$${index++}`);
    });
    
    return {
        whereClause: 'WHERE ' + numberedConditions.join(' AND '),
        numberedParams: params
    };
}

module.exports = {
    convertToPostgreSQLPlaceholders,
    buildPostgreSQLWhereClause
};