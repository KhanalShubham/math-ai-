process.env.NODE_ENV = 'test';
process.env.MONGO_URI = process.env.MONGO_URI ?? 'mongodb://localhost:27017/mathsmentor-test';
process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-at-least-32-characters-long';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-at-least-32-characters-long';
process.env.LOG_LEVEL = 'error';
