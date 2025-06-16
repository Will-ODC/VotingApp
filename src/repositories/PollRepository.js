/**
 * PollRepository handles all poll-related database operations
 * Implements Repository pattern to abstract data access
 */
class PollRepository {
  constructor(database) {
    this.db = database;
  }

  /**
   * Creates a new poll with options
   */
  async create(pollData) {
    const { title, description, creatorId, endDate, voteThreshold, category, pollType, options } = pollData;
    
    // Insert poll
    const pollQuery = `
      INSERT INTO polls (title, description, created_by, end_date, vote_threshold, category, poll_type, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      RETURNING id, title, description, created_by, end_date, vote_threshold, category, poll_type, is_approved, created_at
    `;
    
    const poll = await this.db.run(pollQuery, [
      title, 
      description, 
      creatorId, 
      endDate, 
      voteThreshold,
      category,
      pollType
    ]);

    // Insert options
    if (options && options.length > 0) {
      const optionPromises = options.map((optionText, index) => {
        const optionQuery = `
          INSERT INTO options (poll_id, option_text)
          VALUES ($1, $2)
          RETURNING id, option_text
        `;
        return this.db.run(optionQuery, [poll.id, optionText]);
      });
      
      poll.options = await Promise.all(optionPromises);
    }

    return poll;
  }

  /**
   * Finds a poll by ID with its options and vote counts
   */
  async findById(pollId) {
    const pollQuery = `
      SELECT 
        p.*,
        u.username as creator_username,
        COALESCE(SUM(o.vote_count), 0) as total_votes
      FROM polls p
      LEFT JOIN users u ON p.created_by = u.id
      LEFT JOIN (
        SELECT o.poll_id, COUNT(*) as vote_count
        FROM options o
        INNER JOIN votes v ON o.id = v.option_id
        WHERE o.poll_id = $1
        GROUP BY o.poll_id
      ) o ON p.id = o.poll_id
      WHERE p.id = $1
      GROUP BY p.id, u.username
    `;
    
    const poll = await this.db.get(pollQuery, [pollId]);
    if (!poll) return null;

    // Get options with vote counts
    const optionsQuery = `
      SELECT 
        o.id,
        o.option_text,
        COUNT(v.id) as vote_count
      FROM options o
      LEFT JOIN votes v ON o.id = v.option_id
      WHERE o.poll_id = $1
      GROUP BY o.id, o.option_text
      ORDER BY o.id
    `;
    
    poll.options = await this.db.all(optionsQuery, [pollId]);
    poll.total_votes = poll.options.reduce((sum, opt) => sum + parseInt(opt.vote_count, 10), 0);
    
    return poll;
  }

