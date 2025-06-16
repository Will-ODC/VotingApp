const crypto = require('crypto');
const { 
  MIN_PASSWORD_LENGTH, 
  MAX_USERNAME_LENGTH, 
  MAX_EMAIL_LENGTH,
  CACHE_KEYS 
} = require('../config/constants');
const cacheService = require('./CacheService');

/**
 * UserService handles all user-related business logic
 * Extracted from auth routes to follow Single Responsibility Principle
 */
class UserService {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  /**
   * Validates user registration data
   */
  validateRegistration(username, email, password) {
    const errors = [];

    if (!username || username.trim().length === 0) {
      errors.push('Username is required');
    } else if (username.length > MAX_USERNAME_LENGTH) {
      errors.push(`Username too long (max ${MAX_USERNAME_LENGTH} characters)`);
    }

    if (!email || email.trim().length === 0) {
      errors.push('Email is required');
    } else if (!this.isValidEmail(email)) {
      errors.push('Invalid email format');
    } else if (email.length > MAX_EMAIL_LENGTH) {
      errors.push(`Email too long (max ${MAX_EMAIL_LENGTH} characters)`);
    }

    if (!password || password.length < MIN_PASSWORD_LENGTH) {
      errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
    }

    return errors;
  }

  /**
   * Validates email format
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Hashes a password
   */
  hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  /**
   * Registers a new user
   */
  async register(username, email, password) {
    // Validate input
    const errors = this.validateRegistration(username, email, password);
    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }

    // Check if username exists
    const existingUser = await this.userRepository.findByUsername(username);
    if (existingUser) {
      throw new Error('Username already exists');
    }

    // Check if email exists
    const existingEmail = await this.userRepository.findByEmail(email);
    if (existingEmail) {
      throw new Error('Email already registered');
    }

    // Hash password and create user
    const hashedPassword = this.hashPassword(password);
    const user = await this.userRepository.create({
      username,
      email,
      password: hashedPassword
    });

    return user;
  }

  /**
   * Authenticates a user
   */
  async authenticate(username, password) {
    if (!username || !password) {
      throw new Error('Username and password are required');
    }

    const user = await this.userRepository.findByUsername(username);
    if (!user) {
      throw new Error('Invalid username or password');
    }

    const hashedPassword = this.hashPassword(password);
    if (hashedPassword !== user.password) {
      throw new Error('Invalid username or password');
    }

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Changes user password
   */
  async changePassword(userId, currentPassword, newPassword) {
    if (!newPassword || newPassword.length < MIN_PASSWORD_LENGTH) {
      throw new Error(`New password must be at least ${MIN_PASSWORD_LENGTH} characters`);
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const hashedCurrentPassword = this.hashPassword(currentPassword);
    if (hashedCurrentPassword !== user.password) {
      throw new Error('Current password is incorrect');
    }

    const hashedNewPassword = this.hashPassword(newPassword);
    await this.userRepository.updatePassword(userId, hashedNewPassword);

    // Invalidate user cache after password change
    this.invalidateUserCache(userId);

    return true;
  }

  /**
   * Gets user profile information
   */
  async getProfile(userId) {
    const cacheKey = cacheService.generateKey(CACHE_KEYS.USER_PROFILE, userId);
    
    return await cacheService.getOrSet(cacheKey, async () => {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Return user without password
      const { password, ...profile } = user;
      return profile;
    }, 600); // Cache for 10 minutes - user profile changes infrequently
  }

  /**
   * Invalidates cache entries related to a specific user
   * @param {number} userId - The user ID
   */
  invalidateUserCache(userId) {
    // Clear user profile cache
    const profileCacheKey = cacheService.generateKey(CACHE_KEYS.USER_PROFILE, userId);
    cacheService.delete(profileCacheKey);
    
    // Clear user statistics cache
    const statsCacheKey = cacheService.generateKey(CACHE_KEYS.USER_STATS, userId);
    cacheService.delete(statsCacheKey);
  }

  /**
   * Gets user statistics (voting history, created polls, etc.)
   * This method can be added when profile statistics are needed
   * @param {number} userId - The user ID
   * @returns {Object} User statistics
   */
  async getUserStats(userId) {
    const cacheKey = cacheService.generateKey(CACHE_KEYS.USER_STATS, userId);
    
    return await cacheService.getOrSet(cacheKey, async () => {
      // This would implement the actual statistics gathering
      // For now, return basic structure that can be expanded
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // TODO: Implement actual statistics queries
      // This is a placeholder for future implementation
      return {
        userId: userId,
        pollsCreated: 0,
        votesCount: 0,
        joinedDate: user.created_at,
        lastActive: user.updated_at || user.created_at
      };
    }, 300); // Cache for 5 minutes - stats may change more frequently
  }
}

module.exports = UserService;