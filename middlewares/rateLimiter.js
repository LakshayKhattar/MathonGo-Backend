const { RateLimiterRedis } = require('rate-limiter-flexible');
const { redisClient, connectRedis } = require('../config/redis');

async function setupRateLimiter() {
  try {
    await connectRedis();
    
    const rateLimiter = new RateLimiterRedis({
      storeClient: redisClient,
      points: 100, 
      duration: 60,
      keyPrefix: 'middleware',
    });

    return async function rateLimitMiddleware(req, res, next) {
      if (process.env.NODE_ENV === 'development') {
        return next();
      }

      const ip = req.headers['x-forwarded-for'] || 
                 req.headers['x-real-ip'] || 
                 req.connection.remoteAddress;

      try {
        await rateLimiter.consume(ip);
        next();
      } catch (error) {
        if (error.remainingPoints !== undefined) {
          const retrySecs = Math.round(error.msBeforeNext / 1000) || 60;
          res.set('Retry-After', String(retrySecs));
          res.status(429).json({
            error: 'Too Many Requests',
            message: `Try again in ${retrySecs} seconds`
          });
        } else {
          console.error('Rate limiter error:', error);
          next();
        }
      }
    };
  } catch (error) {
    console.error('Rate limiter setup failed:', error);
    return (req, res, next) => next();
  }
}

module.exports = setupRateLimiter;