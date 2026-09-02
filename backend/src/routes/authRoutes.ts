import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.get('/google', AuthController.googleLogin);
router.get('/google/callback', AuthController.googleCallback);
router.post('/google/callback', AuthController.googleCallback);
router.post('/demo', AuthController.demoLogin);
router.get('/me', authMiddleware, AuthController.getMe);
router.post('/logout', AuthController.logout);

export default router;
