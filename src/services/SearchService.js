/**
 * SearchService handles all search-related functionality across the application
 * Provides consistent search behavior for different contexts (homepage, all polls, etc.)
 */
class SearchService {
  constructor(pollRepository) {
    this.pollRepository = pollRepository;
  }

  /**
   * Performs a general poll search across all contexts
   * @param {Object} options - Search options
   * @param {string} options.query - Search query
   * @param {string} options.context - Search context (homepage|all|user)
   * @param {string} options.sort - Sort method
   * @param {string} options.filter - Status filter (for all polls context)
   * @param {string} options.category - Category filter (for homepage context)
   * @param {number} options.userId - User ID (for user context)
   * @param {number} options.limit - Result limit
   * @returns {Array} Search results
   */
  async searchPolls(options = {}) {
    const { query, context = 'homepage', sort = 'popular', filter = 'all', category = '', userId = null, limit = 20 } = options;
    
    switch (context) {
      case 'homepage':
        return this._searchHomepagePolls(query, sort, category, limit);
      case 'all':
        return this._searchAllPolls(query, sort, filter);
      case 'user':
        return this._searchUserPolls(query, sort, userId);
      default:
        throw new Error('Invalid search context');
    }
  }

  /**
   * Searches homepage polls (active only) with support for category filtering
   * Works in both search mode (with query) and browse mode (without query)
   * @private
   * @param {string} query - Search query (optional)
   * @param {string} sort - Sort method
   * @param {string} category - Category filter (optional)
   * @param {number} limit - Result limit
   * @returns {Array} Matching polls
   */
  async _searchHomepagePolls(query, sort, category, limit = 20) {
    // Build dynamic conditions and parameters
    let conditions = [];
    let queryParams = [];
    let paramIndex = 1;
    
    // Always filter for active polls
    conditions.push('p.is_active = TRUE');
    conditions.push('(p.end_date IS NULL OR p.end_date > CURRENT_TIMESTAMP)');
    
    // Add search condition if query provided
    if (query && query.trim().length > 0) {
      conditions.push(`(p.title LIKE $${paramIndex++} OR p.description LIKE $${paramIndex++})`);
      const searchPattern = `%${query.trim()}%`;
      queryParams.push(searchPattern, searchPattern);
    }
    
    // Add category filter if provided
    if (category && category.trim().length > 0) {
      conditions.push(`p.category = $${paramIndex++}`);
      queryParams.push(category.trim());
    }
    
    const whereClause = conditions.join(' AND ');
    const orderClause = this._getOrderClause(sort, 'homepage');
    
    const sql = `
      SELECT p.*, 
             COUNT(DISTINCT v.id) as vote_count,
             MAX(v.voted_at) as last_vote_time
      FROM polls p
      LEFT JOIN votes v ON p.id = v.poll_id
      WHERE ${whereClause}
      GROUP BY p.id, p.title, p.description, p.created_by, p.created_at, p.end_date, p.is_active, p.is_deleted, p.vote_threshold, p.is_approved, p.approved_at, p.category
      ${orderClause}
      LIMIT $${paramIndex}
    `;
    
    // Add limit as the last parameter
    queryParams.push(limit);

    const results = await this.pollRepository.db.all(sql, queryParams);
    return this._enrichPollResults(results, 'homepage');
  }

  /**
   * Searches all polls with status filtering
   * @private
   */
  async _searchAllPolls(query, sort, filter) {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const searchPattern = `%${query.trim()}%`;
    let whereConditions = [`(p.title LIKE $1 OR p.description LIKE $2)`];
    
    // Add filter conditions
    if (filter === 'active') {
      whereConditions.push('p.is_active = TRUE AND p.end_date > CURRENT_TIMESTAMP');
    } else if (filter === 'expired') {
      whereConditions.push('p.is_active = TRUE AND p.end_date <= CURRENT_TIMESTAMP');
    } else if (filter === 'deleted') {
      whereConditions.push('p.is_active = FALSE');
    }
    
    const whereClause = whereConditions.join(' AND ');
    const orderClause = this._getOrderClause(sort, 'all');
    
    const sql = `
      SELECT p.*, 
             u.username as creator_username,
             COUNT(DISTINCT v.id) as vote_count,
             MAX(v.voted_at) as last_vote_time
      FROM polls p
      LEFT JOIN users u ON p.created_by = u.id
      LEFT JOIN votes v ON p.id = v.poll_id
      WHERE ${whereClause}
      GROUP BY p.id, p.title, p.description, p.created_by, p.created_at, p.end_date, p.is_active, p.is_deleted, p.vote_threshold, p.is_approved, p.approved_at, p.category, p.poll_type, u.username
      ${orderClause}
      LIMIT 50
    `;

    const results = await this.pollRepository.db.all(sql, [searchPattern, searchPattern]);
    return this._enrichPollResults(results, 'all');
  }

  /**
   * Searches user-specific polls
   * @private
   */
  async _searchUserPolls(query, sort, userId) {
    if (!query || query.trim().length === 0 || !userId) {
      return [];
    }

    const searchPattern = `%${query.trim()}%`;
    const orderClause = this._getOrderClause(sort, 'user');
    
    const sql = `
      SELECT p.*, 
             COUNT(DISTINCT v.id) as vote_count
      FROM polls p
      LEFT JOIN votes v ON p.id = v.poll_id
      WHERE p.created_by = $1 
        AND (p.title LIKE $2 OR p.description LIKE $3)
      GROUP BY p.id, p.title, p.description, p.created_by, p.created_at, p.end_date, p.is_active, p.is_deleted, p.vote_threshold, p.is_approved, p.approved_at, p.category
      ${orderClause}
      LIMIT 20
    `;

    const results = await this.pollRepository.db.all(sql, [userId, searchPattern, searchPattern]);
    return this._enrichPollResults(results, 'user');
  }

