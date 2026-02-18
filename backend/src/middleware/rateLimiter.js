const rateLimit = require('express-rate-limit');

// General API rate limiter
const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later', code: 'RATE_001' },
    keyGenerator: (req) => req.ip,
});

// Strict auth rate limiter (brute force protection)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many authentication attempts. Please try again in 15 minutes.', code: 'RATE_002' },
    keyGenerator: (req) => req.ip,
    skipSuccessfulRequests: true,
});

// Password reset limiter (prevent email spam)
const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    message: { error: 'Too many password reset requests. Please try again in an hour.', code: 'RATE_003' },
    keyGenerator: (req) => req.body?.email || req.ip,
});

// File upload limiter
const uploadLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5,
    message: { error: 'Too many file uploads. Please try again shortly.', code: 'RATE_004' },
});

module.exports = { apiLimiter, authLimiter, passwordResetLimiter, uploadLimiter };
