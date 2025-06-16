const { 
  CACHE_TTL_SECONDS, 
  CACHE_MAX_SIZE, 
  CACHE_CLEANUP_INTERVAL 
} = require('../config/constants');

/**
 * CacheService - Simple in-memory cache implementation
 * 
 * Features:
 * - TTL (Time To Live) support for automatic expiration
 * - Memory limit to prevent unbounded growth
 * - LRU-style eviction when memory limit is reached
 * - Automatic cleanup of expired entries
 * - Thread-safe operations
 * 
 * Cache Strategy:
 * - Cache expensive database queries (poll results, user stats)
 * - Invalidate cache when related data changes
 * - Use prefixed keys to organize different data types
 */
class CacheService {
  constructor() {
    this.cache = new Map();
    this.accessOrder = new Map(); // Track access order for LRU
    this.maxSize = CACHE_MAX_SIZE;
    this.defaultTTL = CACHE_TTL_SECONDS * 1000; // Convert to milliseconds
    this.hitCount = 0;
    this.missCount = 0;
    this.startTime = Date.now();
    
    // Start cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, CACHE_CLEANUP_INTERVAL);
    
    // Ensure cleanup happens on process exit
    process.on('SIGINT', () => this.destroy());
    process.on('SIGTERM', () => this.destroy());
  }

  /**
   * Generate a cache key with prefix
   * @param {string} prefix - Cache key prefix from constants
   * @param {string|number} identifier - Unique identifier
   * @param {string} suffix - Optional suffix for additional context
   * @returns {string} Formatted cache key
   */
  generateKey(prefix, identifier, suffix = '') {
    const key = `${prefix}:${identifier}`;
    return suffix ? `${key}:${suffix}` : key;
  }

  /**
   * Get a value from cache
   * @param {string} key - Cache key
   * @returns {*} Cached value or null if not found or expired
   */
  get(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.missCount++;
      return null;
    }
    
    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      this.missCount++;
      return null;
    }
    
    // Update access order for LRU
    this.accessOrder.set(key, Date.now());
    this.hitCount++;
    
    return entry.value;
  }

  /**
   * Set a value in cache
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} ttl - Time to live in seconds (optional, uses default if not provided)
   * @returns {boolean} True if successfully cached
   */
  set(key, value, ttl = null) {
    // Calculate expiration time
    const ttlMs = ttl ? ttl * 1000 : this.defaultTTL;
    const expiresAt = Date.now() + ttlMs;
    
    // Check if we need to evict entries to make room
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }
    
    // Store the entry
    this.cache.set(key, {
      value,
      expiresAt,
      createdAt: Date.now()
    });
    
    // Track access order
    this.accessOrder.set(key, Date.now());
    
    return true;
  }

  /**
   * Delete a specific key from cache
   * @param {string} key - Cache key to delete
   * @returns {boolean} True if key existed and was deleted
   */
  delete(key) {
    const deleted = this.cache.delete(key);
    this.accessOrder.delete(key);
    return deleted;
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.clear();
    this.accessOrder.clear();
  }

  /**
   * Clear cache entries by key prefix
   * @param {string} prefix - Key prefix to match
   */
  clearByPrefix(prefix) {
    const keysToDelete = [];
    
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix + ':')) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => {
      this.cache.delete(key);
      this.accessOrder.delete(key);
    });
    
    return keysToDelete.length;
  }

  /**
   * Get or set a cached value (useful for caching expensive operations)
   * @param {string} key - Cache key
   * @param {Function} valueFactory - Async function to generate value if not cached
   * @param {number} ttl - Time to live in seconds (optional)
   * @returns {Promise<*>} Cached or generated value
   */
  async getOrSet(key, valueFactory, ttl = null) {
    // Try to get from cache first
    const cachedValue = this.get(key);
    if (cachedValue !== null) {
      return cachedValue;
    }
    
    // Generate new value
    const value = await valueFactory();
    
    // Cache the result
    this.set(key, value, ttl);
    
    return value;
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache performance statistics
   */
  getStats() {
    const now = Date.now();
    let expiredCount = 0;
    let totalSize = 0;
    let keysByType = {};
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        expiredCount++;
      }
      // Rough estimate of memory usage
      totalSize += JSON.stringify(entry.value).length;
      
      // Count keys by type (prefix)
      const keyType = key.split(':')[0];
      keysByType[keyType] = (keysByType[keyType] || 0) + 1;
    }
    
    return {
      totalEntries: this.cache.size,
      expiredEntries: expiredCount,
      maxSize: this.maxSize,
      estimatedMemoryKB: Math.round(totalSize / 1024),
      hitRate: this.hitCount / Math.max(1, this.hitCount + this.missCount),
      hits: this.hitCount || 0,
      misses: this.missCount || 0,
      keysByType,
      uptime: Date.now() - (this.startTime || Date.now())
    };
  }

  /**
   * Remove expired entries from cache
   * @returns {number} Number of entries removed
   */
  cleanup() {
    const now = Date.now();
    const keysToDelete = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => {
      this.cache.delete(key);
      this.accessOrder.delete(key);
    });
    
    return keysToDelete.length;
  }

  /**
   * Evict least recently used entry to make room
   * @returns {boolean} True if an entry was evicted
   */
  evictLRU() {
    if (this.accessOrder.size === 0) {
      return false;
    }
    
    // Find the least recently accessed key
    let oldestKey = null;
    let oldestTime = Date.now();
    
    for (const [key, accessTime] of this.accessOrder.entries()) {
      if (accessTime < oldestTime) {
        oldestTime = accessTime;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.accessOrder.delete(oldestKey);
      return true;
    }
    
    return false;
  }

  /**
   * Check if cache contains a key (without affecting LRU order)
   * @param {string} key - Cache key
   * @returns {boolean} True if key exists and is not expired
   */
  has(key) {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Get cache size
   * @returns {number} Number of entries in cache
   */
  size() {
    return this.cache.size;
  }

  /**
   * Destroy the cache service and cleanup resources
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
}

// Export singleton instance
const cacheService = new CacheService();
module.exports = cacheService;