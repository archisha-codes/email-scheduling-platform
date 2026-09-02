import { Router } from 'express';
import { SlackController } from '../controllers/slackController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.get('/callback', SlackController.slackCallback);

// Protected Slack endpoints
router.get('/connect', authMiddleware, SlackController.connectSlack);
router.post('/disconnect', authMiddleware, SlackController.disconnectSlack);
router.get('/status', authMiddleware, SlackController.getSlackStatus);

export default router;
