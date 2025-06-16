const { validate } = require('../validators/schemas');

/**
 * Validation middleware factory
 * Creates middleware that validates request body against a schema
 */
function validateRequest(schema) {
  return (req, res, next) => {
    const errors = validate(req.body, schema);
    
    if (errors.length > 0) {
      // For AJAX requests, return JSON error
      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(400).json({ 
          success: false, 
          errors 
        });
      }
      
      // For regular requests, flash errors and redirect back
      req.flash('error', errors.join('. '));
      return res.redirect('back');
    }
    
    next();
  };
}

/**
 * Sanitizes request body
 * Trims strings and removes empty values
 */
function sanitizeRequest(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].trim();
      }
      
      // Convert numeric strings to numbers for specific fields
      if (['voteThreshold', 'vote_threshold', 'optionId'].includes(key) && req.body[key]) {
        const num = parseInt(req.body[key], 10);
        if (!isNaN(num)) {
          req.body[key] = num;
        }
      }
      
      // Handle snake_case to camelCase conversion for specific fields
      if (key === 'vote_threshold' && req.body[key] !== undefined) {
        req.body.voteThreshold = req.body[key];
        delete req.body[key];
      }
      if (key === 'end_date' && req.body[key] !== undefined) {
        req.body.endDate = req.body[key];
        delete req.body[key];
      }
      if (key === 'poll_type' && req.body[key] !== undefined) {
        req.body.pollType = req.body[key];
        delete req.body[key];
      }
    });
  }
  
  next();
}

/**
 * Validates query parameters
 */
function validateQuery(rules) {
  return (req, res, next) => {
    const errors = [];
    
    Object.entries(rules).forEach(([param, rule]) => {
      const value = req.query[param];
      
      if (rule.type === 'number' && value !== undefined) {
        const num = parseInt(value, 10);
        if (isNaN(num)) {
          errors.push(`${param} must be a number`);
        } else {
          req.query[param] = num;
        }
      }
      
      if (rule.enum && value && !rule.enum.includes(value)) {
        errors.push(`${param} must be one of: ${rule.enum.join(', ')}`);
      }
    });
    
    if (errors.length > 0) {
      return res.status(400).render('error', { 
        message: 'Invalid request parameters',
        error: errors.join('. ')
      });
    }
    
    next();
  };
}

module.exports = {
  validateRequest,
  sanitizeRequest,
  validateQuery
};