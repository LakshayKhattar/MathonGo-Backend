const Redis = require('ioredis');

const redisClient = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
});

const setupCache = async () => {
    const cacheMiddleware = async (req, res, next) => {
        try {
            const key = req.originalUrl;
            const cachedData = await redisClient.get(key);

            if (cachedData) {
                return res.json(JSON.parse(cachedData));
            }

            const originalJson = res.json;

            res.json = function(data) {
                redisClient.setex(key, 300, JSON.stringify(data));
                return originalJson.call(this, data);
            };

            next();
        } catch (error) {
            console.error('Cache Error:', error);
            next();
        }
    };

    return cacheMiddleware;
};

module.exports = setupCache;