import { Response } from 'express';
import mongoose from 'mongoose';
import File from '../models/File';
import Analytics from '../models/Analytics';
import { AuthRequest } from '../middleware/auth';
import { verifyUserAccess, getUserTier } from '../config/blockchain';
import { uploadToGridFS, downloadFromGridFS, deleteFromGridFS, fileExistsInGridFS, getFileMetadata, getGridFSBucket } from '../services/gridfsService';
import {
  checkDailyLimit,
  checkMonthlyQuota,
  recordDownload,
  markQuotaWarningSent,
  generatePreSignedUrlToken,
  verifyPreSignedUrlToken,
  getUserDownloadStats,
} from '../services/downloadControlService';

// Constants
const MAX_DAILY_DOWNLOADS = 20;
const MAX_MONTHLY_BYTES = 1024 * 1024 * 1024; // 1GB

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
    
    const { description } = req.body;
    // Parse tier from form data (multer sends it as string)
    const tierRaw = req.body.tier !== undefined ? req.body.tier : -1;
    const tierValue = isNaN(Number(tierRaw)) ? -1 : Number(tierRaw);
    const tier = tierValue >= -1 && tierValue <= 2 ? tierValue : -1;
    
    console.log('📝 File upload request:', {
      hasFile: !!req.file,
      hasBuffer: !!req.file?.buffer,
      fileSize: req.file?.size,
      originalName: req.file?.originalname,
      tierRaw: tierRaw,
      tierParsed: tier,
    });
    
    if (!description) {
      res.status(400).json({
        success: false,
        message: 'Please provide a file description',
      });
      return;
    }
    
    // Get file extension
    const fileType = path.extname(req.file.originalname).substring(1).toLowerCase();
    
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(req.file.originalname);
    const nameWithoutExt = path.basename(req.file.originalname, ext);
    const sanitizedName = nameWithoutExt.replace(/[^a-zA-Z0-9]/g, '-');
    const filename = `${uniqueSuffix}-${sanitizedName}${ext}`;
    
    // Upload to MongoDB GridFS
    let storagePath: string;
    try {
      console.log('📤 Uploading file to MongoDB GridFS...', {
        filename,
        size: req.file.size,
        mimeType: req.file.mimetype,
      });
      
      const gridFSFileId = await uploadToGridFS(req.file.buffer, filename, {
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        uploadedBy: req.admin?.id,
        uploadedByName: req.admin?.username || 'Admin',
      });
      
      console.log('✅ File uploaded to GridFS with ID:', gridFSFileId.toString());
      storagePath = gridFSFileId.toString();
    } catch (gridFSError: any) {
      console.error('❌ GridFS upload error:', gridFSError);
      res.status(500).json({
        success: false,
        message: 'Failed to upload file to MongoDB',
        error: gridFSError.message,
      });
      return;
    }
    
    // Create file record
    console.log('📝 Creating File document in database...', {
      fileName: req.file.originalname,
      storagePath,
      uploadedBy: req.admin?.id,
    });
    
    const fileData = {
      fileName: req.file.originalname,
      originalName: req.file.originalname,
      fileType,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      description,
      tier: tier,
      storageType: 'mongodb' as const,
      storagePath,
      uploadedBy: req.admin?.id,
      uploadedByName: req.admin?.username || 'Admin',
    };
    
    console.log('📋 File data to save:', fileData);
    
    const file = await File.create(fileData);
    
    // Verify the document was saved
    const savedFile = await File.findById(file._id);
    if (!savedFile) {
      console.error('❌ File document was not saved to database!');
    } else {
      console.log('✅ Verified: File document exists in database');
    }
    
    // Count total files in collection
    const totalFiles = await File.countDocuments();
    console.log(`📊 Total files in '${File.collection.name}' collection: ${totalFiles}`);
    
    console.log('✅ File document created successfully:', {
      id: file._id,
      fileName: file.fileName,
      collection: File.collection.name,
      database: File.db?.name || 'unknown',
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
    
    // No cleanup needed for MongoDB storage (files are in GridFS)
    
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
    
    // Note: We no longer filter by user tier access here
    // The frontend will show all files and handle access control client-side
    // This allows users to see all available content and know what tiers they need to unlock
    
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

// @desc    Get download statistics for a user
// @route   GET /api/files/stats/download
// @access  Public
export const getDownloadStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { walletAddress } = req.query;
    
    if (!walletAddress || typeof walletAddress !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Wallet address is required',
      });
      return;
    }
    
    const stats = await getUserDownloadStats(walletAddress);
    
    res.status(200).json({
      success: true,
      data: {
        ...stats,
        dailyLimit: MAX_DAILY_DOWNLOADS,
        monthlyLimit: MAX_MONTHLY_BYTES,
        monthlyLimitGB: (MAX_MONTHLY_BYTES / (1024 * 1024 * 1024)).toFixed(2),
        monthlyUsedGB: (stats.monthlyBytesUsed / (1024 * 1024 * 1024)).toFixed(2),
        monthlyRemainingGB: (stats.monthlyBytesRemaining / (1024 * 1024 * 1024)).toFixed(2),
      },
    });
  } catch (error: any) {
    console.error('Get download stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch download statistics',
      error: error.message,
    });
  }
};

