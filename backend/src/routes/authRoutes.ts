import express from 'express';
import {
  login,
  getMe,
  changePassword,
  createAdmin,
} from '../controllers/authController';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

// Public routes
router.post('/login', login);

// Protected routes
router.get('/me', authenticate, getMe);
router.put('/change-password', authenticate, changePassword);

// Super admin only
router.post('/create-admin', authenticate, authorize('super_admin'), createAdmin);

export default router;











