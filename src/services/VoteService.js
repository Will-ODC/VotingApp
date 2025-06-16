/**
 * VoteService handles voting business logic
 * Follows the same clean architecture pattern as UserService
 */
const PollRepository = require('../repositories/PollRepository');
const VoteRepository = require('../repositories/VoteRepository');
const { CACHE_KEYS } = require('../config/constants');
const cacheService = require('./CacheService');

class VoteService {
  constructor(voteRepository, pollRepository) {
    this.voteRepository = voteRepository;
    this.pollRepository = pollRepository;
  }

  /**
   * Cast a vote for a poll option
   * Handles vote validation, creation/update, and approval threshold checks
   * 
   * @param {number} userId - The ID of the voting user
   * @param {number} pollId - The ID of the poll
   * @param {number} optionId - The ID of the selected option
   * @returns {Promise<void>}
   * @throws {Error} If validation fails or vote cannot be cast
   */
  async castVote(userId, pollId, optionId) {
    // Check if poll exists and is active
    const poll = await this.pollRepository.findById(pollId);
    if (!poll) {
      throw new Error('Poll not found');
    }

    if (!poll.is_active || poll.is_deleted) {
      throw new Error('This poll has been deleted and cannot accept votes');
    }

    // Check if poll has expired
    const now = new Date();
    const endDate = new Date(poll.end_date);
    if (endDate <= now) {
      throw new Error('This poll has expired and no longer accepts votes');
    }

    // Verify option belongs to the poll
    const option = await this.pollRepository.getOption(optionId);
    if (!option || option.poll_id !== pollId) {
      throw new Error('Invalid option selected');
    }

    // Create or update the vote
    await this.voteRepository.createOrUpdate(userId, optionId);

    // Check if poll has reached approval threshold
    if (poll.vote_threshold && !poll.is_approved) {
      const totalVotes = await this.pollRepository.getTotalVotes(pollId);
      
      if (totalVotes >= poll.vote_threshold) {
        // Mark poll as approved
        await this.pollRepository.markAsApproved(pollId);
      }
    }

    // Invalidate related cache entries
    this.invalidateVoteCache(pollId, userId);
  }

  /**
   * Get user's current vote for a poll
   * 
   * @param {number} userId - The ID of the user
   * @param {number} pollId - The ID of the poll
   * @returns {Promise<Object|null>} The user's vote or null if not voted
   */
  async getUserVote(userId, pollId) {
    return await this.voteRepository.findUserVoteForPoll(userId, pollId);
  }

  /**
   * Check if a user can vote on a poll
   * 
   * @param {number} userId - The ID of the user
   * @param {number} pollId - The ID of the poll
   * @returns {Promise<Object>} Validation result with canVote flag and reason
   */
  async canUserVote(userId, pollId) {
    const poll = await this.pollRepository.findById(pollId);
    
    if (!poll) {
      return { canVote: false, reason: 'Poll not found' };
    }

    if (!poll.is_active || poll.is_deleted) {
      return { canVote: false, reason: 'Poll has been deleted' };
    }

    const now = new Date();
    const endDate = new Date(poll.end_date);
    if (endDate <= now) {
      return { canVote: false, reason: 'Poll has expired' };
    }

    return { canVote: true };
  }

  /**
   * Invalidates cache entries related to voting
   * @param {number} pollId - The poll ID
   * @param {number} userId - The user ID who voted
   */
  invalidateVoteCache(pollId, userId) {
    // Clear poll display cache for the user who voted
    const userPollCacheKey = cacheService.generateKey(
      CACHE_KEYS.POLL_DISPLAY, 
      pollId, 
      `user_${userId}`
    );
    cacheService.delete(userPollCacheKey);

    // Clear anonymous poll display cache (affects vote counts)
    const anonymousPollCacheKey = cacheService.generateKey(
      CACHE_KEYS.POLL_DISPLAY, 
      pollId, 
      'anonymous'
    );
    cacheService.delete(anonymousPollCacheKey);

    // Clear active polls cache (voting affects popularity/sorting)
    cacheService.clearByPrefix(CACHE_KEYS.ACTIVE_POLLS);

    // Clear user statistics cache
    const userStatsCacheKey = cacheService.generateKey(CACHE_KEYS.USER_STATS, userId);
    cacheService.delete(userStatsCacheKey);
  }
}

module.exports = VoteService;