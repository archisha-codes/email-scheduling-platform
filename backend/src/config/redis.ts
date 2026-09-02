import Redis from 'ioredis';
import { config } from './env';
import { logger } from '../utils/logger';

export const redisConnectionOptions = {
  host: config.redisHost,
  port: config.redisPort,
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,
};

export const redisClient = new Redis(redisConnectionOptions);

redisClient.on('connect', () => {
  logger.info(`Redis connected at ${config.redisHost}:${config.redisPort}`);
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
