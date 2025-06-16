/**
 * Cache monitoring utilities
 * Provides functions to monitor and manage cache performance
 */
const cacheService = require('../services/CacheService');

/**
 * Get detailed cache performance report
 * @returns {Object} Comprehensive cache statistics
 */
function getCacheReport() {
  const stats = cacheService.getStats();
  
  return {
    ...stats,
    performance: {
      hitRatePercentage: (stats.hitRate * 100).toFixed(1) + '%',
      totalRequests: stats.hits + stats.misses,
      averageMemoryPerEntry: stats.totalEntries > 0 
        ? (stats.estimatedMemoryKB / stats.totalEntries).toFixed(2) + ' KB'
        : '0 KB',
      memoryEfficiency: stats.totalEntries > 0 
        ? (stats.totalEntries / stats.maxSize * 100).toFixed(1) + '%'
        : '0%',
      upTimeHours: (stats.uptime / (1000 * 60 * 60)).toFixed(1)
    },
    recommendations: generateRecommendations(stats)
  };
}

/**
 * Generate performance recommendations based on cache statistics
 * @param {Object} stats - Cache statistics
 * @returns {Array<string>} Array of recommendation strings
 */
function generateRecommendations(stats) {
  const recommendations = [];
  
  // Hit rate recommendations
  if (stats.hitRate < 0.5) {
    recommendations.push('Low hit rate (<50%) - consider increasing TTL values or reviewing cache strategy');
  } else if (stats.hitRate > 0.9) {
    recommendations.push('Very high hit rate (>90%) - cache is performing excellently');
  }
  
  // Memory usage recommendations
  const memoryUsageMB = stats.estimatedMemoryKB / 1024;
  if (memoryUsageMB > 100) {
    recommendations.push('High memory usage (>100MB) - consider reducing TTL or implementing more aggressive cleanup');
  }
  
  // Entry count recommendations
  const utilizationRate = stats.totalEntries / stats.maxSize;
  if (utilizationRate > 0.8) {
    recommendations.push('High cache utilization (>80%) - consider increasing max cache size');
  } else if (utilizationRate < 0.1 && stats.totalEntries > 10) {
    recommendations.push('Low cache utilization - current max size may be too high');
  }
  
  // Expired entries recommendations
  if (stats.expiredEntries > stats.totalEntries * 0.1) {
    recommendations.push('Many expired entries detected - consider running cache cleanup more frequently');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Cache performance looks good - no immediate optimizations needed');
  }
  
  return recommendations;
}

/**
 * Clear cache by category
 * @param {string} category - Cache category to clear (poll, user, etc.)
 * @returns {Object} Result of clear operation
 */
function clearCacheByCategory(category) {
  const beforeCount = cacheService.size();
  let clearedCount = 0;
  
  switch (category.toLowerCase()) {
    case 'poll':
    case 'polls':
      clearedCount += cacheService.clearByPrefix('poll_display');
      clearedCount += cacheService.clearByPrefix('active_polls');
      clearedCount += cacheService.clearByPrefix('poll_results');
      break;
      
    case 'user':
    case 'users':
      clearedCount += cacheService.clearByPrefix('user_profile');
      clearedCount += cacheService.clearByPrefix('user_stats');
      break;
      
    case 'all':
      cacheService.clear();
      clearedCount = beforeCount;
      break;
      
    default:
      throw new Error(`Unknown cache category: ${category}`);
  }
  
  const afterCount = cacheService.size();
  
  return {
    category,
    beforeCount,
    afterCount,
    clearedCount,
    success: true
  };
}

/**
 * Perform cache maintenance operations
 * @returns {Object} Maintenance results
 */
function performMaintenance() {
  const beforeStats = cacheService.getStats();
  
  // Run cleanup to remove expired entries
  const expiredRemoved = cacheService.cleanup();
  
  const afterStats = cacheService.getStats();
  
  return {
    expiredEntriesRemoved: expiredRemoved,
    beforeEntries: beforeStats.totalEntries,
    afterEntries: afterStats.totalEntries,
    memoryFreedKB: beforeStats.estimatedMemoryKB - afterStats.estimatedMemoryKB,
    timestamp: new Date().toISOString()
  };
}

/**
 * Get cache health status
 * @returns {Object} Health status with color coding
 */
function getHealthStatus() {
  const stats = cacheService.getStats();
  
  let status = 'healthy';
  let color = 'green';
  const issues = [];
  
  // Check hit rate
  if (stats.hitRate < 0.3) {
    status = 'warning';
    color = 'yellow';
    issues.push('Low hit rate');
  }
  
  // Check memory usage
  if (stats.estimatedMemoryKB > 500 * 1024) { // 500MB
    status = 'critical';
    color = 'red';
    issues.push('High memory usage');
  }
  
  // Check utilization
  if (stats.totalEntries / stats.maxSize > 0.95) {
    status = 'warning';
    color = 'yellow';
    issues.push('Near capacity');
  }
  
  return {
    status,
    color,
    issues,
    summary: issues.length > 0 
      ? `Cache has ${issues.length} issue(s): ${issues.join(', ')}`
      : 'Cache is operating normally'
  };
}

module.exports = {
  getCacheReport,
  clearCacheByCategory,
  performMaintenance,
  getHealthStatus,
  generateRecommendations
};