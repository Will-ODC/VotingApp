/**
 * Error Handling Middleware
 * Centralizes error handling across the application
 */

/**
 * Custom application error classes
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message) {
    super(message, 400);
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401);
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

/**
 * Async route handler wrapper
 * Catches errors in async route handlers
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Global error handler middleware
 * Must be the last middleware in the stack
 */
const errorHandler = (err, req, res, next) => {
  // Set default error values
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log error details in development
  if (process.env.NODE_ENV !== 'production') {
    console.error('Error:', {
      message: err.message,
      stack: err.stack,
      statusCode: err.statusCode
    });
  }

  // Handle specific error types
  if (err.name === 'ValidationError') {
    err.statusCode = 400;
    err.message = 'Invalid input data';
  }

  if (err.code === 'SQLITE_CONSTRAINT') {
    err.statusCode = 409;
    err.message = 'Data conflict - this record may already exist';
  }

  // Send error response
  if (req.xhr || req.headers.accept?.includes('application/json')) {
    // JSON response for AJAX requests
    return res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        status: err.statusCode
      }
    });
  }

  // HTML response for regular requests
  res.status(err.statusCode).render('error', {
    message: err.message || 'An error occurred',
    error: process.env.NODE_ENV !== 'production' ? err : {},
    user: req.session?.user || null
  });
};

/**
 * 404 Not Found handler
 * Catches requests that don't match any routes
 */
const notFoundHandler = (req, res, next) => {
  // Ignore favicon requests to reduce noise
  if (req.originalUrl === '/favicon.ico') {
    return res.status(204).end();
  }
  
  const error = new NotFoundError(`Page not found: ${req.originalUrl}`);
  next(error);
};

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  asyncHandler,
  errorHandler,
  notFoundHandler
};