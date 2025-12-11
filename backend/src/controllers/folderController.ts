import { Response } from 'express';
import Folder from '../models/Folder';
import File from '../models/File';
import { AuthRequest } from '../middleware/auth';

// @desc    Get all folders
// @route   GET /api/folders
// @access  Public
export const getFolders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { tier, parentFolder, includeInactive } = req.query;
    
    const query: any = {};
    
    // Filter by tier
    if (tier !== undefined) {
      query.tier = Number(tier);
    }
    
    // Filter by parent folder (null for root folders)
    if (parentFolder !== undefined) {
      if (parentFolder === 'null' || parentFolder === '') {
        query.parentFolder = null;
      } else {
        query.parentFolder = parentFolder;
      }
    }
    
    // Filter by active status
    if (includeInactive !== 'true') {
      query.isActive = true;
    }
    
    const folders = await Folder.find(query)
      .sort({ order: 1, createdAt: -1 })
      .populate('parentFolder', 'name')
      .lean();
    
    // Get file counts for each folder
    const foldersWithCounts = await Promise.all(
      folders.map(async (folder) => {
        const fileCount = await File.countDocuments({
          folder: folder._id,
          isActive: true,
        });
        return {
          ...folder,
          fileCount,
        };
      })
    );
    
    res.status(200).json({
      success: true,
      data: foldersWithCounts,
    });
  } catch (error: any) {
    console.error('Get folders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch folders',
      error: error.message,
    });
  }
};

// @desc    Get single folder
// @route   GET /api/folders/:id
// @access  Public
export const getFolder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const folder = await Folder.findById(id)
      .populate('parentFolder', 'name')
      .lean();
    
    if (!folder) {
      res.status(404).json({
        success: false,
        message: 'Folder not found',
      });
      return;
    }
    
    // Get file count
    const fileCount = await File.countDocuments({
      folder: id,
      isActive: true,
    });
    
    res.status(200).json({
      success: true,
      data: {
        ...folder,
        fileCount,
      },
    });
  } catch (error: any) {
    console.error('Get folder error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch folder',
      error: error.message,
    });
  }
};

// @desc    Create folder
// @route   POST /api/folders
// @access  Private (Admin)
export const createFolder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, description, parentFolder, tier, color, icon, order } = req.body;
    
    if (!name || !name.trim()) {
      res.status(400).json({
        success: false,
        message: 'Folder name is required',
      });
      return;
    }
    
    // Validate parent folder if provided
    if (parentFolder) {
      const parent = await Folder.findById(parentFolder);
      if (!parent) {
        res.status(400).json({
          success: false,
          message: 'Parent folder not found',
        });
        return;
      }
    }
    
    // Parse tier
    const tierValue = tier !== undefined ? Number(tier) : -1;
    const validTier = tierValue >= -1 && tierValue <= 2 ? tierValue : -1;
    
    const folder = await Folder.create({
      name: name.trim(),
      description: description?.trim() || '',
      parentFolder: parentFolder || null,
      tier: validTier,
      color: color || '#3B82F6',
      icon: icon || '',
      order: order || 0,
      createdBy: req.admin?.id,
      createdByName: req.admin?.username || 'Admin',
    });
    
    res.status(201).json({
      success: true,
      message: 'Folder created successfully',
      data: folder,
    });
  } catch (error: any) {
    console.error('Create folder error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create folder',
      error: error.message,
    });
  }
};

