const { RateLimiterRedis } = require('rate-limiter-flexible');
const { redisClient, connectRedis } = require('../config/redis');

let rateLimiter;

function getClientIP(req) {
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }
  return (
    req.headers['cf-connecting-ip'] ||
    req.ip ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

async function setupRateLimiter() {
  await connectRedis();
  rateLimiter = new RateLimiterRedis({
    storeClient: redisClient,
    points: 30, 
    duration: 60,
    keyPrefix: 'middleware',
  });

  return async function rateLimitMiddleware(req, res, next) {
    const ip = getClientIP(req);
    console.log("Resolved IP:", ip);
    if (process.env.NODE_ENV === 'development' || ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(ip)) {
      return next();
    }

    try {

      await rateLimiter.consume(ip);
      next();

    } catch (rejRes) {
      const retrySecs = Math.round((rejRes.msBeforeNext || 0) / 1000) || 60;
      res.set('Retry-After', String(retrySecs));
      res.status(429).json({
        error: 'Too Many Requests',
        message: `Try again in ${retrySecs} seconds`
      });
    }
  };
}

module.exports = setupRateLimiter;
