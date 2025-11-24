import express from 'express';
import {
  uploadFile,
  getFiles,
  getFile,
  downloadFile,
  updateFile,
  deleteFile,
} from '../controllers/fileController';
import { authenticate } from '../middleware/auth';
import { upload, handleUploadError } from '../middleware/upload';

const router = express.Router();

// Public routes (with wallet verification)
router.get('/', getFiles);
router.get('/:id', getFile);
router.get('/:id/download', downloadFile);

// Protected routes (Admin only)
router.post('/upload', authenticate, upload.single('file'), handleUploadError, uploadFile);
router.put('/:id', authenticate, updateFile);
router.delete('/:id', authenticate, deleteFile);

export default router;


