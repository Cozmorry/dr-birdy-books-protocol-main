import express from 'express';
import {
  submitFeedback,
  getFeedback,
  updateFeedbackStatus,
  getFeedbackStats,
} from '../controllers/feedbackController';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

// Public routes
router.post('/', submitFeedback);

// Protected routes (Admin only)
router.get('/', authenticate, authorize('super_admin', 'admin'), getFeedback);
router.get('/stats', authenticate, authorize('super_admin', 'admin'), getFeedbackStats);
router.patch('/:id', authenticate, authorize('super_admin', 'admin'), updateFeedbackStatus);

export default router;

