const { 
  DEFAULT_POLL_DURATION_DAYS, 
  MIN_POLL_OPTIONS,
  MAX_POLL_OPTIONS,
  MAX_POLL_TITLE_LENGTH,
  MAX_POLL_DESCRIPTION_LENGTH,
  MAX_OPTION_LENGTH
} = require('../config/constants');

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

    if (endDate && new Date(endDate) <= new Date()) {
      errors.push('End date must be in the future');
    }

    if (voteThreshold !== null && voteThreshold !== undefined) {
      if (voteThreshold < 1) {
        errors.push('Vote threshold must be at least 1');
      }
    }

    return errors;
  }

  /**
   * Creates a new poll
   */
  async createPoll(creatorId, pollData) {
    const { title, description, options, endDate, voteThreshold } = pollData;

    // Validate input
    const errors = this.validatePollData(title, description, options, endDate, voteThreshold);
    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }

    // Calculate end date if not provided
    let pollEndDate = endDate;
    if (!pollEndDate) {
      const date = new Date();
      date.setDate(date.getDate() + DEFAULT_POLL_DURATION_DAYS);
      pollEndDate = date.toISOString();
    }

    // Filter valid options
    const validOptions = options
      .filter(opt => opt && opt.trim().length > 0)
      .map(opt => opt.trim());

    // Create poll
    const poll = await this.pollRepository.create({
      title: title.trim(),
      description: description?.trim() || '',
      creatorId,
      endDate: pollEndDate,
      voteThreshold: voteThreshold || null,
      options: validOptions
    });

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

    if (new Date(poll.end_date) < new Date()) {
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

    const totalVotes = poll.options.reduce((sum, opt) => sum + opt.vote_count, 0);
    
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
   * Soft deletes a poll (admin only)
   */
  async deletePoll(pollId, adminId) {
    const poll = await this.pollRepository.findById(pollId);
    if (!poll) {
      throw new Error('Poll not found');
    }

    await this.pollRepository.softDelete(pollId);
    return true;
  }
}

module.exports = PollService;