// @desc    Update folder
// @route   PUT /api/folders/:id
// @access  Private (Admin)
export const updateFolder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description, parentFolder, tier, color, icon, order, isActive } = req.body;
    
    const folder = await Folder.findById(id);
    
    if (!folder) {
      res.status(404).json({
        success: false,
        message: 'Folder not found',
      });
      return;
    }
    
    // Prevent circular reference (folder cannot be its own parent)
    if (parentFolder && parentFolder === id) {
      res.status(400).json({
        success: false,
        message: 'Folder cannot be its own parent',
      });
      return;
    }
    
    // Validate parent folder if provided
    if (parentFolder !== undefined) {
      if (parentFolder && parentFolder !== 'null') {
        const parent = await Folder.findById(parentFolder);
        if (!parent) {
          res.status(400).json({
            success: false,
            message: 'Parent folder not found',
          });
          return;
        }
        // Prevent nested folder depth issues (optional check)
        // You can add logic here to prevent too deep nesting if needed
      }
    }
    
    // Update fields
    if (name !== undefined) folder.name = name.trim();
    if (description !== undefined) folder.description = description?.trim() || '';
    if (parentFolder !== undefined) folder.parentFolder = parentFolder === 'null' || parentFolder === '' ? null : parentFolder;
    if (tier !== undefined) folder.tier = Number(tier) >= -1 && Number(tier) <= 2 ? Number(tier) : folder.tier;
    if (color !== undefined) folder.color = color;
    if (icon !== undefined) folder.icon = icon;
    if (order !== undefined) folder.order = Number(order);
    if (isActive !== undefined) folder.isActive = isActive;
    
    await folder.save();
    
    res.status(200).json({
      success: true,
      message: 'Folder updated successfully',
      data: folder,
    });
  } catch (error: any) {
    console.error('Update folder error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update folder',
      error: error.message,
    });
  }
};

// @desc    Delete folder
// @route   DELETE /api/folders/:id
// @access  Private (Admin)
export const deleteFolder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { moveFilesTo } = req.query; // Optional: move files to another folder
    
    const folder = await Folder.findById(id);
    
    if (!folder) {
      res.status(404).json({
        success: false,
        message: 'Folder not found',
      });
      return;
    }
    
    // Check if folder has subfolders
    const subfolders = await Folder.countDocuments({ parentFolder: id, isActive: true });
    if (subfolders > 0) {
      res.status(400).json({
        success: false,
        message: 'Cannot delete folder with subfolders. Please delete or move subfolders first.',
      });
      return;
    }
    
    // Handle files in the folder
    const filesInFolder = await File.countDocuments({ folder: id });
    
    if (filesInFolder > 0) {
      if (moveFilesTo) {
        // Move files to another folder
        const targetFolder = await Folder.findById(moveFilesTo);
        if (!targetFolder) {
          res.status(400).json({
            success: false,
            message: 'Target folder not found',
          });
          return;
        }
        
        await File.updateMany(
          { folder: id },
          { folder: moveFilesTo }
        );
      } else {
        // Move files to root (no folder)
        await File.updateMany(
          { folder: id },
          { $unset: { folder: 1 } }
        );
      }
    }
    
    // Delete the folder
    await folder.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Folder deleted successfully',
      data: {
        movedFiles: filesInFolder,
      },
    });
  } catch (error: any) {
    console.error('Delete folder error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete folder',
      error: error.message,
    });
  }
};

// @desc    Get folder tree (hierarchical structure)
// @route   GET /api/folders/tree
// @access  Public
export const getFolderTree = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { tier, includeInactive } = req.query;
    
    const query: any = { isActive: includeInactive !== 'true' ? true : undefined };
    if (tier !== undefined) {
      query.tier = Number(tier);
    }
    
    const folders = await Folder.find(query)
      .sort({ order: 1, createdAt: -1 })
      .lean();
    
    // Type for folder tree structure
    type FolderTreeItem = any & {
      children?: FolderTreeItem[];
    };
    
    // Build tree structure
    const buildTree = (parentId: string | null = null): FolderTreeItem[] => {
      return folders
        .filter(folder => {
          const folderParentId = folder.parentFolder 
            ? (folder.parentFolder as any)._id?.toString() || folder.parentFolder.toString()
            : null;
          return folderParentId === parentId;
        })
        .map((folder): FolderTreeItem => {
          const folderId = folder._id.toString();
          const children: FolderTreeItem[] = buildTree(folderId);
          
          return {
            ...folder,
            children: children.length > 0 ? children : undefined,
          };
        });
    };
    
    const tree = buildTree();
    
    res.status(200).json({
      success: true,
      data: tree,
    });
  } catch (error: any) {
    console.error('Get folder tree error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch folder tree',
      error: error.message,
    });
  }
};

