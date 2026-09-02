import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from root or local .env
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgrespassword@localhost:5432/reachinbox_email_scheduler?schema=public',
  redisHost: process.env.REDIS_HOST || '127.0.0.1',
  redisPort: parseInt(process.env.REDIS_PORT || '6379', 10),
  elasticsearchNode: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
  jwtSecret: process.env.JWT_SECRET || 'reachinbox_super_secret_jwt_token_key_2026_dev',
  encryptionSecret: process.env.ENCRYPTION_SECRET || 'reachinbox_aes_encryption_secret_key_32bytes!!',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  googleCallbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',
  slackClientId: process.env.SLACK_CLIENT_ID || '',
  slackClientSecret: process.env.SLACK_CLIENT_SECRET || '',
  slackRedirectUri: process.env.SLACK_REDIRECT_URI || 'http://localhost:5000/api/slack/callback',
  workerConcurrency: parseInt(process.env.WORKER_CONCURRENCY || '10', 10),
  defaultMinDelayMs: parseInt(process.env.DEFAULT_MIN_DELAY_MS || '2000', 10),
  defaultHourlyLimit: parseInt(process.env.DEFAULT_HOURLY_LIMIT || '100', 10),
  realSmtpHost: process.env.REAL_SMTP_HOST || '',
  realSmtpPort: parseInt(process.env.REAL_SMTP_PORT || '587', 10),
  realSmtpUser: process.env.REAL_SMTP_USER || '',
  realSmtpPass: process.env.REAL_SMTP_PASS || '',
};