  /**
   * Gets homepage polls with optional search, category filtering, and sorting
   * This method provides a simpler interface for homepage-specific searches
   * @param {Object} options - Query options
   * @param {string} options.query - Search query (optional)
   * @param {string} options.sort - Sort method (popular|recent|active)
   * @param {string} options.category - Category filter (optional)
   * @param {number} options.limit - Result limit
   * @returns {Array} Array of polls
   */
  async getHomepagePolls(options = {}) {
    return this.searchPolls({
      ...options,
      context: 'homepage'
    });
  }

  /**
   * Gets search suggestions based on partial query
   * @param {string} query - Partial search query
   * @param {number} limit - Maximum number of suggestions
   * @returns {Array} Search suggestions
   */
  async getSearchSuggestions(query, limit = 5) {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const searchPattern = `%${query.trim()}%`;
    
    const sql = `
      SELECT DISTINCT p.title, p.category
      FROM polls p
      WHERE p.is_active = TRUE 
        AND (p.end_date IS NULL OR p.end_date > CURRENT_TIMESTAMP)
        AND (p.title LIKE $1 OR p.category LIKE $2)
      ORDER BY p.title
      LIMIT $3
    `;

    const results = await this.pollRepository.db.all(sql, [searchPattern, searchPattern, limit]);
    
    // Return both titles and categories as suggestions
    const suggestions = [];
    results.forEach(row => {
      if (row.title && row.title.toLowerCase().includes(query.toLowerCase())) {
        suggestions.push({ type: 'title', text: row.title });
      }
      if (row.category && row.category.toLowerCase().includes(query.toLowerCase()) && 
          !suggestions.some(s => s.text === row.category)) {
        suggestions.push({ type: 'category', text: row.category });
      }
    });

    return suggestions.slice(0, limit);
  }

  /**
   * Gets popular search terms
   * @returns {Array} Popular search terms based on poll titles and categories
   */
  async getPopularSearchTerms() {
    try {
      const sql = `
        SELECT p.category, COUNT(*) as usage_count
        FROM polls p
        WHERE p.is_active = TRUE 
          AND (p.end_date IS NULL OR p.end_date > CURRENT_TIMESTAMP)
          AND p.category IS NOT NULL 
          AND p.category != ''
        GROUP BY p.category
        ORDER BY usage_count DESC, p.category
        LIMIT 10
      `;

      const results = await this.pollRepository.db.all(sql);
      return results.map(row => ({
        term: row.category,
        count: row.usage_count,
        type: 'category'
      }));
    } catch (error) {
      console.error('Error fetching popular search terms:', error);
      return [];
    }
  }

  /**
   * Enriches poll results with additional computed fields
   * @private
   */
  _enrichPollResults(results, context) {
    return results.map(poll => ({
      ...poll,
      hasExpired: new Date(poll.end_date) < new Date(),
      progressPercentage: poll.vote_threshold 
        ? Math.min(100, (poll.vote_count / poll.vote_threshold) * 100)
        : null,
      searchContext: context
    }));
  }

  /**
   * Gets the appropriate ORDER BY clause for different contexts
   * @private
   */
  _getOrderClause(sort, context) {
    switch (context) {
      case 'homepage':
        switch (sort) {
          case 'recent':
            return 'ORDER BY p.created_at DESC';
          case 'active':
            return 'ORDER BY last_vote_time DESC, p.created_at DESC';
          default:
            return 'ORDER BY vote_count DESC, p.created_at DESC';
        }
      case 'all':
        switch (sort) {
          case 'popular':
            return 'ORDER BY vote_count DESC, p.created_at DESC';
          case 'recent':
            return 'ORDER BY p.created_at DESC';
          case 'ending_soon':
            return 'ORDER BY p.end_date ASC';
          default:
            return 'ORDER BY p.created_at DESC';
        }
      case 'user':
        switch (sort) {
          case 'popular':
            return 'ORDER BY vote_count DESC, p.created_at DESC';
          default:
            return 'ORDER BY p.created_at DESC';
        }
      default:
        return 'ORDER BY p.created_at DESC';
    }
  }

  /**
   * Validates and sanitizes search parameters
   * @param {Object} params - Search parameters
   * @returns {Object} Sanitized parameters
   */
  validateSearchParams(params) {
    const { query, sort, filter, context, category, limit } = params;
    
    return {
      query: query ? query.trim().substring(0, 100) : '',
      sort: this._validateSortParam(sort, context),
      filter: this._validateFilterParam(filter),
      context: ['homepage', 'all', 'user'].includes(context) ? context : 'homepage',
      category: category ? category.trim().substring(0, 50) : '',
      limit: this._validateLimitParam(limit)
    };
  }

  /**
   * Validates sort parameter based on context
   * @private
   */
  _validateSortParam(sort, context) {
    const validSorts = {
      homepage: ['popular', 'recent', 'active'],
      all: ['popular', 'recent', 'ending_soon'],
      user: ['popular', 'recent']
    };

    const contextSorts = validSorts[context] || validSorts.homepage;
    return contextSorts.includes(sort) ? sort : contextSorts[0];
  }

  /**
   * Validates filter parameter
   * @private
   */
  _validateFilterParam(filter) {
    const validFilters = ['all', 'active', 'expired', 'deleted'];
    return validFilters.includes(filter) ? filter : 'all';
  }

  /**
   * Validates limit parameter
   * @private
   */
  _validateLimitParam(limit) {
    const parsedLimit = parseInt(limit);
    if (isNaN(parsedLimit) || parsedLimit < 1) {
      return 20; // Default limit
    }
    return Math.min(parsedLimit, 100); // Max limit of 100
  }
}

module.exports = SearchService;