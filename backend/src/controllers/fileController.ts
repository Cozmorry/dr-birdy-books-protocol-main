import { Response } from 'express';
import File from '../models/File';
import Analytics from '../models/Analytics';
import { AuthRequest } from '../middleware/auth';
import { verifyUserAccess, getUserTier } from '../config/blockchain';
import { uploadToGridFS, downloadFromGridFS, deleteFromGridFS, fileExistsInGridFS, getFileMetadata } from '../services/gridfsService';
import fs from 'fs';
import path from 'path';

// @desc    Upload file
// @route   POST /api/files/upload
// @access  Private (Admin)
export const uploadFile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
      return;
    }
    
    const { description, tier = -1 } = req.body;
    const STORAGE_TYPE = process.env.STORAGE_TYPE || 'local';
    
    if (!description) {
      res.status(400).json({
        success: false,
        message: 'Please provide a file description',
      });
      return;
    }
    
    // Get file extension
    const fileType = path.extname(req.file.originalname).substring(1).toLowerCase();
    
    let storagePath: string;
    let storageType: 'local' | 'mongodb' = STORAGE_TYPE === 'mongodb' ? 'mongodb' : 'local';
    
    // Handle MongoDB GridFS storage
    if (STORAGE_TYPE === 'mongodb') {
      if (!req.file.buffer) {
        res.status(400).json({
          success: false,
          message: 'File buffer not available',
        });
        return;
      }
      
      // Generate unique filename
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(req.file.originalname);
      const nameWithoutExt = path.basename(req.file.originalname, ext);
      const sanitizedName = nameWithoutExt.replace(/[^a-zA-Z0-9]/g, '-');
      const filename = `${uniqueSuffix}-${sanitizedName}${ext}`;
      
      // Upload to GridFS
      const gridFSFileId = await uploadToGridFS(req.file.buffer, filename, {
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        uploadedBy: req.admin?.id,
        uploadedByName: req.admin?.username || 'Admin',
      });
      
      storagePath = gridFSFileId.toString();
    } else {
      // Local storage
      if (!req.file.path) {
        res.status(400).json({
          success: false,
          message: 'File path not available',
        });
        return;
      }
      storagePath = req.file.path;
    }
    
    // Create file record
    const file = await File.create({
      fileName: req.file.filename || req.file.originalname,
      originalName: req.file.originalname,
      fileType,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      description,
      tier: Number(tier),
      storageType,
      storagePath,
      uploadedBy: req.admin?.id,
      uploadedByName: req.admin?.username || 'Admin',
    });
    
    // Track analytics
    await Analytics.create({
      eventType: 'file_upload',
      fileId: file._id,
      metadata: {
        tier: file.tier,
        fileType: file.fileType,
        fileSize: file.fileSize,
      },
      timestamp: new Date(),
    });
    
    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      data: file,
    });
  } catch (error: any) {
    console.error('Upload file error:', error);
    
    // Clean up uploaded file on error (only for local storage)
    if (req.file && req.file.path && process.env.STORAGE_TYPE !== 'mongodb') {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Failed to delete file:', unlinkError);
      }
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to upload file',
      error: error.message,
    });
  }
};

// @desc    Get all files (with filters and access control)
// @route   GET /api/files
// @access  Public (with wallet verification)
export const getFiles = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { tier, fileType, walletAddress, limit = 50, page = 1 } = req.query;
    
    const query: any = { isActive: true };
    
    // Filter by tier
    if (tier !== undefined) {
      query.tier = Number(tier);
    }
    
    // Filter by file type
    if (fileType) {
      query.fileType = fileType;
    }
    
    // If wallet address provided, filter by user's tier access
    if (walletAddress && typeof walletAddress === 'string') {
      try {
        const userTier = await getUserTier(walletAddress);
        if (userTier >= 0) {
          query.tier = { $lte: userTier };
        } else {
          query.tier = -1; // Only show admin files
        }
      } catch (error) {
        console.error('Error getting user tier:', error);
        query.tier = -1;
      }
    }
    
    const skip = (Number(page) - 1) * Number(limit);
    
    const [files, total] = await Promise.all([
      File.find(query)
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .skip(skip)
        .select('-storagePath') // Don't expose storage path to clients
        .lean(),
      File.countDocuments(query),
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        files,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error: any) {
    console.error('Get files error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch files',
      error: error.message,
    });
  }
};