  /**
   * Finds active polls with filtering and sorting
   */
  async findActive({ search, sort, limit, offset }) {
    let query = `
      SELECT 
        p.*,
        u.username as creator_username,
        COUNT(DISTINCT v.id) as total_votes
      FROM polls p
      LEFT JOIN users u ON p.created_by = u.id
      LEFT JOIN options o ON p.id = o.poll_id
      LEFT JOIN votes v ON o.id = v.option_id
      WHERE p.is_active = TRUE 
        AND p.is_deleted = FALSE 
        AND p.end_date > CURRENT_TIMESTAMP
    `;
    
    const params = [];
    let paramIndex = 1;

    if (search) {
      query += ` AND (p.title ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ' GROUP BY p.id, u.username';

    // Sorting
    switch (sort) {
      case 'popular':
        query += ' ORDER BY total_votes DESC, p.created_at DESC';
        break;
      case 'recent':
        query += ' ORDER BY p.created_at DESC';
        break;
      case 'ending_soon':
        query += ' ORDER BY p.end_date ASC';
        break;
      default:
        query += ' ORDER BY total_votes DESC';
    }

    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const polls = await this.db.all(query, params);
    return polls;
  }

  /**
   * Finds all polls with filtering
   */
  async findAll({ search, status, sort, limit, offset }) {
    let query = `
      SELECT 
        p.*,
        u.username as creator_username,
        COUNT(DISTINCT v.id) as total_votes
      FROM polls p
      LEFT JOIN users u ON p.created_by = u.id
      LEFT JOIN options o ON p.id = o.poll_id
      LEFT JOIN votes v ON o.id = v.option_id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;

    // Status filter
    switch (status) {
      case 'active':
        query += ' AND p.is_active = TRUE AND p.is_deleted = FALSE AND p.end_date > CURRENT_TIMESTAMP';
        break;
      case 'expired':
        query += ' AND p.is_active = TRUE AND p.is_deleted = FALSE AND p.end_date <= CURRENT_TIMESTAMP';
        break;
      case 'deleted':
        query += ' AND (p.is_active = FALSE OR p.is_deleted = TRUE)';
        break;
      // 'all' - no additional filter
    }

    if (search) {
      query += ` AND (p.title ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ' GROUP BY p.id, u.username';

    // Sorting
    switch (sort) {
      case 'popular':
        query += ' ORDER BY total_votes DESC';
        break;
      case 'oldest':
        query += ' ORDER BY p.created_at ASC';
        break;
      default:
        query += ' ORDER BY p.created_at DESC';
    }

    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const polls = await this.db.all(query, params);
    return polls;
  }

  /**
   * Finds all polls with custom where conditions and status calculation
   * Used for the browse polls view with complex filtering
   */
  async findAllWithStatus({ whereConditions, search, orderClause }) {
    // Build WHERE clause
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Build query params for search
    let queryParams = [];
    let searchCondition = '';
    
    if (search && search.trim()) {
      const searchPattern = `%${search.trim()}%`;
      queryParams = [searchPattern, searchPattern];
      searchCondition = whereConditions.length > 0 ? ' AND ' : ' WHERE ';
      searchCondition += '(p.title LIKE $1 OR p.description LIKE $2)';
    }

    const query = `
      SELECT p.id, p.title, p.description, p.created_at, p.end_date, p.is_active, 
             p.vote_threshold, p.is_approved, p.category, p.poll_type,
             u.username as creator_name, COUNT(DISTINCT v.id) as vote_count,
             CASE 
                WHEN p.end_date > CURRENT_TIMESTAMP AND p.is_active = TRUE THEN 'active'
                WHEN p.end_date <= CURRENT_TIMESTAMP AND p.is_active = TRUE THEN 'expired'
                ELSE 'deleted'
             END as status
      FROM polls p 
      JOIN users u ON p.created_by = u.id 
      LEFT JOIN options o ON p.id = o.poll_id
      LEFT JOIN votes v ON o.id = v.option_id
      ${whereClause}${searchCondition}
      GROUP BY p.id, p.title, p.description, p.created_at, p.end_date, p.is_active, 
               p.vote_threshold, p.is_approved, p.category, p.poll_type, u.username
      ${orderClause}
    `;

    const polls = await this.db.all(query, queryParams);
    return polls;
  }

  /**
   * Finds polls created by a specific user
   */
  async findByCreatorId(creatorId, limit, offset) {
    const query = `
      SELECT 
        p.*,
        COUNT(DISTINCT v.id) as total_votes
      FROM polls p
      LEFT JOIN options o ON p.id = o.poll_id
      LEFT JOIN votes v ON o.id = v.option_id
      WHERE p.created_by = $1
      GROUP BY p.id
      ORDER BY p.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const polls = await this.db.all(query, [creatorId, limit, offset]);
    return polls;
  }

  /**
   * Marks a poll as approved
   */
  async markAsApproved(pollId) {
    const query = `
      UPDATE polls 
      SET is_approved = TRUE, approved_at = CURRENT_TIMESTAMP 
      WHERE id = $1
    `;
    await this.db.run(query, [pollId]);
  }

  /**
   * Soft deletes a poll
   */
  async softDelete(pollId) {
    const query = 'UPDATE polls SET is_deleted = TRUE, is_active = FALSE WHERE id = $1';
    await this.db.run(query, [pollId]);
  }

  /**
   * Counts total polls by creator
   */
  async countByCreatorId(creatorId) {
    const query = 'SELECT COUNT(*) as count FROM polls WHERE created_by = $1';
    const result = await this.db.get(query, [creatorId]);
    return result?.count || 0;
  }

  /**
   * Gets a specific option by ID
   */
  async getOption(optionId) {
    const query = 'SELECT * FROM options WHERE id = $1';
    const option = await this.db.get(query, [optionId]);
    return option;
  }

  /**
   * Gets total vote count for a poll
   */
  async getTotalVotes(pollId) {
    const query = `
      SELECT COUNT(DISTINCT v.id) as count 
      FROM votes v
      JOIN options o ON v.option_id = o.id
      WHERE o.poll_id = $1
    `;
    const result = await this.db.get(query, [pollId]);
    return result?.count || 0;
  }
}

module.exports = PollRepository;