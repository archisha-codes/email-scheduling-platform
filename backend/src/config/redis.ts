import Redis, { RedisOptions } from 'ioredis';
import { config } from './env';
import { logger } from '../utils/logger';

const redisUrl = process.env.REDIS_URL;
const redisPassword = process.env.REDIS_PASSWORD;

const baseOptions: RedisOptions = {
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,
  ...(redisPassword ? { password: redisPassword } : {}),
  ...(process.env.REDIS_TLS === 'true' ? { tls: {} } : {}),
};

export const redisConnectionOptions: any = redisUrl
  ? redisUrl
  : {
      host: config.redisHost,
      port: config.redisPort,
      ...baseOptions,
    };

export const redisClient = redisUrl
  ? new Redis(redisUrl, { maxRetriesPerRequest: null, enableReadyCheck: false })
  : new Redis(redisConnectionOptions);

redisClient.on('connect', () => {
  logger.info(`Redis connected successfully (${redisUrl ? 'REDIS_URL' : `${config.redisHost}:${config.redisPort}`})`);
});

redisClient.on('error', (err) => {
  logger.error('Redis connection error:', err);
});

export async function checkRedisConnection(): Promise<boolean> {
  try {
    const ping = await redisClient.ping();
    return ping === 'PONG';
  } catch (err) {
    logger.error('Redis health check failed:', err);
    return false;
  }
}
