import { Router, Request, Response } from 'express';
import { checkDatabaseConnection } from '../config/db';
import { checkRedisConnection } from '../config/redis';
import { checkElasticsearchConnection } from '../config/elasticsearch';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const [dbOk, redisOk, esOk] = await Promise.all([
    checkDatabaseConnection(),
    checkRedisConnection(),
    checkElasticsearchConnection(),
  ]);

  const allHealthy = dbOk && redisOk;

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    services: {
      postgresql: dbOk ? 'up' : 'down',
      redis: redisOk ? 'up' : 'down',
      elasticsearch: esOk ? 'up' : 'degraded_or_down',
    },
  });
});

export default router;
