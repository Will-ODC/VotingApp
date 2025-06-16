const { 
  DEFAULT_POLL_DURATION_DAYS, 
  MIN_POLL_OPTIONS,
  MAX_POLL_OPTIONS,
  MAX_POLL_TITLE_LENGTH,
  MAX_POLL_DESCRIPTION_LENGTH,
  MAX_OPTION_LENGTH,
  CACHE_KEYS
} = require('../config/constants');
const cacheService = require('./CacheService');
const { convertToPSTEndOfDay } = require('../utils/dateUtils');

/**
 * PollService handles all poll-related business logic
 * Extracted from poll routes to follow Single Responsibility Principle
 */
class PollService {
  constructor(pollRepository, voteRepository) {
    this.pollRepository = pollRepository;
    this.voteRepository = voteRepository;
  }

  /**
   * Validates poll creation data
   */
  validatePollData(title, description, options, endDate, voteThreshold) {
    const errors = [];

    if (!title || title.trim().length === 0) {
      errors.push('Title is required');
    } else if (title.length > MAX_POLL_TITLE_LENGTH) {
      errors.push(`Title too long (max ${MAX_POLL_TITLE_LENGTH} characters)`);
    }

    if (description && description.length > MAX_POLL_DESCRIPTION_LENGTH) {
      errors.push(`Description too long (max ${MAX_POLL_DESCRIPTION_LENGTH} characters)`);
    }

    if (!options || !Array.isArray(options)) {
      errors.push('Options must be an array');
    } else {
      const validOptions = options.filter(opt => opt && opt.trim().length > 0);
      if (validOptions.length < MIN_POLL_OPTIONS) {
        errors.push(`At least ${MIN_POLL_OPTIONS} options required`);
      } else if (validOptions.length > MAX_POLL_OPTIONS) {
        errors.push(`Maximum ${MAX_POLL_OPTIONS} options allowed`);
      }

      validOptions.forEach((option, index) => {
        if (option.length > MAX_OPTION_LENGTH) {
          errors.push(`Option ${index + 1} too long (max ${MAX_OPTION_LENGTH} characters)`);
        }
      });
    }

    if (endDate) {
      // Allow today's date but not past dates - compare date strings to avoid timezone issues
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const inputDateStr = typeof endDate === 'string' ? endDate : new Date(endDate).toISOString().split('T')[0];
      
      if (inputDateStr < today) {
        errors.push('End date cannot be in the past');
      }
    }

    if (voteThreshold !== null && voteThreshold !== undefined && voteThreshold !== '') {
      const threshold = parseInt(voteThreshold);
      if (isNaN(threshold) || threshold < 1) {
        errors.push('Vote threshold must be at least 1');
      }
    }

    return errors;
  }

  /**
   * Creates a new poll
   */
  async createPoll(creatorId, pollData) {
    const { title, description, options, endDate, voteThreshold, category, pollType } = pollData;

    // Validate input
    const errors = this.validatePollData(title, description, options, endDate, voteThreshold);
    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }

    // Validate poll type if provided
    const { PollTypes } = require('../../models/polls');
    const validPollType = pollType || 'simple';
    if (!PollTypes.isTypeAvailable(validPollType)) {
      throw new Error('Invalid poll type selected');
    }

    // Calculate end date if not provided
    let pollEndDate = endDate;
    if (!pollEndDate) {
      const date = new Date();
      date.setDate(date.getDate() + DEFAULT_POLL_DURATION_DAYS);
      pollEndDate = date.toISOString();
    } else {
      // Convert the date-only input to 11:59:59 PM PST
      // The date picker provides a date-only string (YYYY-MM-DD)
      pollEndDate = convertToPSTEndOfDay(endDate);
    }

    // Filter valid options
    const validOptions = options
      .filter(opt => opt && opt.trim().length > 0)
      .map(opt => opt.trim());

    // Parse vote threshold (null if not provided, empty, or invalid)
    const threshold = (voteThreshold && voteThreshold !== '' && parseInt(voteThreshold) > 0) ? parseInt(voteThreshold) : null;

    // Create poll
    const poll = await this.pollRepository.create({
      title: title.trim(),
      description: description?.trim() || '',
      creatorId,
      endDate: pollEndDate,
      voteThreshold: threshold,
      category: category || 'general',
      pollType: validPollType,
      options: validOptions
    });