// @desc    Generate pre-signed URL for file download
// @route   GET /api/files/:id/presigned
// @access  Public (with wallet verification)
export const generatePreSignedUrl = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { walletAddress } = req.query;
    
    if (!walletAddress || typeof walletAddress !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Wallet address is required',
      });
      return;
    }
    
    const file = await File.findById(id);
    
    if (!file || !file.isActive) {
      res.status(404).json({
        success: false,
        message: 'File not found',
      });
      return;
    }
    
    // Verify access if tier-restricted
    if (file.tier >= 0) {
      try {
        const userTier = await getUserTier(walletAddress);
        // User must have unlocked the required tier or higher
        // userTier: -1 = no tier, 0 = Tier 1, 1 = Tier 2, 2 = Tier 3
        // file.tier: 0 = Tier 1, 1 = Tier 2, 2 = Tier 3
        console.log(`[Tier Check] File tier: ${file.tier}, User tier: ${userTier}, Wallet: ${walletAddress}`);
        if (userTier < 0 || userTier < file.tier) {
          console.log(`[Tier Check] Access DENIED - User tier ${userTier} < required tier ${file.tier}`);
          res.status(403).json({
            success: false,
            message: 'Insufficient tier access',
            requiredTier: file.tier,
            userTier,
            requiredTierName: file.tier === 0 ? 'Tier 1' : file.tier === 1 ? 'Tier 2' : 'Tier 3',
            userTierName: userTier === -1 ? 'None' : userTier === 0 ? 'Tier 1' : userTier === 1 ? 'Tier 2' : 'Tier 3',
          });
          return;
        }
        console.log(`[Tier Check] Access GRANTED - User tier ${userTier} >= required tier ${file.tier}`);
      } catch (error) {
        console.error('Error verifying tier access:', error);
        res.status(403).json({
          success: false,
          message: 'Unable to verify access',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        return;
      }
    }
    
    // Check daily download limit
    const dailyCheck = await checkDailyLimit(walletAddress);
    if (!dailyCheck.allowed) {
      res.status(429).json({
        success: false,
        message: 'Daily download limit exceeded',
        limit: MAX_DAILY_DOWNLOADS,
        remaining: 0,
        resetTime: 'Tomorrow',
      });
      return;
    }
    
    // Check monthly quota
    const quotaCheck = await checkMonthlyQuota(walletAddress, file.fileSize);
    if (!quotaCheck.allowed) {
      res.status(429).json({
        success: false,
        message: 'Monthly download quota exceeded',
        used: quotaCheck.used,
        limit: MAX_MONTHLY_BYTES,
        remaining: quotaCheck.remaining,
        resetTime: 'Next month',
      });
      return;
    }
    
    // Send quota warning if needed
    if (quotaCheck.warningNeeded) {
      await markQuotaWarningSent(walletAddress);
      res.status(200).json({
        success: true,
        message: 'Quota warning: You have used 80% of your monthly download quota',
        token: generatePreSignedUrlToken(id, walletAddress),
        expiresIn: 900, // 15 minutes in seconds
        downloadUrl: `/files/${id}/download?token=${generatePreSignedUrlToken(id, walletAddress)}`,
        warning: {
          used: quotaCheck.used,
          limit: MAX_MONTHLY_BYTES,
          percentage: quotaCheck.percentage,
        },
      });
      return;
    }
    
    // Generate pre-signed URL token
    const token = generatePreSignedUrlToken(id, walletAddress);
    
    res.status(200).json({
      success: true,
      token,
      expiresIn: 900, // 15 minutes in seconds
      downloadUrl: `/files/${id}/download?token=${token}`,
    });
  } catch (error: any) {
    console.error('Generate pre-signed URL error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate pre-signed URL',
      error: error.message,
    });
  }
};

