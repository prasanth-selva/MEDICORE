const { getRedisClient } = require('../config/redis');
const { logger } = require('./logger');

/**
 * Redis cache middleware factory
 * @param {number} ttlSeconds - Time-to-live in seconds
 * @param {function} keyFn - Optional custom key generator (req) => string
 */
const cache = (ttlSeconds = 60, keyFn = null) => {
    return async (req, res, next) => {
        try {
            const client = getRedisClient();
            if (!client || !client.isReady) return next();

            const key = keyFn
                ? `cache:${keyFn(req)}`
                : `cache:${req.originalUrl}`;

            const cached = await client.get(key);
            if (cached) {
                logger.debug(`Cache HIT: ${key}`);
                return res.json(JSON.parse(cached));
            }

            // Override res.json to cache the response
            const originalJson = res.json.bind(res);
            res.json = (body) => {
                // Only cache successful responses
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    client.setEx(key, ttlSeconds, JSON.stringify(body)).catch(err => {
                        logger.warn(`Cache SET failed: ${err.message}`);
                    });
                }
                return originalJson(body);
            };

            next();
        } catch (err) {
            logger.warn(`Cache middleware error: ${err.message}`);
            next();
        }
    };
};

/**
 * Invalidate cache by pattern
 * @param {string} pattern - Redis key pattern (e.g., 'cache:/api/v1/doctors*')
 */
const invalidateCache = async (pattern) => {
    try {
        const client = getRedisClient();
        if (!client || !client.isReady) return;

        const keys = await client.keys(pattern);
        if (keys.length > 0) {
            await client.del(keys);
            logger.debug(`Cache invalidated: ${keys.length} keys matching ${pattern}`);
        }
    } catch (err) {
        logger.warn(`Cache invalidation error: ${err.message}`);
    }
};

module.exports = { cache, invalidateCache };
