const Redis = require("ioredis");
const crypto = require('crypto');

const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379');

const getHashSum = (data) => {
    const hash = crypto.createHash('sha256');
    hash.update(data, 'utf8');
    return hash.digest('hex');
}

const existAndEquals = async (key, value) => {
    const saved = await redis.get(key);
    value = getHashSum(value);
    redis.set(key, value);
    redis.expire(key, 60 * 60);
    return saved === value;
}

module.exports = {
    existAndEquals
}