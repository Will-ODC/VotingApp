const { 
  MIN_PASSWORD_LENGTH,
  MAX_USERNAME_LENGTH,
  MAX_EMAIL_LENGTH,
  MAX_POLL_TITLE_LENGTH,
  MAX_POLL_DESCRIPTION_LENGTH,
  MAX_OPTION_LENGTH,
  MIN_POLL_OPTIONS,
  MAX_POLL_OPTIONS
} = require('../config/constants');

/**
 * Validation schemas for request data
 * Centralizes validation rules and error messages
 */

const userSchemas = {
  register: {
    username: {
      required: true,
      type: 'string',
      maxLength: MAX_USERNAME_LENGTH,
      pattern: /^[a-zA-Z0-9_]+$/,
      message: 'Username must contain only letters, numbers, and underscores'
    },
    email: {
      required: true,
      type: 'string',
      maxLength: MAX_EMAIL_LENGTH,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: 'Invalid email format'
    },
    password: {
      required: true,
      type: 'string',
      minLength: MIN_PASSWORD_LENGTH,
      message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
    }
  },
  
  login: {
    username: {
      required: true,
      type: 'string'
    },
    password: {
      required: true,
      type: 'string'
    }
  },

  changePassword: {
    currentPassword: {
      required: true,
      type: 'string'
    },
    newPassword: {
      required: true,
      type: 'string',
      minLength: MIN_PASSWORD_LENGTH,
      message: `New password must be at least ${MIN_PASSWORD_LENGTH} characters`
    }
  }
};

const pollSchemas = {
  create: {
    title: {
      required: true,
      type: 'string',
      maxLength: MAX_POLL_TITLE_LENGTH,
      message: `Title must not exceed ${MAX_POLL_TITLE_LENGTH} characters`
    },
    description: {
      required: false,
      type: 'string',
      maxLength: MAX_POLL_DESCRIPTION_LENGTH,
      message: `Description must not exceed ${MAX_POLL_DESCRIPTION_LENGTH} characters`
    },
    options: {
      required: true,
      type: 'array',
      minLength: MIN_POLL_OPTIONS,
      maxLength: MAX_POLL_OPTIONS,
      itemMaxLength: MAX_OPTION_LENGTH,
      message: `Must have between ${MIN_POLL_OPTIONS} and ${MAX_POLL_OPTIONS} options`
    },
    endDate: {
      required: false,
      type: 'date',
      futureOnly: true,
      message: 'End date must be in the future'
    },
    voteThreshold: {
      required: false,
      type: 'number',
      min: 1,
      message: 'Vote threshold must be at least 1'
    },
    category: {
      required: false,
      type: 'string',
      maxLength: 50,
      message: 'Category must not exceed 50 characters'
    },
    poll_type: {
      required: false,
      type: 'string',
      maxLength: 20,
      message: 'Poll type must not exceed 20 characters'
    }
  },

  vote: {
    optionId: {
      required: true,
      type: 'number',
      message: 'Please select an option'
    }
  }
};

/**
 * Validates data against a schema
 */
function validate(data, schema) {
  const errors = [];

  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];

    // Required check
    if (rules.required && (!value || (typeof value === 'string' && !value.trim()))) {
      errors.push(`${field} is required`);
      continue;
    }

    // Skip further validation if not required and no value
    if (!value && !rules.required) continue;

    // Type check
    if (rules.type === 'array' && !Array.isArray(value)) {
      errors.push(`${field} must be an array`);
      continue;
    }

    if (rules.type === 'string' && typeof value !== 'string') {
      errors.push(`${field} must be a string`);
      continue;
    }

    if (rules.type === 'number' && (typeof value !== 'number' || isNaN(value))) {
      errors.push(`${field} must be a number`);
      continue;
    }

    // String validations
    if (rules.type === 'string') {
      if (rules.minLength && value.length < rules.minLength) {
        errors.push(rules.message || `${field} must be at least ${rules.minLength} characters`);
      }

      if (rules.maxLength && value.length > rules.maxLength) {
        errors.push(rules.message || `${field} must not exceed ${rules.maxLength} characters`);
      }

      if (rules.pattern && !rules.pattern.test(value)) {
        errors.push(rules.message || `${field} has invalid format`);
      }
    }

    // Array validations
    if (rules.type === 'array') {
      const validItems = value.filter(item => item && item.toString().trim());
      
      if (rules.minLength && validItems.length < rules.minLength) {
        errors.push(rules.message || `${field} must have at least ${rules.minLength} items`);
      }

      if (rules.maxLength && validItems.length > rules.maxLength) {
        errors.push(rules.message || `${field} must not exceed ${rules.maxLength} items`);
      }

      if (rules.itemMaxLength) {
        validItems.forEach((item, index) => {
          if (item.length > rules.itemMaxLength) {
            errors.push(`${field}[${index}] must not exceed ${rules.itemMaxLength} characters`);
          }
        });
      }
    }

    // Number validations
    if (rules.type === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        errors.push(rules.message || `${field} must be at least ${rules.min}`);
      }

      if (rules.max !== undefined && value > rules.max) {
        errors.push(rules.message || `${field} must not exceed ${rules.max}`);
      }
    }

    // Date validations
    if (rules.type === 'date') {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        errors.push(`${field} must be a valid date`);
      } else if (rules.futureOnly && date <= new Date()) {
        errors.push(rules.message || `${field} must be in the future`);
      }
    }
  }

  return errors;
}

module.exports = {
  userSchemas,
  pollSchemas,
  validate
};