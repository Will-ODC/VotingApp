/**
 * VoteRepository handles all vote-related database operations
 * Implements Repository pattern to abstract data access
 */
class VoteRepository {
  constructor(database) {
    this.db = database;
  }

  /**
   * Creates or updates a user's vote
   */
  async createOrUpdate(userId, optionId) {
    // Get the poll_id for this option
    const optionQuery = 'SELECT poll_id FROM options WHERE id = $1';
    const option = await this.db.get(optionQuery, [optionId]);
    
    if (!option) {
      throw new Error('Option not found');
    }
    
    const pollId = option.poll_id;

    // First, check if user has already voted on this poll
    const existingVoteQuery = `
      SELECT v.id 
      FROM votes v
      WHERE v.user_id = $1 AND v.poll_id = $2
    `;
    
    const existingVote = await this.db.get(existingVoteQuery, [userId, pollId]);

    if (existingVote) {
      // Update existing vote
      const updateQuery = `
        UPDATE votes 
        SET option_id = $1, voted_at = CURRENT_TIMESTAMP 
        WHERE id = $2
      `;
      await this.db.run(updateQuery, [optionId, existingVote.id]);
    } else {
      // Create new vote
      const insertQuery = `
        INSERT INTO votes (user_id, poll_id, option_id, voted_at) 
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      `;
      await this.db.run(insertQuery, [userId, pollId, optionId]);
    }
  }

  /**
   * Finds a user's vote for a specific poll
   */
  async findUserVoteForPoll(userId, pollId) {
    const query = `
      SELECT v.*, o.option_text, o.id as option_id
      FROM votes v
      JOIN options o ON v.option_id = o.id
      WHERE v.user_id = $1 AND o.poll_id = $2
    `;
    
    const vote = await this.db.get(query, [userId, pollId]);
    return vote;
  }

  /**
   * Gets user's voting history with pagination
   */
  async getUserVotingHistory(userId, limit, offset) {
    const query = `
      SELECT 
        v.voted_at,
        o.option_text,
        p.id as poll_id,
        p.title as poll_title,
        p.end_date,
        p.is_deleted,
        p.vote_threshold,
        p.is_approved,
        (SELECT COUNT(*) FROM votes v2 
         JOIN options o2 ON v2.option_id = o2.id 
         WHERE o2.poll_id = p.id) as total_votes
      FROM votes v
      JOIN options o ON v.option_id = o.id
      JOIN polls p ON o.poll_id = p.id
      WHERE v.user_id = $1
      ORDER BY v.voted_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const votes = await this.db.all(query, [userId, limit, offset]);
    return votes;
  }

  /**
   * Counts total votes by a user
   */
  async countByUserId(userId) {
    const query = 'SELECT COUNT(*) as count FROM votes WHERE user_id = $1';
    const result = await this.db.get(query, [userId]);
    return result?.count || 0;
  }

  /**
   * Gets vote count for a specific option
   */
  async getOptionVoteCount(optionId) {
    const query = 'SELECT COUNT(*) as count FROM votes WHERE option_id = $1';
    const result = await this.db.get(query, [optionId]);
    return result?.count || 0;
  }

  /**
   * Gets all votes for a poll
   */
  async getPollVotes(pollId) {
    const query = `
      SELECT 
        v.*,
        u.username,
        o.option_text
      FROM votes v
      JOIN users u ON v.user_id = u.id
      JOIN options o ON v.option_id = o.id
      WHERE o.poll_id = $1
      ORDER BY v.voted_at DESC
    `;
    
    const votes = await this.db.all(query, [pollId]);
    return votes;
  }

  /**
   * Gets detailed voting history for a user with poll status and creator information
   * Used for profile page with complex JOIN operations and status calculations
   */
  async getDetailedVotingHistory(userId, limit, offset) {
    const query = `
      SELECT p.id, p.title, p.description, p.created_at, p.end_date, p.is_active, p.vote_threshold, p.is_approved,
             o.option_text as voted_option, v.voted_at,
             COUNT(DISTINCT v2.id) as total_votes,
             CASE 
                WHEN p.end_date > CURRENT_TIMESTAMP AND p.is_active = TRUE THEN 'active'
                WHEN p.end_date <= CURRENT_TIMESTAMP AND p.is_active = TRUE THEN 'expired'
                ELSE 'deleted'
             END as poll_status,
             u.username as creator_name
             FROM votes v
             JOIN polls p ON v.poll_id = p.id
             JOIN options o ON v.option_id = o.id
             JOIN users u ON p.created_by = u.id
             LEFT JOIN votes v2 ON p.id = v2.poll_id
             WHERE v.user_id = $1
             GROUP BY p.id, p.title, p.description, p.created_at, p.end_date, p.is_active, p.vote_threshold, p.is_approved, 
                      o.option_text, v.voted_at, u.username, v.id
             ORDER BY v.voted_at DESC
             LIMIT $2 OFFSET $3
    `;
    
    const votes = await this.db.all(query, [userId, limit, offset]);
    return votes;
  }
}

module.exports = VoteRepository;