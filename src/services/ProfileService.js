/**
 * ProfileService handles user profile-related business logic
 * Follows clean architecture pattern for separation of concerns
 */
class ProfileService {
  constructor(userRepository, pollRepository, voteRepository) {
    this.userRepository = userRepository;
    this.pollRepository = pollRepository;
    this.voteRepository = voteRepository;
  }

  /**
   * Gets user profile dashboard data including created polls and voting statistics
   * 
   * @param {number} userId - The ID of the user
   * @returns {Promise<Object>} Profile data with user polls and statistics
   */
  async getProfileDashboard(userId) {
    // Get user's created polls with vote counts (no limit for dashboard)
    const userPolls = await this.pollRepository.findByCreatorId(userId, 1000, 0);
    
    // Get user statistics
    const userStats = await this.userRepository.getUserStats(userId);
    
    return {
      userPolls,
      userStats
    };
  }

  /**
   * Gets paginated voting history for a user
   * 
   * @param {number} userId - The ID of the user
   * @param {number} page - Page number (1-based)
   * @param {number} perPage - Items per page
   * @returns {Promise<Object>} Paginated voting history with metadata
   */
  async getVotingHistory(userId, page = 1, perPage = 10) {
    // Validate pagination parameters
    if (page < 1) page = 1;
    if (perPage < 1 || perPage > 100) perPage = 10;
    
    const offset = (page - 1) * perPage;
    
    // Get total count for pagination
    const totalVotedPolls = await this.voteRepository.countByUserId(userId);
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(totalVotedPolls / perPage);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    
    // Get paginated voting history with detailed poll information
    const votedPolls = await this.getDetailedVotingHistory(userId, perPage, offset);
    
    return {
      votedPolls,
      pagination: {
        currentPage: page,
        totalPages,
        totalVotedPolls,
        hasNextPage,
        hasPrevPage,
        perPage,
        showingCount: votedPolls.length
      }
    };
  }

  /**
   * Gets detailed voting history with poll status and creator information
   * This is a more complex query that includes poll status calculation
   * 
   * @param {number} userId - The ID of the user
   * @param {number} limit - Maximum number of results
   * @param {number} offset - Number of results to skip
   * @returns {Promise<Array>} Detailed voting history
   */
  async getDetailedVotingHistory(userId, limit, offset) {
    // Delegate to VoteRepository for detailed voting history
    const votedPolls = await this.voteRepository.getDetailedVotingHistory(userId, limit, offset);
    return votedPolls;
  }

  /**
   * Validates password change request
   * 
   * @param {string} newPassword - The new password
   * @param {string} confirmPassword - Password confirmation
   * @returns {Array} Array of validation errors
   */
  validatePasswordChange(newPassword, confirmPassword) {
    const errors = [];
    
    if (newPassword !== confirmPassword) {
      errors.push('New passwords do not match');
    }
    
    if (!newPassword || newPassword.length < 6) {
      errors.push('Password must be at least 6 characters');
    }
    
    return errors;
  }

  /**
   * Changes user password by delegating to UserService
   * This method exists for consistency but delegates to UserService
   * 
   * @param {Object} userService - UserService instance
   * @param {number} userId - The ID of the user
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @param {string} confirmPassword - Password confirmation
   * @returns {Promise<boolean>} Success status
   */
  async changePassword(userService, userId, currentPassword, newPassword, confirmPassword) {
    // Validate password confirmation
    const errors = this.validatePasswordChange(newPassword, confirmPassword);
    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }
    
    // Delegate to UserService for actual password change
    return await userService.changePassword(userId, currentPassword, newPassword);
  }
}

module.exports = ProfileService;