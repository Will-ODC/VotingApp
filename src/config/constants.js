/**
 * Application configuration constants
 * Centralizes all magic numbers and configuration values
 */
module.exports = {
  // Authentication
  MIN_PASSWORD_LENGTH: parseInt(process.env.MIN_PASSWORD_LENGTH) || 6,
  SESSION_TIMEOUT: parseInt(process.env.SESSION_TIMEOUT) || 24 * 60 * 60 * 1000, // 24 hours
  
  // Polls
  DEFAULT_POLL_DURATION_DAYS: parseInt(process.env.DEFAULT_POLL_DURATION_DAYS) || 30,
  MIN_POLL_OPTIONS: 2,
  MAX_POLL_OPTIONS: 10,
  
  // Pagination
  DEFAULT_PAGE_SIZE: parseInt(process.env.DEFAULT_PAGE_SIZE) || 10,
  
  // Database
  DB_CONNECTION_TIMEOUT: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 30000,
  DB_MAX_CONNECTIONS: parseInt(process.env.DB_MAX_CONNECTIONS) || 10,
  
  // Validation
  MAX_USERNAME_LENGTH: 50,
  MAX_EMAIL_LENGTH: 255,
  MAX_POLL_TITLE_LENGTH: 200,
  MAX_POLL_DESCRIPTION_LENGTH: 1000,
  MAX_OPTION_LENGTH: 200,
  
  // Cache Configuration
  CACHE_TTL_SECONDS: parseInt(process.env.CACHE_TTL_SECONDS) || 300, // 5 minutes default
  CACHE_MAX_SIZE: parseInt(process.env.CACHE_MAX_SIZE) || 1000, // Max 1000 items
  CACHE_CLEANUP_INTERVAL: parseInt(process.env.CACHE_CLEANUP_INTERVAL) || 60000, // 1 minute
  
  // Cache Keys
  CACHE_KEYS: {
    POLL_DISPLAY: 'poll_display',
    POLL_RESULTS: 'poll_results',
    USER_STATS: 'user_stats',
    ACTIVE_POLLS: 'active_polls',
    USER_PROFILE: 'user_profile'
  }
};