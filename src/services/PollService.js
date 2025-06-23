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
  validatePollData(title, description, options, endDate, voteThreshold, isActionInitiative, actionPlan, actionDeadline) {
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

    // Validate action initiative fields
    if (isActionInitiative) {
      if (!actionPlan || actionPlan.trim().length === 0) {
        errors.push('Action plan is required for Action Initiatives');
      } else if (actionPlan.trim().length > 500) {
        errors.push('Action plan must be 500 characters or less');
      }

      if (!actionDeadline) {
        errors.push('Action deadline is required for Action Initiatives');
      } else {
        // Validate action deadline is not in the past and is after poll end date
        const today = new Date().toISOString().split('T')[0];
        const deadlineStr = typeof actionDeadline === 'string' ? actionDeadline : new Date(actionDeadline).toISOString().split('T')[0];
        
        if (deadlineStr < today) {
          errors.push('Action deadline cannot be in the past');
        }

        // If poll has end date, action deadline should be after it
        if (endDate) {
          const endDateStr = typeof endDate === 'string' ? endDate : new Date(endDate).toISOString().split('T')[0];
          if (deadlineStr <= endDateStr) {
            errors.push('Action deadline must be after the poll end date');
          }
        }
      }
    }

    return errors;
  }

  /**
   * Creates a new poll
   */
  async createPoll(creatorId, pollData) {
    const { 
      title, 
      description, 
      options, 
      endDate, 
      voteThreshold, 
      category, 
      pollType,
      is_action_initiative,
      action_plan,
      action_deadline
    } = pollData;

    // Validate input
    const isActionInitiative = is_action_initiative === '1' || is_action_initiative === true;
    const errors = this.validatePollData(title, description, options, endDate, voteThreshold, isActionInitiative, action_plan, action_deadline);
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

    // Process action initiative fields
    let actionDeadlineProcessed = null;
    if (isActionInitiative && action_deadline) {
      // Convert action deadline to 11:59:59 PM PST like poll end date
      actionDeadlineProcessed = convertToPSTEndOfDay(action_deadline);
    }

    // Create poll
    const poll = await this.pollRepository.create({
      title: title.trim(),
      description: description?.trim() || '',
      creatorId,
      endDate: pollEndDate,
      voteThreshold: threshold,
      category: category || 'general',
      pollType: validPollType,
      options: validOptions,
      isActionInitiative,
      actionPlan: isActionInitiative ? (action_plan?.trim() || '') : null,
      actionDeadline: actionDeadlineProcessed,
      actionStatus: isActionInitiative ? 'pending' : null
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
   * For action initiatives, triggers Stage 2 transition
   */
  async checkAndUpdateThreshold(pollId) {
    const poll = await this.pollRepository.findById(pollId);
    if (!poll || !poll.vote_threshold || poll.is_approved) {
      return false;
    }

    const totalVotes = poll.options.reduce((sum, opt) => sum + parseInt(opt.vote_count, 10), 0);
    
    if (totalVotes >= poll.vote_threshold) {
      await this.pollRepository.markAsApproved(pollId);
      
      // If this is an action initiative, transition to Stage 2
      if (poll.is_action_initiative && poll.action_status === 'pending') {
        await this.transitionToStage2(pollId);
      }
      
      return true;
    }

    return false;
  }

  /**
   * Transitions an action initiative from Stage 1 to Stage 2
   * Creates a 24-hour voting window for action plan approval
   */
  async transitionToStage2(pollId) {
    try {
      // Calculate Stage 2 voting deadline (24 hours from now)
      const stage2Deadline = new Date();
      stage2Deadline.setHours(stage2Deadline.getHours() + 24);
      
      // Update poll status to stage2_voting
      await this.pollRepository.db.run(`
        UPDATE polls 
        SET action_status = 'stage2_voting',
            stage2_deadline = $1
        WHERE id = $2
      `, [stage2Deadline.toISOString(), pollId]);
      
      console.log(`Action Initiative ${pollId} transitioned to Stage 2 voting`);
      
      // TODO: In a future task, send notifications to Stage 1 voters
      // await this.notifyStage1Voters(pollId);
      
    } catch (error) {
      console.error(`Error transitioning poll ${pollId} to Stage 2:`, error);
      throw error;
    }
  }

  /**
   * Submits Stage 2 vote (approve/reject action plan)
   * Only Stage 1 voters can participate
   */
  async submitStage2Vote(userId, pollId, approval) {
    // Get poll
    const poll = await this.pollRepository.findById(pollId);
    if (!poll) {
      throw new Error('Poll not found');
    }

    // Check if this is an action initiative in Stage 2 voting
    if (!poll.is_action_initiative || poll.action_status !== 'stage2_voting') {
      throw new Error('Stage 2 voting is not available for this poll');
    }

    // Check if Stage 2 voting period is still active
    if (poll.stage2_deadline && new Date(poll.stage2_deadline) < new Date()) {
      throw new Error('Stage 2 voting period has expired');
    }

    // Check if user voted in Stage 1
    const stage1Vote = await this.voteRepository.findUserVoteForPoll(userId, pollId);
    if (!stage1Vote) {
      throw new Error('Only Stage 1 voters can participate in action plan approval');
    }

    // Submit or update Stage 2 vote
    await this.pollRepository.db.run(`
      INSERT INTO stage2_votes (user_id, poll_id, approval) 
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, poll_id) 
      DO UPDATE SET approval = $3, voted_at = CURRENT_TIMESTAMP
    `, [userId, pollId, approval]);

    // Check if Stage 2 is complete and update status
    await this.checkStage2Completion(pollId);

    return true;
  }

  /**
   * Checks if Stage 2 voting is complete and updates poll status
   */
  async checkStage2Completion(pollId) {
    try {
      // Get Stage 1 voter count
      const stage1VotersResult = await this.pollRepository.db.get(`
        SELECT COUNT(DISTINCT v.user_id) as stage1_voters
        FROM votes v
        INNER JOIN options o ON v.option_id = o.id
        WHERE o.poll_id = $1
      `, [pollId]);

      const stage1Voters = stage1VotersResult?.stage1_voters || 0;

      // Get Stage 2 vote counts
      const stage2Results = await this.pollRepository.db.get(`
        SELECT 
          COUNT(*) as total_stage2_votes,
          COUNT(CASE WHEN approval = 'approve' THEN 1 END) as approve_count,
          COUNT(CASE WHEN approval = 'reject' THEN 1 END) as reject_count
        FROM stage2_votes 
        WHERE poll_id = $1
      `, [pollId]);

      const totalStage2Votes = stage2Results?.total_stage2_votes || 0;
      const approveCount = stage2Results?.approve_count || 0;
      const rejectCount = stage2Results?.reject_count || 0;

      // Check if all Stage 1 voters have voted in Stage 2 (or majority threshold)
      const minimumVotes = Math.ceil(stage1Voters * 0.5); // At least 50% of Stage 1 voters
      
      if (totalStage2Votes >= minimumVotes) {
        // Determine outcome
        const newStatus = approveCount > rejectCount ? 'stage2_approved' : 'action_rejected';
        
        await this.pollRepository.db.run(`
          UPDATE polls 
          SET action_status = $1
          WHERE id = $2
        `, [newStatus, pollId]);

        console.log(`Action Initiative ${pollId} Stage 2 completed: ${newStatus}`);
      }

    } catch (error) {
      console.error(`Error checking Stage 2 completion for poll ${pollId}:`, error);
    }
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

      // Add Stage 2 data for action initiatives
      if (poll.isActionInitiative && userId) {
        const stage2Data = await this.getStage2Data(pollId, userId);
        displayData.stage1Voter = stage2Data.stage1Voter;
        displayData.stage2Vote = stage2Data.stage2Vote;
        displayData.stage2Results = stage2Data.stage2Results;
      }

      return displayData;
    }, 180); // Cache for 3 minutes - shorter than default for real-time voting
  }

  /**
   * Gets Stage 2 voting data for a user and poll
   */
  async getStage2Data(pollId, userId) {
    try {
      // Check if user voted in Stage 1
      const stage1Vote = await this.voteRepository.findUserVoteForPoll(userId, pollId);
      const stage1Voter = !!stage1Vote;

      // Get user's Stage 2 vote if they're a Stage 1 voter
      let stage2Vote = null;
      if (stage1Voter) {
        const stage2VoteResult = await this.pollRepository.db.get(`
          SELECT approval, voted_at 
          FROM stage2_votes 
          WHERE user_id = $1 AND poll_id = $2
        `, [userId, pollId]);
        
        if (stage2VoteResult) {
          stage2Vote = {
            approval: stage2VoteResult.approval,
            voted_at: stage2VoteResult.voted_at
          };
        }
      }

      // Get Stage 2 voting results
      const stage2Results = await this.pollRepository.db.get(`
        SELECT 
          COUNT(*) as total_votes,
          COUNT(CASE WHEN approval = 'approve' THEN 1 END) as approve_count,
          COUNT(CASE WHEN approval = 'reject' THEN 1 END) as reject_count
        FROM stage2_votes 
        WHERE poll_id = $1
      `, [pollId]);

      const totalVotes = stage2Results?.total_votes || 0;
      const approveCount = stage2Results?.approve_count || 0;
      const rejectCount = stage2Results?.reject_count || 0;

      const results = totalVotes > 0 ? {
        total: totalVotes,
        approveCount,
        rejectCount,
        approvePercentage: (approveCount / totalVotes) * 100,
        rejectPercentage: (rejectCount / totalVotes) * 100
      } : null;

      return {
        stage1Voter,
        stage2Vote,
        stage2Results: results
      };

    } catch (error) {
      console.error(`Error getting Stage 2 data for poll ${pollId}:`, error);
      return {
        stage1Voter: false,
        stage2Vote: null,
        stage2Results: null
      };
    }
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
   * Gets Stage 2 voting statistics for a poll
   * @param {number} pollId - The poll ID
   * @returns {Object} Stage 2 vote counts and percentages
   */
  async getStage2VoteStats(pollId) {
    const stats = await this.pollRepository.db.get(`
      SELECT 
        COUNT(CASE WHEN approval = 'approve' THEN 1 END) as approve_count,
        COUNT(CASE WHEN approval = 'reject' THEN 1 END) as reject_count,
        COUNT(*) as total_votes
      FROM stage2_votes
      WHERE poll_id = ?
    `, [pollId]);

    const approvePercentage = stats.total_votes > 0 
      ? ((stats.approve_count / stats.total_votes) * 100).toFixed(1)
      : 0;
    
    const rejectPercentage = stats.total_votes > 0
      ? ((stats.reject_count / stats.total_votes) * 100).toFixed(1)
      : 0;

    return {
      approveCount: stats.approve_count || 0,
      rejectCount: stats.reject_count || 0,
      totalVotes: stats.total_votes || 0,
      approvePercentage,
      rejectPercentage
    };
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