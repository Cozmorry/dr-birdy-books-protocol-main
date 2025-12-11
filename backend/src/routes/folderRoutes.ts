import express from 'express';
import {
  getFolders,
  getFolder,
  createFolder,
  updateFolder,
  deleteFolder,
  getFolderTree,
} from '../controllers/folderController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Public routes
router.get('/tree', getFolderTree);
router.get('/', getFolders);
router.get('/:id', getFolder);

// Protected routes (Admin only)
router.post('/', authenticate, createFolder);
router.put('/:id', authenticate, updateFolder);
router.delete('/:id', authenticate, deleteFolder);

export default router;

