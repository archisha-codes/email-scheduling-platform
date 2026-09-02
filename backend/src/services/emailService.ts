import crypto from 'crypto';
import { prisma } from '../config/db';
import { EmailStatus } from '@prisma/client';
import { addBulkEmailJobsToQueue, EmailJobPayload } from '../queue/emailQueue';
import { ElasticsearchService } from './elasticsearchService';
import { logger } from '../utils/logger';

export interface ScheduleEmailsInput {
  userId: string;
  senderId?: string;
  recipients: string[];
  subject: string;
  body: string;
  scheduledAt: string; // ISO String
  maxEmailsPerHour?: number;
  minDelayMsBetweenSend?: number;
}

export class EmailService {
  /**
   * Cleans and validates recipient email addresses.
   */
  public static normalizeAndValidateRecipients(recipients: string[]): string[] {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleaned = recipients
      .map((r) => r.trim().toLowerCase())
      .filter((r) => r.length > 0 && emailRegex.test(r));

    // Remove duplicates
    return Array.from(new Set(cleaned));
  }

  /**
   * Schedules bulk/single emails with persistent DB state, BullMQ delayed queueing, and ES indexing.
   */
  public static async scheduleEmails(input: ScheduleEmailsInput) {
    const { userId, subject, body, scheduledAt } = input;

    const validRecipients = this.normalizeAndValidateRecipients(input.recipients);
    if (validRecipients.length === 0) {
      throw new Error('No valid recipient email addresses provided.');
    }

    // Resolve Sender
    let sender;
    if (input.senderId) {
      sender = await prisma.sender.findFirst({
        where: { id: input.senderId, userId },
      });
    }

    if (!sender) {
      sender = await prisma.sender.findFirst({
        where: { userId, isActive: true },
      });
    }

    if (!sender) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new Error('User not found');
      sender = await prisma.sender.create({
        data: {
          userId,
          email: user.email,
          displayName: user.name,
        },
      });
    }

    // Update sender configuration if custom values passed
    if (
      (input.maxEmailsPerHour && input.maxEmailsPerHour !== sender.maxEmailsPerHour) ||
      (input.minDelayMsBetweenSend !== undefined &&
        input.minDelayMsBetweenSend !== sender.minDelayMsBetweenSend)
    ) {
      sender = await prisma.sender.update({
        where: { id: sender.id },
        data: {
          maxEmailsPerHour: input.maxEmailsPerHour || sender.maxEmailsPerHour,
          minDelayMsBetweenSend:
            input.minDelayMsBetweenSend !== undefined
              ? input.minDelayMsBetweenSend
              : sender.minDelayMsBetweenSend,
        },
      });
    }

    const startTime = new Date(scheduledAt);
    const now = new Date();
    const baseScheduleTime = startTime.getTime() < now.getTime() ? now : startTime;
    const interEmailDelayMs = sender.minDelayMsBetweenSend;

    // Build email records and enqueuing jobs
    const emailsToCreate: any[] = [];
    const queueJobsData: { payload: EmailJobPayload; delayMs: number }[] = [];
    const esDocuments: any[] = [];

    validRecipients.forEach((recipient, index) => {
      // Stagger target schedule time for each recipient by inter-email delay
      const recipientScheduleTime = new Date(baseScheduleTime.getTime() + index * interEmailDelayMs);
      const emailId = crypto.randomUUID();
      const idempotencyKey = crypto
        .createHash('sha256')
        .update(`${userId}:${sender!.id}:${recipient}:${subject}:${recipientScheduleTime.getTime()}`)
        .digest('hex');

      emailsToCreate.push({
        id: emailId,
        userId,
        senderId: sender!.id,
        recipient,
        subject,
        body,
        scheduledAt: recipientScheduleTime,
        status: EmailStatus.SCHEDULED,
        idempotencyKey,
        bullMqJobId: emailId,
      });

      const delayMs = Math.max(0, recipientScheduleTime.getTime() - Date.now());

      const payload: EmailJobPayload = {
        emailId,
        userId,
        senderId: sender!.id,
        recipient,
        subject,
        body,
        scheduledAt: recipientScheduleTime.toISOString(),
        idempotencyKey,
      };

      queueJobsData.push({ payload, delayMs });

      esDocuments.push({
        id: emailId,
        userId,
        senderId: sender!.id,
        senderEmail: sender!.email,
        recipient,
        subject,
        body,
        status: EmailStatus.SCHEDULED,
        scheduledAt: recipientScheduleTime.toISOString(),
        sentAt: null,
        createdAt: new Date().toISOString(),
      });
    });

    // 1. Transactional Database Insert
    logger.info(`Persisting ${emailsToCreate.length} emails into PostgreSQL...`);
    await prisma.email.createMany({
      data: emailsToCreate,
      skipDuplicates: true,
    });

    // 2. Batch add to BullMQ queue
    logger.info(`Enqueuing ${queueJobsData.length} delayed jobs to BullMQ...`);
    await addBulkEmailJobsToQueue(queueJobsData);

    // 3. Async bulk index into Elasticsearch
    ElasticsearchService.bulkIndexEmails(esDocuments).catch((err) => {
      logger.warn('Non-critical background ES bulk index warning:', err);
    });

    return {
      success: true,
      count: validRecipients.length,
      sender: {
        id: sender.id,
        email: sender.email,
        displayName: sender.displayName,
        maxEmailsPerHour: sender.maxEmailsPerHour,
        minDelayMsBetweenSend: sender.minDelayMsBetweenSend,
      },
      firstScheduledAt: baseScheduleTime.toISOString(),
      estimatedCompletionAt: new Date(
        baseScheduleTime.getTime() + validRecipients.length * interEmailDelayMs
      ).toISOString(),
    };
  }

  /**
   * Retrieves paginated scheduled emails.
   */
  public static async getScheduledEmails(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const where = {
      userId,
      status: { in: [EmailStatus.SCHEDULED, EmailStatus.QUEUED, EmailStatus.RATE_LIMITED, EmailStatus.PROCESSING] },
    };

    const [items, total] = await Promise.all([
      prisma.email.findMany({
        where,
        include: {
          sender: { select: { email: true, displayName: true } },
        },
        orderBy: { scheduledAt: 'asc' },
        skip,
        take: limit,
      }),
      prisma.email.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Retrieves paginated sent emails (SENT or FAILED).
   */
  public static async getSentEmails(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const where = {
      userId,
      status: { in: [EmailStatus.SENT, EmailStatus.FAILED] },
    };

    const [items, total] = await Promise.all([
      prisma.email.findMany({
        where,
        include: {
          sender: { select: { email: true, displayName: true } },
        },
        orderBy: { sentAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.email.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
