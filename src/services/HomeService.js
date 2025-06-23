/**
 * HomeService handles homepage-specific business logic
 * Extracted from index routes to follow Single Responsibility Principle
 * Delegates search functionality to SearchService
 */
class HomeService {
  constructor(pollRepository, searchService) {
    this.pollRepository = pollRepository;
    this.searchService = searchService;
  }

  /**
   * Gets homepage polls with filtering, searching, and sorting
   * Delegates to SearchService for actual search functionality
   * @param {Object} options - Query options
   * @param {string} options.sort - Sort method (popular|recent|active)
   * @param {string} options.search - Search query
   * @param {string} options.category - Category filter
   * @returns {Array} Array of polls with vote counts and metadata
   */
  async getHomepagePolls(options = {}) {
    const { sort = 'popular', search = '', category = '' } = options;
    
    // Delegate to SearchService with homepage context
    // Default limit of 10 to maintain backward compatibility
    const polls = await this.searchService.getHomepagePolls({
      query: search,
      sort: sort,
      category: category,
      limit: 10
    });
    
    // SearchService already enriches polls with hasExpired and progressPercentage
    // but we need to ensure backward compatibility for any differences
    return polls.map(poll => ({
      ...poll,
      // Ensure hasExpired is false for active polls (backward compatibility)
      hasExpired: false
    }));
  }

  /**
   * Gets homepage statistics for display
   * @returns {Object} Stats about polls and votes
   */
  async getHomepageStats() {
    try {
      // Get total active polls
      const activePollsResult = await this.pollRepository.db.get(`
        SELECT COUNT(*) as count 
        FROM polls 
        WHERE is_active = TRUE AND (end_date IS NULL OR end_date > CURRENT_TIMESTAMP)
      `);

      // Get total votes cast
      const totalVotesResult = await this.pollRepository.db.get(`
        SELECT COUNT(*) as count 
        FROM votes v
        JOIN options o ON v.option_id = o.id
        JOIN polls p ON o.poll_id = p.id
        WHERE p.is_active = TRUE
      `);

      // Get recently approved polls count
      const recentApprovedResult = await this.pollRepository.db.get(`
        SELECT COUNT(*) as count 
        FROM polls 
        WHERE is_approved = TRUE 
          AND approved_at > CURRENT_TIMESTAMP - INTERVAL '7 days'
          AND is_active = TRUE
      `);

      return {
        activePolls: activePollsResult?.count || 0,
        totalVotes: totalVotesResult?.count || 0,
        recentlyApproved: recentApprovedResult?.count || 0
      };
    } catch (error) {
      console.error('Error fetching homepage stats:', error);
      // Return defaults on error
      return {
        activePolls: 0,
        totalVotes: 0,
        recentlyApproved: 0
      };
    }
  }

  /**
   * Gets available categories for filtering
   * @returns {Array} Array of category strings
   */
  async getCategories() {
    try {
      const categories = await this.pollRepository.db.all(`
        SELECT DISTINCT category 
        FROM polls 
        WHERE is_active = TRUE AND category IS NOT NULL AND category != ''
        ORDER BY category
      `);
      
      return categories.map(row => row.category);
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  }

  /**
   * Gets the primary action initiative for homepage display
   * Returns the active action initiative with the most votes
   * @param {number|null} userId - Current user ID for vote checking
   * @returns {Object|null} Primary action initiative or null if none exist
   */
  async getPrimaryActionInitiative(userId = null) {
    try {
      const query = `
        SELECT 
          p.*,
          u.username as creator_username,
          COALESCE(vote_counts.total_votes, 0) as vote_count
        FROM polls p
        INNER JOIN users u ON p.created_by = u.id
        LEFT JOIN (
          SELECT 
            o.poll_id, 
            COUNT(v.id) as total_votes
          FROM options o
          LEFT JOIN votes v ON o.id = v.option_id
          GROUP BY o.poll_id
        ) vote_counts ON p.id = vote_counts.poll_id
        WHERE p.is_action_initiative = TRUE 
          AND p.is_active = TRUE 
          AND (p.end_date IS NULL OR p.end_date > CURRENT_TIMESTAMP)
          AND p.action_status IN ('pending', 'stage2_voting')
        ORDER BY vote_counts.total_votes DESC, p.created_at DESC
        LIMIT 1
      `;
      
      const actionInitiative = await this.pollRepository.db.get(query);
      
      if (!actionInitiative) {
        return null;
      }
      
      // Get poll options
      const options = await this.pollRepository.db.all(`
        SELECT 
          o.id,
          o.poll_id,
          o.option_text,
          o.created_at,
          COUNT(v.id) as vote_count
        FROM options o
        LEFT JOIN votes v ON o.id = v.option_id
        WHERE o.poll_id = $1
        GROUP BY o.id, o.poll_id, o.option_text, o.created_at
        ORDER BY o.id
      `, [actionInitiative.id]);
      
      // Calculate percentages
      const totalVotes = actionInitiative.vote_count;
      const optionsWithPercentages = options.map(option => ({
        ...option,
        percentage: totalVotes > 0 ? ((option.vote_count / totalVotes) * 100).toFixed(1) : 0
      }));
      
      // Get user's vote if logged in
      let userVote = null;
      if (userId) {
        userVote = await this.pollRepository.db.get(`
          SELECT v.*, o.option_text 
          FROM votes v
          JOIN options o ON v.option_id = o.id
          WHERE v.user_id = $1 AND v.poll_id = $2
        `, [userId, actionInitiative.id]);
      }
      
      return {
        ...actionInitiative,
        options: optionsWithPercentages,
        userVote: userVote ? {
          optionId: userVote.option_id,
          optionText: userVote.option_text,
          votedAt: userVote.voted_at
        } : null,
        hasVoted: !!userVote
      };
    } catch (error) {
      console.error('Error fetching primary action initiative:', error);
      return null;
    }
  }

  /**
   * Validates search and filter parameters
   * Delegates to SearchService for consistent validation across the application
   * @param {Object} params - Request parameters
   * @returns {Object} Sanitized parameters
   */
  validateSearchParams(params) {
    // Delegate to SearchService for validation
    const validated = this.searchService.validateSearchParams({
      query: params.search,
      sort: params.sort,
      category: params.category,
      context: 'homepage'
    });
    
    // Map back to expected format for backward compatibility
    return {
      sort: validated.sort,
      search: validated.query,
      category: validated.category
    };
  }
}

module.exports = HomeService;