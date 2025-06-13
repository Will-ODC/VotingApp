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
    // First, check if user has already voted on this poll
    const existingVoteQuery = `
      SELECT v.id 
      FROM votes v
      JOIN options o ON v.option_id = o.id
      WHERE v.user_id = $1 AND o.poll_id = (
        SELECT poll_id FROM options WHERE id = $2
      )
    `;
    
    const existingVote = await this.db.get(existingVoteQuery, [userId, optionId]);

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
        INSERT INTO votes (user_id, option_id, voted_at) 
        VALUES ($1, $2, CURRENT_TIMESTAMP)
      `;
      await this.db.run(insertQuery, [userId, optionId]);
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
}

module.exports = VoteRepository;