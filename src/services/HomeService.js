/**
 * HomeService handles homepage and search-related business logic
 * Extracted from index routes to follow Single Responsibility Principle
 */
class HomeService {
  constructor(pollRepository) {
    this.pollRepository = pollRepository;
  }

  /**
   * Gets homepage polls with filtering, searching, and sorting
   * @param {Object} options - Query options
   * @param {string} options.sort - Sort method (popular|recent|active)
   * @param {string} options.search - Search query
   * @param {string} options.category - Category filter
   * @returns {Array} Array of polls with vote counts and metadata
   */
  async getHomepagePolls(options = {}) {
    const { sort = 'popular', search = '', category = '' } = options;
    
    // Build search and filter conditions
    let conditions = [];
    let queryParams = [];
    let paramIndex = 1;
    
    if (search.trim()) {
      conditions.push(`(p.title LIKE $${paramIndex++} OR p.description LIKE $${paramIndex++})`);
      const searchPattern = `%${search.trim()}%`;
      queryParams.push(searchPattern, searchPattern);
    }
    
    if (category.trim()) {
      conditions.push(`p.category = $${paramIndex++}`);
      queryParams.push(category.trim());
    }
    
    const searchCondition = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';
    
    // Determine order clause based on sort parameter
    let orderClause = this._getOrderClause(sort);

    // Fetch active polls with vote counts, search, and sorting
    const query = `
      SELECT p.*, 
             COUNT(DISTINCT v.id) as vote_count,
             MAX(v.voted_at) as last_vote_time
      FROM polls p
      LEFT JOIN votes v ON p.id = v.poll_id
      WHERE p.is_active = TRUE AND (p.end_date IS NULL OR p.end_date > CURRENT_TIMESTAMP)
      ${searchCondition}
      GROUP BY p.id, p.title, p.description, p.created_by, p.created_at, p.end_date, p.is_active, p.is_deleted, p.vote_threshold, p.is_approved, p.approved_at, p.category
      ${orderClause}
      LIMIT 10
    `;

    const polls = await this.pollRepository.db.all(query, queryParams);
    
    return polls.map(poll => ({
      ...poll,
      hasExpired: false, // These are active polls only
      progressPercentage: poll.vote_threshold 
        ? Math.min(100, (poll.vote_count / poll.vote_threshold) * 100)
        : null
    }));
  }

  /**
   * Gets the appropriate ORDER BY clause for the given sort method
   * @private
   */
  _getOrderClause(sort) {
    switch (sort) {
      case 'recent':
        return 'ORDER BY p.created_at DESC';
      case 'active':
        // Sort by activity (recent votes + creation time)
        return 'ORDER BY last_vote_time DESC, p.created_at DESC';
      case 'popular':
      default:
        return 'ORDER BY vote_count DESC, p.created_at DESC';
    }
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
   * Validates search and filter parameters
   * @param {Object} params - Request parameters
   * @returns {Object} Sanitized parameters
   */
  validateSearchParams(params) {
    const { sort, search, category } = params;
    
    // Validate sort parameter
    const validSorts = ['popular', 'recent', 'active'];
    const sanitizedSort = validSorts.includes(sort) ? sort : 'popular';
    
    // Sanitize search query (basic length limit)
    const sanitizedSearch = search ? search.trim().substring(0, 100) : '';
    
    // Sanitize category
    const sanitizedCategory = category ? category.trim().substring(0, 50) : '';
    
    return {
      sort: sanitizedSort,
      search: sanitizedSearch,
      category: sanitizedCategory
    };
  }
}

module.exports = HomeService;