const { logger } = require('./logger');

const errorHandler = (err, req, res, next) => {
    const requestId = req.requestId || 'unknown';

    // Log the full error
    logger.error(`[${requestId}] ${err.message}`, {
        requestId,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        userId: req.user?.id,
    });

    // Sequelize errors
    if (err.name === 'SequelizeValidationError') {
        return res.status(400).json({
            error: 'Validation Error',
            code: 'DB_001',
            requestId,
            details: err.errors.map(e => ({ field: e.path, message: e.message })),
        });
    }

    if (err.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({
            error: 'Duplicate Entry',
            code: 'DB_002',
            requestId,
            details: err.errors.map(e => ({ field: e.path, message: `${e.path} already exists` })),
        });
    }

    if (err.name === 'SequelizeForeignKeyConstraintError') {
        return res.status(400).json({ error: 'Referenced record not found', code: 'DB_003', requestId });
    }

    if (err.name === 'SequelizeDatabaseError') {
        return res.status(500).json({ error: 'Database error', code: 'DB_004', requestId });
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Invalid token', code: 'AUTH_003', requestId });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired', code: 'AUTH_002', requestId });
    }

    // Custom errors with status
    if (err.status) {
        return res.status(err.status).json({
            error: err.message,
            code: err.code || 'APP_001',
            requestId,
        });
    }

    // Default 500
    const response = {
        error: 'Internal Server Error',
        code: 'SYS_001',
        requestId,
    };

    // Only include stack trace in development
    if (process.env.NODE_ENV !== 'production') {
        response.stack = err.stack;
        response.message = err.message;
    }

    res.status(500).json(response);
};

module.exports = errorHandler;
