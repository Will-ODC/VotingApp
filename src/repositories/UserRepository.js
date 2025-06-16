/**
 * UserRepository handles all user-related database operations
 * Implements Repository pattern to abstract data access
 */
class UserRepository {
  constructor(database) {
    this.db = database;
  }

  /**
   * Find user by ID
   */
  async findById(id) {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await this.db.get(query, [id]);
    return result;
  }

  /**
   * Find user by username
   */
  async findByUsername(username) {
    const query = 'SELECT * FROM users WHERE username = $1';
    const result = await this.db.get(query, [username]);
    return result;
  }

  /**
   * Find user by email
   */
  async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await this.db.get(query, [email]);
    return result;
  }

  /**
   * Create a new user
   */
  async create(userData) {
    const { username, email, password } = userData;
    const query = `
      INSERT INTO users (username, email, password, created_at) 
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP) 
      RETURNING id, username, email, created_at
    `;
    const result = await this.db.run(query, [username, email, password]);
    return result;
  }

  /**
   * Update user password
   */
  async updatePassword(userId, hashedPassword) {
    const query = 'UPDATE users SET password = $1 WHERE id = $2';
    await this.db.run(query, [hashedPassword, userId]);
    return true;
  }

  /**
   * Get user statistics
   */
  async getUserStats(userId) {
    const pollCountQuery = 'SELECT COUNT(*) as count FROM polls WHERE created_by = $1';
    const voteCountQuery = 'SELECT COUNT(*) as count FROM votes WHERE user_id = $1';
    
    const [pollResult, voteResult] = await Promise.all([
      this.db.get(pollCountQuery, [userId]),
      this.db.get(voteCountQuery, [userId])
    ]);

    return {
      pollsCreated: pollResult?.count || 0,
      votesSubmitted: voteResult?.count || 0
    };
  }
}

module.exports = UserRepository;