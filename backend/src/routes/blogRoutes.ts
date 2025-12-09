import express from 'express';
import {
  getBlogPosts,
  getBlogPost,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
} from '../controllers/blogController';
import { authenticate } from '../middleware/auth';
import { upload, handleUploadError } from '../middleware/upload';

const router = express.Router();

// Public routes
router.get('/', getBlogPosts);
router.get('/:id', getBlogPost);

// Protected routes (Admin only)
// Allow optional image upload for blog posts
router.post('/', authenticate, upload.single('image'), handleUploadError, createBlogPost);
router.put('/:id', authenticate, upload.single('image'), handleUploadError, updateBlogPost);
router.delete('/:id', authenticate, deleteBlogPost);

export default router;



















