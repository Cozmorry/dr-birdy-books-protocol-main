import express from 'express';
import {
  uploadFile,
  getFiles,
  getFile,
  downloadFile,
  generatePreSignedUrl,
  getDownloadStats,
  updateFile,
  deleteFile,
} from '../controllers/fileController';
import { authenticate } from '../middleware/auth';
import { upload, handleUploadError } from '../middleware/upload';

const router = express.Router();

// Public routes (with wallet verification)
// IMPORTANT: More specific routes must come before parameterized routes
router.get('/', getFiles);
router.get('/stats/download', getDownloadStats); // Must come before /:id
router.get('/:id/presigned', generatePreSignedUrl);
router.get('/:id/download', downloadFile);
router.get('/:id', getFile);

// Protected routes (Admin only)
router.post('/upload', authenticate, upload.single('file'), handleUploadError, uploadFile);
router.put('/:id', authenticate, updateFile);
router.delete('/:id', authenticate, deleteFile);

export default router;



