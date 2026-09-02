import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { EmailService } from '../services/emailService';
import { ElasticsearchService } from '../services/elasticsearchService';

const scheduleSchema = z.object({
  recipients: z.array(z.string()).min(1, 'At least one recipient email is required'),
  subject: z.string().min(1, 'Subject cannot be empty'),
  body: z.string().min(1, 'Body cannot be empty'),
  scheduledAt: z.string(),
  senderId: z.string().optional(),
  maxEmailsPerHour: z.number().int().positive().optional(),
  minDelayMsBetweenSend: z.number().int().nonnegative().optional(),
});

export class EmailController {
  /**
   * POST /api/emails/schedule
   */
  public static async scheduleEmails(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const validatedData = scheduleSchema.parse(req.body);
      const userId = req.user!.userId;

      const result = await EmailService.scheduleEmails({
        userId,
        ...validatedData,
      });

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/emails/scheduled
   */
  public static async getScheduledEmails(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.userId;
      const page = parseInt(req.query.page as string || '1', 10);
      const limit = parseInt(req.query.limit as string || '20', 10);

      const result = await EmailService.getScheduledEmails(userId, page, limit);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/emails/sent
   */
  public static async getSentEmails(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.userId;
      const page = parseInt(req.query.page as string || '1', 10);
      const limit = parseInt(req.query.limit as string || '20', 10);

      const result = await EmailService.getSentEmails(userId, page, limit);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/emails/search
   */
  public static async searchEmails(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.userId;
      const q = (req.query.q as string) || '';
      const status = req.query.status as string;
      const page = parseInt(req.query.page as string || '1', 10);
      const limit = parseInt(req.query.limit as string || '20', 10);

      const result = await ElasticsearchService.searchEmails(userId, q, status, page, limit);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}
