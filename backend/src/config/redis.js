const redis = require('redis');
const { logger } = require('../middleware/logger');

const redisPw = process.env.REDIS_PASSWORD;
const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = process.env.REDIS_PORT || 6379;
const redisUrl = redisPw
    ? `redis://:${redisPw}@${redisHost}:${redisPort}`
    : `redis://${redisHost}:${redisPort}`;

let redisClient = null;

const createRedisClient = () => {
    const client = redis.createClient({
        url: redisUrl,
        socket: {
            reconnectStrategy: (retries) => {
                if (retries > 10) {
                    logger.error('Redis: Max reconnection attempts reached');
                    return new Error('Redis max retries');
                }
                const delay = Math.min(retries * 200, 5000); // exponential backoff, max 5s
                logger.warn(`Redis: Reconnecting in ${delay}ms (attempt ${retries})`);
                return delay;
            },
        },
    });

    client.on('error', (err) => logger.error(`Redis Client Error: ${err.message}`));
    client.on('connect', () => logger.info('✅ Redis connected'));
    client.on('reconnecting', () => logger.warn('🔄 Redis reconnecting...'));
    client.on('end', () => logger.warn('Redis connection closed'));

    return client;
};

const connectRedis = async () => {
    try {
        redisClient = createRedisClient();
        await redisClient.connect();
    } catch (err) {
        logger.warn(`⚠️ Redis connection failed (non-fatal): ${err.message}`);
    }
};

const getRedisClient = () => redisClient;

// Health check for Redis
const redisHealthCheck = async () => {
    try {
        if (!redisClient || !redisClient.isReady) return { status: 'disconnected' };
        const start = Date.now();
        await redisClient.ping();
        return { status: 'healthy', responseMs: Date.now() - start };
    } catch (err) {
        return { status: 'unhealthy', error: err.message };
    }
};

const disconnectRedis = async () => {
    try {
        if (redisClient && redisClient.isReady) {
            await redisClient.quit();
            logger.info('Redis disconnected gracefully');
        }
    } catch (err) {
        logger.warn(`Redis disconnect error: ${err.message}`);
    }
};

module.exports = { connectRedis, getRedisClient, redisHealthCheck, disconnectRedis };
