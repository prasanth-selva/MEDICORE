const jwt = require('jsonwebtoken');
const { logger } = require('./logger');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

// Fail loudly if secrets not configured
if (!JWT_SECRET || JWT_SECRET.includes('change-in-production')) {
    if (process.env.NODE_ENV === 'production') {
        logger.error('FATAL: JWT_SECRET must be set to a secure value in production');
        process.exit(1);
    }
    logger.warn('⚠️  Using default JWT secret — set JWT_SECRET in .env for production');
}

const effectiveSecret = JWT_SECRET || 'medicore-dev-secret-only';
const effectiveRefreshSecret = JWT_REFRESH_SECRET || 'medicore-refresh-dev-only';

const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Access denied. No token provided.', code: 'AUTH_001' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, effectiveSecret);
        req.user = decoded;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired', code: 'AUTH_002' });
        }
        return res.status(403).json({ error: 'Invalid token', code: 'AUTH_003' });
    }
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated', code: 'AUTH_001' });
        }
        if (!roles.includes(req.user.role)) {
            logger.warn(`Authorization denied: user ${req.user.id} (${req.user.role}) tried to access ${req.originalUrl}`);
            return res.status(403).json({ error: 'Insufficient permissions', code: 'AUTH_004' });
        }
        next();
    };
};

const generateTokens = (user) => {
    const accessToken = jwt.sign(
        { id: user.id, email: user.email, role: user.role, name: user.name },
        effectiveSecret,
        { expiresIn: process.env.JWT_EXPIRY || '15m' }
    );

    const refreshToken = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        effectiveRefreshSecret,
        { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
    );

    return { accessToken, refreshToken };
};

const verifyRefreshToken = (token) => {
    return jwt.verify(token, effectiveRefreshSecret);
};

module.exports = { authenticate, authorize, generateTokens, verifyRefreshToken };
