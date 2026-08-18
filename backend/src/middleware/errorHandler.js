/**
 * Centralized express error handler middleware.
 */
function errorHandler(err, req, res, next) {
  console.error('Error occurred in request:', err);

  // Check for custom application errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: err.message || 'Validation failed',
      errors: err.errors || [],
    });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      message: err.message || 'Authentication failed',
    });
  }

  if (err.name === 'ForbiddenError') {
    return res.status(403).json({
      success: false,
      message: err.message || 'Access denied',
    });
  }

  if (err.name === 'NotFoundError') {
    return res.status(404).json({
      success: false,
      message: err.message || 'Record not found',
    });
  }

  if (err.name === 'ConflictError') {
    return res.status(409).json({
      success: false,
      message: err.message || 'Record conflict or duplicate',
    });
  }

  // Prisma unique constraint validation errors (P2002)
  if (err.code === 'P2002') {
    const fields = err.meta?.target || [];
    return res.status(409).json({
      success: false,
      message: `A record already exists with this unique value: ${fields.join(', ')}`,
    });
  }

  // Zod schema validation errors
  if (err.name === 'ZodError') {
    const formattedErrors = err.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formattedErrors,
    });
  }

  // Default server error
  return res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
}

// Custom error classes
class ValidationError extends Error {
  constructor(message, errors = []) {
    super(message);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

class UnauthorizedError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

class ForbiddenError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
  }
}

class ConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConflictError';
  }
}

module.exports = {
  errorHandler,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
};
