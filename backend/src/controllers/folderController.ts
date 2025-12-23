import { Response } from 'express';
import Folder from '../models/Folder';
import File from '../models/File';
import { AuthRequest } from '../middleware/auth';
import { getUserTier } from '../config/blockchain';

// Helper function to get all descendant folders recursively
const getAllDescendantFolders = async (folderId: string): Promise<string[]> => {
  const childFolders = await Folder.find({ parentFolder: folderId }).select('_id').lean();
  const childIds = childFolders.map(f => f._id.toString());
  
  if (childIds.length === 0) {
    return [];
  }
  
  const allDescendants = [...childIds];
  for (const childId of childIds) {
    const grandChildren = await getAllDescendantFolders(childId);
    allDescendants.push(...grandChildren);
  }
  
  return allDescendants;
};

// Helper function to get all files in folder tree
const getAllFilesInFolderTree = async (folderId: string): Promise<string[]> => {
  const descendantFolderIds = await getAllDescendantFolders(folderId);
  const allFolderIds = [folderId, ...descendantFolderIds];
  
  const files = await File.find({ folder: { $in: allFolderIds } }).select('_id').lean();
  return files.map(f => f._id.toString());
};

// Helper function to cascade tier to subfolders
const cascadeTierToSubfolders = async (folderId: string, newTier: number): Promise<void> => {
  const descendantFolderIds = await getAllDescendantFolders(folderId);
  
  if (descendantFolderIds.length > 0) {
    await Folder.updateMany(
      { _id: { $in: descendantFolderIds } },
      { $set: { tier: newTier } }
    );
  }
};

// Helper function to cascade tier to files
const cascadeTierToFiles = async (folderId: string, newTier: number): Promise<void> => {
  const fileIds = await getAllFilesInFolderTree(folderId);
  
  if (fileIds.length > 0) {
    await File.updateMany(
      { _id: { $in: fileIds } },
      { $set: { tier: newTier } }
    );
  }
};

// Helper function to check if a folder is an ancestor of another folder
const isAncestor = async (potentialAncestorId: string, folderId: string): Promise<boolean> => {
  const descendantIds = await getAllDescendantFolders(folderId);
  return descendantIds.includes(potentialAncestorId);
};

// @desc    Get all folders
// @route   GET /api/folders
// @access  Public
export const getFolders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { tier, parentFolder, includeInactive, walletAddress } = req.query;
    
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
    
    // Filter by user tier access if walletAddress is provided
    let accessibleFolders = folders;
    if (walletAddress && typeof walletAddress === 'string') {
      try {
        const userTier = await getUserTier(walletAddress);
        accessibleFolders = folders.filter((folder) => {
          // Admin folders (-1) are not accessible to regular users
          if (folder.tier === -1) {
            return false;
          }
          // User must have unlocked the required tier or higher
          if (folder.tier >= 0) {
            return userTier >= 0 && userTier >= folder.tier;
          }
          return true;
        });
      } catch (error) {
        console.error('Error verifying user tier for folders:', error);
        // If tier check fails, return empty array for security
        accessibleFolders = [];
      }
    }
    
    // Get file counts for each folder
    const foldersWithCounts = await Promise.all(
      accessibleFolders.map(async (folder) => {
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
    const { walletAddress } = req.query;
    
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
    
    // Verify access if walletAddress is provided
    if (walletAddress && typeof walletAddress === 'string') {
      // Admin folders (-1) are not accessible to regular users
      if (folder.tier === -1) {
        res.status(403).json({
          success: false,
          message: 'Insufficient tier access',
          requiredTier: folder.tier,
          requiredTierName: 'Admin',
        });
        return;
      }
      
      // Check tier access for tier-restricted folders
      if (folder.tier >= 0) {
        try {
          const userTier = await getUserTier(walletAddress);
          // User must have unlocked the required tier or higher
          if (userTier < 0 || userTier < folder.tier) {
            res.status(403).json({
              success: false,
              message: 'Insufficient tier access',
              requiredTier: folder.tier,
              userTier,
              requiredTierName: folder.tier === 0 ? 'Tier 1' : folder.tier === 1 ? 'Tier 2' : 'Tier 3',
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
        
        // Prevent circular dependency (folder cannot be moved into its own descendant)
        const wouldCreateCircle = await isAncestor(parentFolder, id);
        if (wouldCreateCircle) {
          res.status(400).json({
            success: false,
            message: 'Cannot move folder into its own subfolder',
          });
          return;
        }
      }
    }
    
    // Track if we need to cascade tier changes
    let needsCascade = false;
    let newTier = folder.tier;
    let movedToParent = false;
    
    console.log('📝 Update folder request:', {
      folderId: id,
      folderName: folder.name,
      currentTier: folder.tier,
      currentParent: folder.parentFolder?.toString(),
      requestedParent: parentFolder,
      requestedTier: tier,
    });
    
    // Update fields
    if (name !== undefined) folder.name = name.trim();
    if (description !== undefined) folder.description = description?.trim() || '';
    
    // Handle parent folder change - inherit tier from new parent
    if (parentFolder !== undefined) {
      const oldParent = folder.parentFolder?.toString();
      const newParent = parentFolder === 'null' || parentFolder === '' ? null : parentFolder;
      
      // If parent is actually changing
      if (oldParent !== newParent) {
        console.log('🔄 Parent folder changing:', { oldParent, newParent });
        folder.parentFolder = newParent;
        
        // If moving to a parent folder, inherit its tier
        if (newParent) {
          movedToParent = true;
          const parentDoc = await Folder.findById(newParent);
          if (parentDoc) {
            console.log('👨‍👦 Moving to parent folder, inheriting tier:', {
              parentName: parentDoc.name,
              parentTier: parentDoc.tier,
              oldFolderTier: folder.tier,
            });
            if (parentDoc.tier !== folder.tier) {
              newTier = parentDoc.tier;
              folder.tier = newTier;
              needsCascade = true;
              console.log('✅ Tier inherited and will cascade');
            }
          }
        }
        // If moving to root, allow manual tier update below
      }
    }
    
    // Handle explicit tier update with cascading
    // Only allow explicit tier update if NOT moving to a parent folder
    if (tier !== undefined) {
      if (movedToParent) {
        console.log('⚠️ Explicit tier update ignored - folder moved to parent, tier inherited');
      } else {
        const tierValue = Number(tier);
        if (tierValue >= -1 && tierValue <= 2) {
          if (folder.tier !== tierValue) {
            console.log('🔄 Explicit tier update:', { oldTier: folder.tier, newTier: tierValue });
            newTier = tierValue;
            folder.tier = newTier;
            needsCascade = true;
          }
        }
      }
    }
    
    // Cascade tier to children if needed
    if (needsCascade) {
      console.log('🌊 Cascading tier to subfolders and files:', { folderId: id, newTier });
      await cascadeTierToSubfolders(id, newTier);
      await cascadeTierToFiles(id, newTier);
      console.log('✅ Tier cascade complete');
    }
    
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
        // Move files to another folder and inherit its tier
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
          { 
            folder: moveFilesTo,
            tier: targetFolder.tier // Inherit tier from target folder
          }
        );
      } else {
        // Move files to root (no folder) - keep their current tier
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

