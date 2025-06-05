const { createClient } = require('redis');

const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
  },
  username: 'default',
  password: process.env.REDIS_PASSWORD,
 retryStrategy: function(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

redisClient.on('error', (err) => console.error(' Redis Client Error:', err));
redisClient.on('connect', () => console.log('Redis connected'));

async function connectRedis() {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
      console.log('Connected to Redis Cloud');
    }
  } catch (error) {
    console.error('Redis connection failed:', error);
    return null;
  }
  return redisClient;
}

module.exports = { redisClient, connectRedis };
