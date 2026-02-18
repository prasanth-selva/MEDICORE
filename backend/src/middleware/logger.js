const winston = require('winston');
const morgan = require('morgan');
const crypto = require('crypto');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', '..', 'logs');

// ─── Winston Logger ──────────────────────────────────────────
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'medicore-api' },
    transports: [
        // Error log file
        new winston.transports.File({
            filename: path.join(LOG_DIR, 'error.log'),
            level: 'error',
            maxsize: 5 * 1024 * 1024, // 5MB
            maxFiles: 5,
            tailable: true,
        }),
        // Combined log file
        new winston.transports.File({
            filename: path.join(LOG_DIR, 'app.log'),
            maxsize: 5 * 1024 * 1024,
            maxFiles: 5,
            tailable: true,
        }),
    ],
});

// Console transport for development
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, requestId, ...meta }) => {
                const rid = requestId ? ` [${requestId}]` : '';
                const metaStr = Object.keys(meta).length > 1 ? ` ${JSON.stringify(meta)}` : '';
                return `${timestamp} ${level}${rid}: ${message}${metaStr}`;
            })
        ),
    }));
}

// ─── Request ID Middleware ────────────────────────────────────
const requestId = (req, res, next) => {
    req.requestId = req.headers['x-request-id'] || crypto.randomUUID();
    res.setHeader('X-Request-Id', req.requestId);
    next();
};

// ─── Morgan HTTP Logger ──────────────────────────────────────
const morganFormat = process.env.NODE_ENV === 'production'
    ? ':method :url :status :res[content-length] - :response-time ms'
    : ':method :url :status :response-time ms';

const httpLogger = morgan(morganFormat, {
    stream: {
        write: (message) => {
            logger.info(message.trim(), { component: 'http' });
        },
    },
    skip: (req) => req.url === '/api/v1/health' || req.url === '/api/health', // Skip health check spam
});

// ─── Audit Logger Helper ─────────────────────────────────────
const auditLog = (action, details) => {
    logger.info(`AUDIT: ${action}`, { component: 'audit', ...details });
};

module.exports = { logger, requestId, httpLogger, auditLog };
