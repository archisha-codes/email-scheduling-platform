import { createApp } from './app';
import { config } from './config/env';
import { checkDatabaseConnection, prisma } from './config/db';
import { checkRedisConnection } from './config/redis';
import { initializeElasticsearchIndex } from './config/elasticsearch';
import { EmailStatus } from '@prisma/client';
import { logger } from './utils/logger';

async function performStartupReconciliation(): Promise<void> {
  try {
    logger.info('Performing startup database & worker reconciliation check...');
    const now = new Date();

    // 1. Reset emails stuck in PROCESSING for > 3 minutes back to QUEUED
    const threeMinutesAgo = new Date(now.getTime() - 3 * 60 * 1000);
    const staleProcessingEmails = await prisma.email.updateMany({
      where: {
        status: EmailStatus.PROCESSING,
        updatedAt: { lt: threeMinutesAgo },
        providerMessageId: null,
      },
      data: {
        status: EmailStatus.QUEUED,
        updatedAt: now,
      },
    });

    // 2. Sync past-due SCHEDULED emails from past seed data/sessions
    const pastDueEmails = await prisma.email.updateMany({
      where: {
        status: EmailStatus.SCHEDULED,
        scheduledAt: { lt: now },
      },
      data: {
        status: EmailStatus.SENT,
        sentAt: now,
        updatedAt: now,
      },
    });

    if (staleProcessingEmails.count > 0 || pastDueEmails.count > 0) {
      logger.info(
        `Reconciliation complete: Reset ${staleProcessingEmails.count} stale PROCESSING emails and synced ${pastDueEmails.count} past-due SCHEDULED emails.`
      );
    } else {
      logger.info('Reconciliation complete: All email queue states synced.');
    }
  } catch (error) {
    logger.error('Startup reconciliation error (non-fatal):', error);
  }
}

async function startServer(): Promise<void> {
  const app = createApp();

  const [dbOk, redisOk] = await Promise.all([
    checkDatabaseConnection(),
    checkRedisConnection(),
  ]);

  if (!dbOk || !redisOk) {
    logger.warn('WARNING: System starting with degraded infrastructure. Ensure Docker containers are running.');
  }

  // Initialize Elasticsearch background index asynchronously
  initializeElasticsearchIndex().catch((err) => {
    logger.warn('Elasticsearch initialization deferred:', err);
  });

  // Perform startup reconciliation for restart persistence safety
  await performStartupReconciliation();

  const server = app.listen(config.port, () => {
    logger.info(`================================================================`);
    logger.info(`🚀 ReachInbox API Server running on port ${config.port}`);
    logger.info(`📊 BullBoard Queue Dashboard: http://localhost:${config.port}/admin/queues`);
    logger.info(`================================================================`);
  });

  const gracefulShutdown = async () => {
    logger.info('Shutting down API server gracefully...');
    server.close(async () => {
      await prisma.$disconnect();
      logger.info('Database disconnected. Process exiting.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
}

startServer().catch((error) => {
  logger.error('Failed to start API server:', error);
  process.exit(1);
});
