import express from 'express';
import {
  getBlogPosts,
  getBlogPost,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
} from '../controllers/blogController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Public routes
router.get('/', getBlogPosts);
router.get('/:id', getBlogPost);

// Protected routes (Admin only)
router.post('/', authenticate, createBlogPost);
router.put('/:id', authenticate, updateBlogPost);
router.delete('/:id', authenticate, deleteBlogPost);

export default router;