// @desc    Get single file
// @route   GET /api/files/:id
// @access  Public (with access verification)
export const getFile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const file = await File.findById(id);
    
    if (!file || !file.isActive) {
      res.status(404).json({
        success: false,
        message: 'File not found',
      });
      return;
    }
    
    res.status(200).json({
      success: true,
      data: file,
    });
  } catch (error: any) {
    console.error('Get file error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch file',
      error: error.message,
    });
  }
};

// @desc    Download file
// @route   GET /api/files/:id/download
// @access  Public (with wallet verification)
export const downloadFile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { walletAddress } = req.query;
    
    const file = await File.findById(id);
    
    if (!file || !file.isActive) {
      res.status(404).json({
        success: false,
        message: 'File not found',
      });
      return;
    }
    
    // Verify access if tier-restricted
    if (file.tier >= 0 && walletAddress && typeof walletAddress === 'string') {
      try {
        const userTier = await getUserTier(walletAddress);
        if (userTier < file.tier) {
          res.status(403).json({
            success: false,
            message: 'Insufficient tier access',
            requiredTier: file.tier,
            userTier,
          });
          return;
        }
      } catch (error) {
        res.status(403).json({
          success: false,
          message: 'Unable to verify access',
        });
        return;
      }
    }
    
    // Handle file retrieval based on storage type
    let fileBuffer: Buffer;
    let mimeType = file.mimeType;
    
    if (file.storageType === 'mongodb') {
      // Check if file exists in GridFS
      const exists = await fileExistsInGridFS(file.storagePath);
      if (!exists) {
        res.status(404).json({
          success: false,
          message: 'File not found in database',
        });
        return;
      }
      
      // Download from GridFS
      fileBuffer = await downloadFromGridFS(file.storagePath);
      
      // Get metadata to ensure correct mime type
      try {
        const metadata = await getFileMetadata(file.storagePath);
        if (metadata.metadata?.mimeType) {
          mimeType = metadata.metadata.mimeType;
        }
      } catch (error) {
        // Use stored mime type if metadata fetch fails
      }
    } else {
      // Local storage
      if (!fs.existsSync(file.storagePath)) {
        res.status(404).json({
          success: false,
          message: 'File not found on server',
        });
        return;
      }
      
      fileBuffer = fs.readFileSync(file.storagePath);
    }
    
    // Increment download count
    file.downloads += 1;
    await file.save();
    
    // Track analytics
    await Analytics.create({
      eventType: 'file_download',
      userId: walletAddress as string || undefined,
      fileId: file._id,
      metadata: {
        tier: file.tier,
        fileType: file.fileType,
      },
      timestamp: new Date(),
    });
    
    // Set headers and send file
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
    res.setHeader('Content-Length', fileBuffer.length);
    
    // Send file buffer
    res.send(fileBuffer);
  } catch (error: any) {
    console.error('Download file error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download file',
      error: error.message,
    });
  }
};

// @desc    Update file
// @route   PUT /api/files/:id
// @access  Private (Admin)
export const updateFile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { description, tier, isActive } = req.body;
    
    const file = await File.findById(id);
    
    if (!file) {
      res.status(404).json({
        success: false,
        message: 'File not found',
      });
      return;
    }
    
    // Update fields
    if (description !== undefined) file.description = description;
    if (tier !== undefined) file.tier = Number(tier);
    if (isActive !== undefined) file.isActive = isActive;
    
    await file.save();
    
    res.status(200).json({
      success: true,
      message: 'File updated successfully',
      data: file,
    });
  } catch (error: any) {
    console.error('Update file error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update file',
      error: error.message,
    });
  }
};

// @desc    Delete file
// @route   DELETE /api/files/:id
// @access  Private (Admin)
export const deleteFile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const file = await File.findById(id);
    
    if (!file) {
      res.status(404).json({
        success: false,
        message: 'File not found',
      });
      return;
    }
    
    // Delete file based on storage type
    if (file.storageType === 'mongodb') {
      try {
        await deleteFromGridFS(file.storagePath);
      } catch (error) {
        console.error('Failed to delete file from GridFS:', error);
        // Continue with database record deletion even if GridFS deletion fails
      }
    } else {
      // Delete file from disk
      if (fs.existsSync(file.storagePath)) {
        fs.unlinkSync(file.storagePath);
      }
    }
    
    // Delete database record
    await file.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete file error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete file',
      error: error.message,
    });
  }
};


