const express = require("express");
const cors = require("cors");
const { redisClient } = require('./config/redis');
const chapterRoutes = require("./routes/chapterRoutes");
const errorHandler = require("./middlewares/errorHandler");
const setupRateLimiter = require("./middlewares/rateLimiter");
const setupCache = require("./middlewares/cache");

const app = express();
app.set('trust proxy', true);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
console.log("hello priyanshi");
app.get('/health', async (req, res) => {
  try {
    const redisStatus = redisClient.isOpen ? 'connected' : 'disconnected';
    res.json({
      status: 'ok',
      redis: redisStatus
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});
async function startServer() {
    const rateLimiter = await setupRateLimiter();
    console.log("✅ RateLimiter initialized");
    const cacheMiddleware = await setupCache();
    console.log("✅ Cache initialized");

    app.use(rateLimiter);
    app.use(cacheMiddleware);
    app.use("/api/v1/chapters", chapterRoutes);
    app.use(errorHandler);
}

startServer();

module.exports = app;