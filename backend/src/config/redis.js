const redis = require('redis');

const redisPw = process.env.REDIS_PASSWORD;
const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = process.env.REDIS_PORT || 6379;
const redisUrl = redisPw
    ? `redis://:${redisPw}@${redisHost}:${redisPort}`
    : `redis://${redisHost}:${redisPort}`;

const redisClient = redis.createClient({ url: redisUrl });

redisClient.on('error', (err) => console.error('Redis Client Error:', err));
redisClient.on('connect', () => console.log('✅ Redis connected'));

const connectRedis = async () => {
    try {
        await redisClient.connect();
    } catch (err) {
        console.error('⚠️ Redis connection failed (non-fatal):', err.message);
    }
};

module.exports = { redisClient, connectRedis };
