import express from 'express';
import {
  getDashboardAnalytics,
  getFileAnalytics,
  getBlogAnalytics,
} from '../controllers/analyticsController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// All analytics routes are protected (Admin only)
router.get('/dashboard', authenticate, getDashboardAnalytics);
router.get('/files', authenticate, getFileAnalytics);
router.get('/blog', authenticate, getBlogAnalytics);

export default router;

















