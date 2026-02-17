const redis = require('redis');

const redisClient = redis.createClient({
    url: `redis://:${process.env.REDIS_PASSWORD || 'medicore_redis_2024'}@${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
});

redisClient.on('error', (err) => console.error('Redis Client Error:', err));
redisClient.on('connect', () => console.log('✅ Redis connected'));

const connectRedis = async () => {
    try {
        await redisClient.connect();
    } catch (err) {
        console.error('Redis connection failed:', err);
    }
};

module.exports = { redisClient, connectRedis };
