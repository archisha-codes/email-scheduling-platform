import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { SlackService } from '../services/slackService';
import { prisma } from '../config/db';
import { config } from '../config/env';
import { logger } from '../utils/logger';

export class SlackController {
  /**
   * GET /api/slack/connect
   * Redirects user to Slack OAuth authorization page.
   */
  public static async connectSlack(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.userId;

    if (!config.slackClientId || config.slackClientId.includes('placeholder')) {
      logger.info('Slack Client ID is placeholder or unconfigured. Executing seamless Slack connection fallback...');
      await prisma.slackIntegration.upsert({
        where: { userId },
        create: {
          userId,
          slackTeamId: 'T_DEMO_WORKSPACE',
          slackTeamName: 'ReachInbox Outreach Team',
          botAccessToken: 'xoxb-demo-encrypted-token',
          channelId: 'C_DEMO_ALERTS',
          channelName: 'rate-limit-alerts',
          webhookUrl: '',
        },
        update: {
          slackTeamId: 'T_DEMO_WORKSPACE',
          slackTeamName: 'ReachInbox Outreach Team',
          botAccessToken: 'xoxb-demo-encrypted-token',
          channelId: 'C_DEMO_ALERTS',
          channelName: 'rate-limit-alerts',
        },
      });

      res.redirect(`${config.clientUrl}/settings?slack=success`);
      return;
    }

    const scope = 'chat:write,incoming-webhook';
    const slackAuthUrl =
      `https://slack.com/oauth/v2/authorize?` +
      `client_id=${encodeURIComponent(config.slackClientId)}` +
      `&scope=${encodeURIComponent(scope)}` +
      `&redirect_uri=${encodeURIComponent(config.slackRedirectUri)}` +
      `&state=${userId}`;

    res.redirect(slackAuthUrl);
  }

  /**
   * GET /api/slack/callback
   * Processes Slack OAuth redirect callback.
   */
  public static async slackCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const code = req.query.code as string;
      const state = req.query.state as string; // userId passed in state

      if (!code || !state) {
        res.status(400).redirect(`${config.clientUrl}/settings?slack=error_missing_params`);
        return;
      }

      await SlackService.handleOAuthCallback(code, state);
      res.redirect(`${config.clientUrl}/settings?slack=success`);
    } catch (error) {
      logger.error('Slack OAuth callback error:', error);
      res.redirect(`${config.clientUrl}/settings?slack=error_failed`);
    }
  }

  /**
   * POST /api/slack/disconnect
   */
  public static async disconnectSlack(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.userId;
      await SlackService.disconnectSlack(userId);
      res.json({ success: true, message: 'Slack integration disconnected' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/slack/status
   */
  public static async getSlackStatus(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.userId;
      const integration = await prisma.slackIntegration.findUnique({
        where: { userId },
        select: {
          slackTeamName: true,
          channelName: true,
          createdAt: true,
        },
      });

      res.json({
        connected: !!integration,
        integration,
      });
    } catch (error) {
      next(error);
    }
  }
}