    // Invalidate active polls cache since a new poll was created
    cacheService.clearByPrefix(CACHE_KEYS.ACTIVE_POLLS);

    return poll;
  }

  /**
   * Gets poll by ID with its options and vote counts
   */
  async getPollById(pollId, userId = null) {
    const poll = await this.pollRepository.findById(pollId);
    if (!poll) {
      throw new Error('Poll not found');
    }

    // Get user's vote if logged in
    let userVote = null;
    if (userId) {
      userVote = await this.voteRepository.findUserVoteForPoll(userId, pollId);
    }

    return {
      ...poll,
      userVote,
      hasExpired: new Date(poll.end_date) < new Date(),
      canVote: userId && !poll.is_deleted && new Date(poll.end_date) > new Date()
    };
  }

  /**
   * Submits or updates a vote
   */
  async submitVote(userId, pollId, optionId) {
    // Get poll
    const poll = await this.pollRepository.findById(pollId);
    if (!poll) {
      throw new Error('Poll not found');
    }

    // Check if poll is active
    if (poll.is_deleted) {
      throw new Error('This poll has been deleted');
    }

    const now = new Date();
    const pollEndDate = new Date(poll.end_date);
    
    // Debug logging for production
    if (process.env.NODE_ENV === 'production') {
      console.log('Poll expiration check:', {
        pollId: poll.id,
        pollEndDate: pollEndDate.toISOString(),
        currentTime: now.toISOString(),
        isExpired: pollEndDate < now
      });
    }
    
    if (pollEndDate < now) {
      throw new Error('This poll has expired');
    }

    // Verify option belongs to poll
    const validOption = poll.options.find(opt => opt.id === parseInt(optionId));
    if (!validOption) {
      throw new Error('Invalid option for this poll');
    }

    // Submit or update vote
    await this.voteRepository.createOrUpdate(userId, optionId);

    // Check if threshold is reached
    if (poll.vote_threshold && !poll.is_approved) {
      await this.checkAndUpdateThreshold(pollId);
    }

    // Invalidate related cache entries
    this.invalidatePollCache(pollId, userId);

    return true;
  }

  /**
   * Checks if poll has reached its vote threshold
   */
  async checkAndUpdateThreshold(pollId) {
    const poll = await this.pollRepository.findById(pollId);
    if (!poll || !poll.vote_threshold || poll.is_approved) {
      return false;
    }

    const totalVotes = poll.options.reduce((sum, opt) => sum + parseInt(opt.vote_count, 10), 0);
    
    if (totalVotes >= poll.vote_threshold) {
      await this.pollRepository.markAsApproved(pollId);
      return true;
    }

    return false;
  }

  /**
   * Gets active polls with filtering and sorting
   */
  async getActivePolls(options = {}) {
    const { search, sort = 'popular', limit = 10, offset = 0 } = options;
    
    // Create cache key based on options
    const cacheKey = cacheService.generateKey(
      CACHE_KEYS.ACTIVE_POLLS,
      `${sort}_${limit}_${offset}`,
      search ? `search_${encodeURIComponent(search)}` : 'no_search'
    );

    return await cacheService.getOrSet(cacheKey, async () => {
      const polls = await this.pollRepository.findActive({
        search,
        sort,
        limit,
        offset
      });

      return polls.map(poll => ({
        ...poll,
        hasExpired: false,
        progressPercentage: poll.vote_threshold 
          ? Math.min(100, (poll.total_votes / poll.vote_threshold) * 100)
          : null
      }));
    }, 120); // Cache for 2 minutes - frequent updates for active polls
  }

  /**
   * Gets all polls (for admin or browse view)
   */
  async getAllPolls(options = {}) {
    const { search, status = 'all', sort = 'recent', limit = 10, offset = 0 } = options;
    
    const polls = await this.pollRepository.findAll({
      search,
      status,
      sort,
      limit,
      offset
    });

    return polls.map(poll => ({
      ...poll,
      hasExpired: new Date(poll.end_date) < new Date()
    }));
  }

  /**
   * Gets all polls with detailed status calculation for browse view
   * @param {Object} options - Query options
   * @param {string} options.filter - Status filter (all|active|expired|deleted)
   * @param {string} options.search - Search query
   * @returns {Array} Polls with status and metadata
   */
  async getAllPollsWithStatus(options = {}) {
    const { filter = 'all', search = '' } = options;
    
    // Build query conditions based on filter
    let whereConditions = [];
    if (filter === 'deleted') {
      whereConditions.push('p.is_active = FALSE');
    } else if (filter === 'active') {
      whereConditions.push('p.is_active = TRUE AND p.end_date > CURRENT_TIMESTAMP');
    } else if (filter === 'expired') {
      whereConditions.push('p.is_active = TRUE AND p.end_date <= CURRENT_TIMESTAMP');
    }
    
    // Determine sort order - active polls show expiring soonest first
    let orderClause = 'ORDER BY p.created_at DESC'; // Default for all/expired/deleted
    if (filter === 'active') {
      orderClause = 'ORDER BY p.end_date ASC'; // Expiring soonest first for active polls
    }

    const polls = await this.pollRepository.findAllWithStatus({
      whereConditions,
      search,
      orderClause
    });

    return polls;
  }

  /**
   * Gets poll details for viewing, including options and user vote
   * @param {number} pollId - The poll ID
   * @param {number|null} userId - The current user ID (optional)
   * @returns {Object} Poll data with display information
   */
  async getPollForDisplay(pollId, userId = null) {
    // Create cache key - include userId to cache user-specific data
    const cacheKey = cacheService.generateKey(
      CACHE_KEYS.POLL_DISPLAY, 
      pollId, 
      userId ? `user_${userId}` : 'anonymous'
    );

    // Try to get from cache first
    return await cacheService.getOrSet(cacheKey, async () => {
      // Use factory pattern from existing code
      const { PollFactory } = require('../../models/polls');
      const poll = await PollFactory.getPollById(this.pollRepository.db, pollId);
      
      if (!poll) {
        return null;
      }

      // Get poll creator info
      const creator = await this.pollRepository.db.get(
        'SELECT username FROM users WHERE id = $1',
        [poll.createdBy]
      );

      // Get display data from poll class
      const displayData = await poll.getDisplayData(this.pollRepository.db, userId);
      
      // Add creator name to poll data
      displayData.poll.creator_name = creator.username;

      return displayData;
    }, 180); // Cache for 3 minutes - shorter than default for real-time voting
  }

  /**
   * Soft deletes a poll (admin only)
   */
  async deletePoll(pollId, adminId) {
    const poll = await this.pollRepository.findById(pollId);
    if (!poll) {
      throw new Error('Poll not found');
    }

    await this.pollRepository.softDelete(pollId);
    
    // Invalidate all cache entries for this poll
    this.invalidatePollCache(pollId);
    
    return true;
  }

  /**
   * Invalidates cache entries related to a specific poll
   * @param {number} pollId - The poll ID
   * @param {number|null} userId - Specific user ID to invalidate (optional)
   */
  invalidatePollCache(pollId, userId = null) {
    // Clear poll display cache for all users or specific user
    if (userId) {
      // Clear for specific user
      const userCacheKey = cacheService.generateKey(
        CACHE_KEYS.POLL_DISPLAY, 
        pollId, 
        `user_${userId}`
      );
      cacheService.delete(userCacheKey);
    } else {
      // Clear for all users (using prefix)
      const pollPrefix = cacheService.generateKey(CACHE_KEYS.POLL_DISPLAY, pollId);
      cacheService.clearByPrefix(pollPrefix);
    }
    
    // Clear anonymous poll display cache
    const anonymousCacheKey = cacheService.generateKey(
      CACHE_KEYS.POLL_DISPLAY, 
      pollId, 
      'anonymous'
    );
    cacheService.delete(anonymousCacheKey);

    // Clear active polls cache (voting affects poll popularity/sorting)
    cacheService.clearByPrefix(CACHE_KEYS.ACTIVE_POLLS);
  }

  /**
   * Invalidates all poll-related cache entries
   * Used when major changes occur that affect multiple polls
   */
  invalidateAllPollCache() {
    cacheService.clearByPrefix(CACHE_KEYS.POLL_DISPLAY);
    cacheService.clearByPrefix(CACHE_KEYS.ACTIVE_POLLS);
    cacheService.clearByPrefix(CACHE_KEYS.POLL_RESULTS);
  }
}

module.exports = PollService;