// @desc    Download file (with pre-signed token or direct access)
// @route   GET /api/files/:id/download
// @access  Public (with wallet verification)
export const downloadFile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { walletAddress, token } = req.query;
    
    let verifiedWalletAddress: string | null = null;
    
    // If token is provided, verify it
    if (token && typeof token === 'string') {
      const decoded = verifyPreSignedUrlToken(token);
      if (!decoded || decoded.fileId !== id) {
        res.status(401).json({
          success: false,
          message: 'Invalid or expired download token',
        });
        return;
      }
      verifiedWalletAddress = decoded.walletAddress;
    } else if (walletAddress && typeof walletAddress === 'string') {
      verifiedWalletAddress = walletAddress.toLowerCase();
      
      // Check daily download limit (only if not using pre-signed token)
      const dailyCheck = await checkDailyLimit(verifiedWalletAddress);
      if (!dailyCheck.allowed) {
        res.status(429).json({
          success: false,
          message: 'Daily download limit exceeded',
          limit: MAX_DAILY_DOWNLOADS,
          remaining: 0,
          resetTime: 'Tomorrow',
        });
        return;
      }
    }
    
    const file = await File.findById(id);
    
    if (!file || !file.isActive) {
      res.status(404).json({
        success: false,
        message: 'File not found',
      });
      return;
    }
    
    // Verify access if tier-restricted
    if (file.tier >= 0 && verifiedWalletAddress) {
      try {
        const userTier = await getUserTier(verifiedWalletAddress);
        // User must have unlocked the required tier or higher
        // userTier: -1 = no tier, 0 = Tier 1, 1 = Tier 2, 2 = Tier 3
        // file.tier: 0 = Tier 1, 1 = Tier 2, 2 = Tier 3
        if (userTier < 0 || userTier < file.tier) {
          res.status(403).json({
            success: false,
            message: 'Insufficient tier access',
            requiredTier: file.tier,
            userTier,
            requiredTierName: file.tier === 0 ? 'Tier 1' : file.tier === 1 ? 'Tier 2' : 'Tier 3',
            userTierName: userTier === -1 ? 'None' : userTier === 0 ? 'Tier 1' : userTier === 1 ? 'Tier 2' : 'Tier 3',
          });
          return;
        }
      } catch (error) {
        console.error('Error verifying tier access:', error);
        res.status(403).json({
          success: false,
          message: 'Unable to verify access',
        });
        return;
      }
    }
    
    // Check monthly quota if wallet address is available
    if (verifiedWalletAddress) {
      const quotaCheck = await checkMonthlyQuota(verifiedWalletAddress, file.fileSize);
      if (!quotaCheck.allowed) {
        res.status(429).json({
          success: false,
          message: 'Monthly download quota exceeded',
          used: quotaCheck.used,
          limit: MAX_MONTHLY_BYTES,
          remaining: quotaCheck.remaining,
          resetTime: 'Next month',
        });
        return;
      }
    }
    
    // Download file from MongoDB GridFS using streaming for better performance
    console.log('📥 Download request:', {
      fileId: id,
      storagePath: file.storagePath,
      storageType: file.storageType,
    });
    
    // Set headers immediately (before any async operations)
    // Important: Set these headers before streaming starts
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.originalName)}"`);
    res.setHeader('Content-Length', file.fileSize);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Ensure response is not buffered
    res.flushHeaders();
    
    // Stream file directly from GridFS (don't load into memory)
    // Start streaming immediately - don't wait for existence check
    try {
      console.log('📤 Streaming file from GridFS...');
      const bucket = getGridFSBucket();
      const objectId = new mongoose.Types.ObjectId(file.storagePath);
      const downloadStream = bucket.openDownloadStream(objectId);
      
      // Handle stream errors early
      downloadStream.on('error', (error: any) => {
        console.error('❌ GridFS stream error:', error);
        if (!res.headersSent) {
          res.status(404).json({
            success: false,
            message: 'File not found in storage',
          });
        } else {
          res.end();
        }
      });
      
      // Record download stats BEFORE streaming starts (to prevent multiple recordings)
      // This ensures we only record once, even if the stream is accessed multiple times
      if (verifiedWalletAddress) {
        // Record download asynchronously (don't block the stream)
        Promise.all([
          recordDownload(verifiedWalletAddress, file.fileSize),
          file.updateOne({ $inc: { downloads: 1 } }), // Increment download count
          Analytics.create({
            eventType: 'file_download',
            userId: verifiedWalletAddress || (walletAddress as string) || undefined,
            fileId: file._id,
            metadata: {
              tier: file.tier,
              fileType: file.fileType,
              fileSize: file.fileSize,
            },
            timestamp: new Date(),
          }),
        ]).catch((err) => {
          console.error('Error recording download stats:', err);
          // Don't fail the download if stats recording fails
        });
      }
      
      // Pipe the stream directly to response (starts immediately)
      downloadStream.pipe(res);
      
      // Log completion
      downloadStream.on('end', () => {
        console.log('✅ File stream completed');
      });
      
    } catch (gridFSError: any) {
      console.error('❌ GridFS stream setup error:', gridFSError);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Failed to download file from storage',
          error: gridFSError.message,
        });
      }
      return;
    }
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
    
    // Delete file from MongoDB GridFS
    try {
      await deleteFromGridFS(file.storagePath);
    } catch (error) {
      console.error('Failed to delete file from GridFS:', error);
      // Continue with database record deletion even if GridFS deletion fails
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


