import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, File, Image, FileText, Video, Music, AlertCircle, Lock, Folder, ChevronRight, ChevronDown } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { trackFileDownload } from '../utils/analytics';
import { getIconFromName } from '../utils/iconUtils';

interface ContentFile {
  id: string;
  txId: string;
  fileName: string;
  fileType: string;
  description: string;
  tier: number;
  uploadDate: string;
  fileSize?: number;
  fileData?: string; // Base64 data for local files
  downloadUrl?: string; // API download URL
  downloads?: number; // Download count
  folder?: {
    _id: string;
    name?: string;
    description?: string;
    tier?: number;
    color?: string;
    icon?: string;
  } | string | null; // Folder can be object, ID string, or null
}

interface ContentDownloadsProps {
  userInfo: any;
  userTier: number;
  hasAccess: boolean;
  isLoading: boolean;
  onRefreshTier?: () => Promise<void>;
}

export const ContentDownloads: React.FC<ContentDownloadsProps> = ({
  userInfo,
  userTier,
  hasAccess,
  isLoading,
  onRefreshTier,
}) => {
  const { addToast } = useToast();
  const [availableFiles, setAvailableFiles] = useState<ContentFile[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<ContentFile[]>([]);
  const [selectedTier, setSelectedTier] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [downloadStats, setDownloadStats] = useState<any>(null);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filesPerPage] = useState(12);
  const [totalFiles, setTotalFiles] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'downloads' | 'tier'>('tier');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [folders, setFolders] = useState<any[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'list' | 'folders'>('folders');
  const navigate = useNavigate();

  // Define functions before useEffect hooks
  const loadFolders = useCallback(async () => {
    try {
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
      const response = await fetch(`${API_BASE_URL}/folders?includeInactive=false`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setFolders(data.data);
        }
      }
    } catch (error) {
      console.error('Failed to load folders:', error);
    }
  }, []);

  const loadAvailableFiles = useCallback(async () => {
    try {
      // Fetch files from backend API
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
      const walletAddress = userInfo?.address;
      
      // Build query parameters
      const params = new URLSearchParams();
      if (walletAddress) {
        params.append('walletAddress', walletAddress);
      }
      if (selectedFolder) {
        params.append('folder', selectedFolder);
      }
      params.append('page', currentPage.toString());
      params.append('limit', filesPerPage.toString());
      
      const response = await fetch(`${API_BASE_URL}/files?${params.toString()}`);
      
      // Handle rate limit errors
      if (response.status === 429) {
        const errorText = await response.text();
        console.warn('Rate limit reached for files API:', errorText);
        // Keep existing files instead of clearing them
        // The rate limit will reset, and files will reload on next attempt
        return;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.data?.files) {
        // Format files from API response
        const allFiles: ContentFile[] = data.data.files.map((f: any) => {
          // Handle tier properly - tier can be 0, 1, 2, or -1
          // Use nullish coalescing to only default to -1 if tier is null/undefined
          const fileTier = f.tier !== undefined && f.tier !== null ? Number(f.tier) : -1;
          
          return {
            id: f._id || f.id,
            txId: f.arweaveTxId || f._id,
            fileName: f.originalName || f.fileName || 'Untitled',
            fileType: f.fileType || 'unknown',
            description: f.description || '',
            tier: fileTier,
            uploadDate: f.createdAt || new Date().toISOString(),
            fileSize: f.fileSize || 0,
            downloads: f.downloads || 0,
            folder: f.folder,
            downloadUrl: `${API_BASE_URL}/files/${f._id}/download`, // Don't include walletAddress here
          };
        });
        
        // Update pagination info
        if (data.data.pagination) {
          setTotalFiles(data.data.pagination.total);
          setTotalPages(data.data.pagination.pages);
        }
        
        setAvailableFiles(allFiles);
      } else {
        // Fallback to localStorage if API fails
        const storedFiles = JSON.parse(localStorage.getItem('userFiles') || '[]');
        const tierFiles = JSON.parse(localStorage.getItem('tierFiles') || '[]');
        
        const allFiles: ContentFile[] = [
          ...storedFiles.map((f: any) => ({
            id: f.txId || f.id,
            txId: f.txId,
            fileName: f.fileName || 'Untitled',
            fileType: f.fileType || 'unknown',
            description: f.description || '',
            tier: -1,
            uploadDate: f.uploadDate || new Date().toISOString(),
            fileSize: f.fileSize,
            fileData: f.fileData,
          })),
          ...tierFiles.map((f: any) => ({
            id: f.txId || f.id,
            txId: f.txId,
            fileName: f.fileName || 'Untitled',
            fileType: f.fileType || 'unknown',
            description: f.description || '',
            tier: f.tier || 0,
            uploadDate: f.uploadDate || new Date().toISOString(),
            fileSize: f.fileSize,
          })),
        ];
        
        setAvailableFiles(allFiles);
      }
    } catch (err: any) {
      console.error('Failed to load files from API:', err);
      // Fallback to localStorage
      try {
        const storedFiles = JSON.parse(localStorage.getItem('userFiles') || '[]');
        const tierFiles = JSON.parse(localStorage.getItem('tierFiles') || '[]');
        
        const allFiles: ContentFile[] = [
          ...storedFiles.map((f: any) => ({
            id: f.txId || f.id,
            txId: f.txId,
            fileName: f.fileName || 'Untitled',
            fileType: f.fileType || 'unknown',
            description: f.description || '',
            tier: -1,
            uploadDate: f.uploadDate || new Date().toISOString(),
            fileSize: f.fileSize,
            fileData: f.fileData,
          })),
          ...tierFiles.map((f: any) => ({
            id: f.txId || f.id,
            txId: f.txId,
            fileName: f.fileName || 'Untitled',
            fileType: f.fileType || 'unknown',
            description: f.description || '',
            tier: f.tier || 0,
            uploadDate: f.uploadDate || new Date().toISOString(),
            fileSize: f.fileSize,
          })),
        ];
        
        setAvailableFiles(allFiles);
      } catch (localErr) {
        console.error('Failed to load files from localStorage:', localErr);
      }
    }
  }, [userInfo?.address, currentPage, filesPerPage, selectedFolder]);

  // Check if user can access a file based on their tier
  const canAccessFile = (file: ContentFile): boolean => {
    // Admin files (-1) are not accessible to regular users
    if (file.tier === -1) {
      return false; // Admin-only files
    }
    // User must have unlocked the required tier or higher
    if (userTier >= 0) {
      const canAccess = file.tier <= userTier;
      // Only log in development mode and for debugging
      if (process.env.NODE_ENV === 'development' && process.env.REACT_APP_DEBUG_TIER === 'true') {
        console.log(`[canAccessFile] File: ${file.fileName}, file.tier: ${file.tier}, userTier: ${userTier}, canAccess: ${canAccess}`);
      }
      return canAccess;
    }
    // No tier unlocked
    if (process.env.NODE_ENV === 'development' && process.env.REACT_APP_DEBUG_TIER === 'true') {
      console.log(`[canAccessFile] File: ${file.fileName}, userTier: ${userTier}, NO TIER UNLOCKED`);
    }
    return false;
  };

  const filterFiles = useCallback(() => {
    let filtered = [...availableFiles];

    // Show ALL files (don't filter by access - access only affects downloadability)
    // Filter by selected tier
    if (selectedTier !== 'all') {
      filtered = filtered.filter(
        (file) => file.tier === selectedTier
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (file) =>
          file.fileName.toLowerCase().includes(query) ||
          file.description.toLowerCase().includes(query) ||
          file.fileType.toLowerCase().includes(query)
      );
    }

    // Sort files
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'tier':
          // Sort by tier first (ascending: Tier 1, Tier 2, Tier 3, Admin)
          // Admin (-1) should come last
          const tierA = a.tier === -1 ? 999 : a.tier;
          const tierB = b.tier === -1 ? 999 : b.tier;
          comparison = tierA - tierB;
          // If tiers are equal, sort by date as secondary sort
          if (comparison === 0) {
            comparison = new Date(a.uploadDate).getTime() - new Date(b.uploadDate).getTime();
          }
          break;
        case 'name':
          comparison = a.fileName.localeCompare(b.fileName);
          break;
        case 'date':
          comparison = new Date(a.uploadDate).getTime() - new Date(b.uploadDate).getTime();
          break;
        case 'downloads':
          comparison = (a.downloads || 0) - (b.downloads || 0);
          break;
        default:
          comparison = 0;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredFiles(filtered);
  }, [availableFiles, selectedTier, searchQuery, sortBy, sortOrder]);

  const loadDownloadStats = useCallback(async () => {
    if (!userInfo?.address) return;
    
    try {
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
      const response = await fetch(
        `${API_BASE_URL}/files/stats/download?walletAddress=${userInfo.address}`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setDownloadStats(data.data);
        }
      }
    } catch (error) {
      console.error('Failed to load download stats:', error);
    }
  }, [userInfo?.address]);

  // useEffect hooks after function definitions
  useEffect(() => {
    loadFolders();
    loadAvailableFiles();
    loadDownloadStats();
  }, [loadFolders, loadAvailableFiles, loadDownloadStats, userTier, hasAccess, userInfo?.address, currentPage, filesPerPage, sortBy, sortOrder, selectedFolder]);

  useEffect(() => {
    filterFiles();
  }, [filterFiles]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedTier, selectedFolder]);

  const handleDownload = async (file: ContentFile) => {
    console.log('[handleDownload] Called with file:', file.id, file.fileName);
    
    if (!userInfo?.address) {
      console.log('[handleDownload] No wallet address, returning');
      addToast({
        type: 'warning',
        title: 'Wallet Required',
        message: 'Please connect your wallet to download files',
      });
      return;
    }

    // Prevent multiple simultaneous downloads of the same file
    if (downloadingFileId === file.id) {
      console.log('[handleDownload] Already downloading this file, returning');
      return;
    }

    console.log('[handleDownload] Starting download process...');
    setDownloadingFileId(file.id);
    
    // Log current frontend tier state for debugging
    console.log('[handleDownload] Frontend tier state:', {
      userTier,
      fileTier: file.tier,
      canAccess: canAccessFile(file),
      userAddress: userInfo.address,
    });
    
    // Refresh tier from blockchain before download to ensure we have latest data
    // The backend will verify anyway, but this helps prevent user confusion
    if (onRefreshTier) {
      try {
        console.log('[handleDownload] Refreshing tier from blockchain...');
        await onRefreshTier();
        // Small delay to allow state to update
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (refreshError) {
        console.warn('[handleDownload] Failed to refresh tier, proceeding anyway:', refreshError);
        // Continue with download - backend will verify tier anyway
      }
    }
    
    try {
      if (file.fileData) {
        // Download from base64 data (local files)
        const link = document.createElement('a');
        link.href = file.fileData;
        link.download = file.fileName || `file.${file.fileType}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setDownloadingFileId(null);
        return;
      }

      if (file.txId && !file.downloadUrl) {
        // Open Arweave URL
        window.open(`https://arweave.net/${file.txId}`, '_blank');
        setDownloadingFileId(null);
        return;
      }

      // Use pre-signed URL for secure download
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
      
      // Step 1: Request pre-signed URL
      const presignedResponse = await fetch(
        `${API_BASE_URL}/files/${file.id}/presigned?walletAddress=${userInfo.address}`
      );
      
      if (!presignedResponse.ok) {
        const errorData = await presignedResponse.json();
        
        if (presignedResponse.status === 429) {
          // Rate limit or quota exceeded
          const message = errorData.message || 'Daily download limit exceeded';
          const remaining = errorData.remaining !== undefined ? `Remaining: ${errorData.remaining}` : '';
          const resetTime = errorData.resetTime ? `Resets: ${errorData.resetTime}` : '';
          
          addToast({
            type: 'error',
            title: 'Download Limit Exceeded',
            message: `${message}${remaining ? `\n${remaining}` : ''}${resetTime ? `\n${resetTime}` : ''}`,
            duration: 8000, // Show for 8 seconds
          });
        } else if (presignedResponse.status === 403 && errorData.message?.includes('tier')) {
          // Insufficient tier access
          const requiredTier = errorData.requiredTierName || `Tier ${(errorData.requiredTier ?? 0) + 1}`;
          const userTier = errorData.userTierName || (errorData.userTier === -1 ? 'None' : `Tier ${(errorData.userTier ?? -1) + 1}`);
          const detailedMessage = `This file requires ${requiredTier} access.\nYour current tier: ${userTier}.\n\nNote: Tier is calculated based on USD value of staked tokens, not token count. If you just staked, please wait a few seconds and try again, or refresh the page.`;
          
          addToast({
            type: 'error',
            title: 'Insufficient Tier Access',
            message: detailedMessage,
            duration: 10000, // Show for 10 seconds
          });
          
          // Log detailed tier information for debugging
          console.error('[Download Error] Tier mismatch:', {
            fileTier: file.tier,
            requiredTier: errorData.requiredTier,
            requiredTierName: errorData.requiredTierName,
            userTier: errorData.userTier,
            userTierName: errorData.userTierName,
            frontendUserTier: userTier,
            file: file.fileName,
          });
        } else {
          addToast({
            type: 'error',
            title: 'Download Failed',
            message: errorData.message || 'Failed to generate download link',
          });
        }
        setDownloadingFileId(null);
        return;
      }

      const presignedData = await presignedResponse.json();
      
      // Validate response
      if (!presignedData.success || !presignedData.downloadUrl) {
        console.error('[Download Error] Invalid presigned response:', presignedData);
        addToast({
          type: 'error',
          title: 'Download Failed',
          message: presignedData.message || 'Invalid download URL received from server',
        });
        setDownloadingFileId(null);
        return;
      }
      
      // Show quota warning if present
      if (presignedData.warning) {
        const usedGB = (presignedData.warning.used / (1024 * 1024 * 1024)).toFixed(2);
        const limitGB = (presignedData.warning.limit / (1024 * 1024 * 1024)).toFixed(2);
        const percentage = presignedData.warning.percentage.toFixed(1);
        
        addToast({
          type: 'warning',
          title: 'Quota Warning',
          message: `You've used ${usedGB} GB / ${limitGB} GB (${percentage}%) of your monthly quota.`,
          duration: 6000,
        });
        // Continue with download automatically (no confirmation needed)
      }

      // Step 2: Construct download URL
      // The downloadUrl from backend is relative (e.g., /files/:id/download?token=...)
      // We need to prepend the API base URL
      let downloadUrl: string;
      if (presignedData.downloadUrl.startsWith('http://') || presignedData.downloadUrl.startsWith('https://')) {
        // Already a full URL
        downloadUrl = presignedData.downloadUrl;
      } else if (presignedData.downloadUrl.startsWith('/')) {
        // Relative URL starting with /
        downloadUrl = `${API_BASE_URL}${presignedData.downloadUrl}`;
      } else {
        // Relative URL without leading /
        downloadUrl = `${API_BASE_URL}/${presignedData.downloadUrl}`;
      }
      
      console.log('[Download] Presigned data:', presignedData);
      console.log('[Download] Constructed download URL:', downloadUrl);
      
      // Validate URL before proceeding
      if (!downloadUrl || downloadUrl === 'about:blank' || downloadUrl.trim() === '' || !downloadUrl.startsWith('http')) {
        console.error('[Download Error] Invalid download URL:', downloadUrl);
        addToast({
          type: 'error',
          title: 'Download Failed',
          message: 'Invalid download URL. Please try again.',
        });
        setDownloadingFileId(null);
        return;
      }
      
      // Use simple browser-handled download
      // The server's Content-Disposition header will trigger the download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = file.fileName || `file.${file.fileType}`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
        setDownloadingFileId(null);
      }, 100);
      
      // Track download in Google Analytics
      trackFileDownload(file.id, file.fileName, file.tier);
      
      // Reset loading state immediately (download happens in background)
      setDownloadingFileId(null);
      
      // Refresh stats after a short delay to allow download to complete
      setTimeout(() => {
        loadDownloadStats();
      }, 1000);
      
    } catch (error: any) {
      console.error('Download error:', error);
      addToast({
        type: 'error',
        title: 'Download Failed',
        message: error.message || 'Failed to download file',
      });
    } finally {
      setDownloadingFileId(null);
    }
  };

  const getFileIcon = (fileType: string) => {
    const type = fileType.toLowerCase();
    if (['pdf'].includes(type)) return <FileText className="h-6 w-6 text-red-600" />;
    if (['jpg', 'jpeg', 'png', 'gif', 'svg'].includes(type)) return <Image className="h-6 w-6 text-blue-600" />;
    if (['mp4', 'avi', 'mov', 'webm'].includes(type)) return <Video className="h-6 w-6 text-purple-600" />;
    if (['mp3', 'wav', 'ogg'].includes(type)) return <Music className="h-6 w-6 text-green-600" />;
    return <File className="h-6 w-6 text-gray-600" />;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (!hasAccess) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center py-12">
          <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Access Required
          </h3>
          <p className="text-gray-600 mb-4">
            You need to stake tokens to access downloadable content
          </p>
          <p className="text-sm text-gray-500">
            Stake at least $24 worth of tokens to unlock Tier 1 content
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <Download className="h-6 w-6 text-blue-600 mr-2" />
          Content Downloads
        </h2>
        {userTier >= 0 && (
          <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
            Tier {userTier + 1}
          </span>
        )}
      </div>

      {/* Download Statistics - Simplified */}
      {downloadStats && userInfo?.address && (
        <div className="mb-6 p-3 bg-gray-50 rounded-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-sm">
            <span className="text-gray-600">
              Daily: {downloadStats.dailyDownloads}/{downloadStats.dailyLimit}
            </span>
            <span className="text-gray-600">
              Monthly: {downloadStats.monthlyUsedGB}GB / {downloadStats.monthlyLimitGB}GB
            </span>
          </div>
        </div>
      )}

      {/* Search and Filter - Simplified */}
      <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <input
          type="text"
          placeholder="Search files..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
        />
          {userTier >= 0 && (
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
              title="Filter by tier"
              aria-label="Filter files by tier"
            >
              <option value="all">All Tiers</option>
              <option value="0">Tier 1</option>
              <option value="1">Tier 2</option>
              <option value="2">Tier 3</option>
            </select>
          )}
          <select
            value={selectedFolder || ''}
            onChange={(e) => setSelectedFolder(e.target.value || null)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
            title="Filter by folder"
            aria-label="Filter files by folder"
          >
            <option value="">All Folders</option>
            <option value="null">No Folder</option>
            {folders.map((folder) => (
              <option key={folder._id} value={folder._id}>
                {folder.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => setViewMode(viewMode === 'folders' ? 'list' : 'folders')}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
            title={`Switch to ${viewMode === 'folders' ? 'list' : 'folder'} view`}
          >
            {viewMode === 'folders' ? '📁' : '📋'}
          </button>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'date' | 'name' | 'downloads' | 'tier')}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
          title="Sort by"
          aria-label="Sort files"
        >
          <option value="tier">Sort by Tier</option>
          <option value="date">Sort by Date</option>
          <option value="name">Sort by Name</option>
          <option value="downloads">Sort by Downloads</option>
        </select>
        <button
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
          title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
          aria-label="Toggle sort order"
        >
          {sortOrder === 'asc' ? '↑' : '↓'}
        </button>
      </div>

      {/* Files List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading files...</span>
        </div>
      ) : viewMode === 'folders' ? (
        <div className="space-y-4">
          {(() => {
            // Build folder tree - get root folders (no parent)
            const getRootFolders = () => {
              return folders.filter(f => {
                const parentId = typeof f.parentFolder === 'string' ? f.parentFolder : f.parentFolder?._id;
                return !parentId;
              });
            };

            // Get child folders of a parent
            const getChildFolders = (parentId: string) => {
              return folders.filter(f => {
                const parentIdValue = typeof f.parentFolder === 'string' ? f.parentFolder : f.parentFolder?._id;
                return parentIdValue === parentId;
              });
            };

            // Render folder tree recursively
            const renderFolderTree = (parentId: string | null = null, level: number = 0): JSX.Element[] => {
              const foldersToRender = parentId ? getChildFolders(parentId) : getRootFolders();
              
              return foldersToRender.map((folder) => {
                const folderFiles = filteredFiles.filter((file) => {
                  if (!file.folder) return false;
                  if (typeof file.folder === 'string') {
                    return file.folder === folder._id;
                  }
                  if (typeof file.folder === 'object' && file.folder !== null && '_id' in file.folder) {
                    return file.folder._id === folder._id;
                  }
                  return false;
                });
                const childFolders = getChildFolders(folder._id);
                const isExpanded = expandedFolders.has(folder._id);
                const hasChildren = childFolders.length > 0 || folderFiles.length > 0;
                
                // Show all folders, even if empty
                
                return (
                  <div 
                    key={folder._id} 
                    className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden transition-all duration-200 hover:border-primary-300 dark:hover:border-primary-600 hover:shadow-md group cursor-pointer active:scale-[0.98]" 
                    style={{ marginLeft: `${level * 20}px` }}
                    onClick={(e) => {
                      // Add visual feedback to entire card
                      const card = e.currentTarget;
                      card.style.transform = 'scale(0.98)';
                      card.style.opacity = '0.9';
                      setTimeout(() => {
                        card.style.transform = '';
                        card.style.opacity = '';
                        navigate(`/content/folders/${folder._id}`);
                      }, 150);
                    }}
                  >
                    <div className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 hover:bg-gradient-to-r hover:from-primary-50/50 hover:to-transparent dark:hover:from-primary-900/20 dark:hover:to-transparent transition-all duration-200">
                      <div className="flex items-center gap-3 flex-1">
                        {hasChildren && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const newExpanded = new Set(expandedFolders);
                              if (newExpanded.has(folder._id)) {
                                newExpanded.delete(folder._id);
                              } else {
                                newExpanded.add(folder._id);
                              }
                              setExpandedFolders(newExpanded);
                            }}
                            className="p-1 hover:bg-primary-100 dark:hover:bg-primary-900/30 rounded transition-colors z-10"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                            )}
                          </button>
                        )}
                        {!hasChildren && <div className="w-6" />}
                        <div
                          className="w-4 h-4 rounded flex-shrink-0 shadow-sm transition-transform group-hover:scale-110"
                          style={{ backgroundColor: folder.color || '#3B82F6' }}
                        />
                        {(() => {
                          const IconComponent = getIconFromName(folder.icon);
                          return <IconComponent className="h-5 w-5 text-gray-500 dark:text-gray-400 flex-shrink-0 transition-colors group-hover:text-primary-600 dark:group-hover:text-primary-400" />;
                        })()}
                        <div className="text-left flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{folder.name}</h3>
                          {folder.description && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">{folder.description}</p>
                          )}
                        </div>
                        <span className="text-sm text-gray-500 dark:text-gray-400 ml-2 whitespace-nowrap px-2 py-1 rounded bg-white/50 dark:bg-gray-700/50 transition-colors">
                          ({folderFiles.length} {folderFiles.length === 1 ? 'file' : 'files'})
                          {childFolders.length > 0 && `, ${childFolders.length} ${childFolders.length === 1 ? 'folder' : 'folders'}`}
                        </span>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="p-4 space-y-4">
                        {/* Render subfolders */}
                        {childFolders.length > 0 && (
                          <div className="space-y-2 pl-2 border-l-2 border-gray-200 dark:border-gray-700">
                            {renderFolderTree(folder._id, level + 1)}
                          </div>
                        )}
                        {/* Render files in this folder */}
                        {folderFiles.length > 0 && (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {folderFiles.map((file) => (
                              <div
                                key={file.id}
                                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                              >
                        <div className="flex items-start space-x-3 mb-3">
                          {getFileIcon(file.fileType)}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-gray-900 truncate mb-1">
                              {file.fileName}
                            </h3>
                            <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                              {file.description || 'No description'}
                            </p>
                            <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                              <span className="uppercase">{file.fileType}</span>
                              {file.fileSize && <span>{formatFileSize(file.fileSize)}</span>}
                            </div>
                            <div className="mt-1">
                              {file.tier === -1 ? (
                                <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-800">
                                  Admin Only
                                </span>
                              ) : (
                                <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                                  file.tier === 0 ? 'bg-green-100 text-green-800' :
                                  file.tier === 1 ? 'bg-blue-100 text-blue-800' :
                                  file.tier === 2 ? 'bg-purple-100 text-purple-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  Tier {file.tier + 1}
                                </span>
                              )}
                            </div>
                            {!canAccessFile(file) && (
                              <div className="mt-1">
                                <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-800">
                                  <Lock className="h-3 w-3 mr-1" />
                                  Locked
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                          <span className="text-xs text-gray-500">
                            {formatDate(file.uploadDate)}
                          </span>
                          {canAccessFile(file) ? (
                            <button
                              onClick={() => handleDownload(file)}
                              disabled={downloadingFileId === file.id}
                              className={`px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors flex items-center text-sm ${
                                downloadingFileId === file.id ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                            >
                              {downloadingFileId === file.id ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                  Downloading...
                                </>
                              ) : (
                                <>
                                  <Download className="h-4 w-4 mr-2" />
                                  Download
                                </>
                              )}
                            </button>
                          ) : (
                            <button
                              disabled
                              className="px-4 py-2 bg-gray-300 text-gray-500 rounded-md cursor-not-allowed flex items-center text-sm"
                              title={file.tier === -1 ? 'Admin only' : `Requires Tier ${file.tier + 1} access`}
                            >
                              <Lock className="h-4 w-4 mr-2" />
                              Locked
                            </button>
                          )}
                        </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              });
            };

            const treeElements = renderFolderTree();
            const filteredTree = treeElements.filter((item): item is JSX.Element => item !== null);
            
            // Show empty state if no folders
            if (filteredTree.length === 0 && folders.length === 0) {
              return (
                <div className="text-center py-12">
                  <Folder className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No folders available</p>
                </div>
              );
            }
            
            return filteredTree;
          })()}
          {/* Files without folder */}
          {filteredFiles.filter((file) => {
            if (!file.folder) return true;
            if (typeof file.folder === 'string') return false;
            if (typeof file.folder === 'object' && file.folder !== null && '_id' in file.folder) {
              return !file.folder._id;
            }
            return true;
          }).length > 0 && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="p-4 bg-gray-50">
                <div className="flex items-center gap-3">
                  <Folder className="h-5 w-5 text-gray-400" />
                  <h3 className="font-semibold text-gray-900">No Folder</h3>
                  <span className="text-sm text-gray-500 ml-2">
                    ({filteredFiles.filter((file) => {
                      if (!file.folder) return true;
                      if (typeof file.folder === 'string') return false;
                      if (typeof file.folder === 'object' && file.folder !== null && '_id' in file.folder) {
                        return !file.folder._id;
                      }
                      return true;
                    }).length} files)
                  </span>
                </div>
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredFiles
                  .filter((file) => {
                    if (!file.folder) return true;
                    if (typeof file.folder === 'string') return false;
                    if (typeof file.folder === 'object' && file.folder !== null && '_id' in file.folder) {
                      return !file.folder._id;
                    }
                    return true;
                  })
                  .map((file) => (
                    <div
                      key={file.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start space-x-3 mb-3">
                        {getFileIcon(file.fileType)}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-gray-900 truncate mb-1">
                            {file.fileName}
                          </h3>
                          <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                            {file.description || 'No description'}
                          </p>
                          <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                            <span className="uppercase">{file.fileType}</span>
                            {file.fileSize && <span>{formatFileSize(file.fileSize)}</span>}
                          </div>
                          <div className="mt-1">
                            {file.tier === -1 ? (
                              <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-800">
                                Admin Only
                              </span>
                            ) : (
                              <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                                file.tier === 0 ? 'bg-green-100 text-green-800' :
                                file.tier === 1 ? 'bg-blue-100 text-blue-800' :
                                file.tier === 2 ? 'bg-purple-100 text-purple-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                Tier {file.tier + 1}
                              </span>
                            )}
                          </div>
                          {!canAccessFile(file) && (
                            <div className="mt-1">
                              <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-800">
                                <Lock className="h-3 w-3 mr-1" />
                                Locked
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                        <span className="text-xs text-gray-500">
                          {formatDate(file.uploadDate)}
                        </span>
                        {canAccessFile(file) ? (
                          <button
                            onClick={() => handleDownload(file)}
                            disabled={downloadingFileId === file.id}
                            className={`px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors flex items-center text-sm ${
                              downloadingFileId === file.id ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                          >
                            {downloadingFileId === file.id ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Downloading...
                              </>
                            ) : (
                              <>
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </>
                            )}
                          </button>
                        ) : (
                          <button
                            disabled
                            className="px-4 py-2 bg-gray-300 text-gray-500 rounded-md cursor-not-allowed flex items-center text-sm"
                            title={file.tier === -1 ? 'Admin only' : `Requires Tier ${file.tier + 1} access`}
                          >
                            <Lock className="h-4 w-4 mr-2" />
                            Locked
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="text-center py-12">
          <File className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No files available</p>
          <p className="text-sm text-gray-500 mt-2">
            {searchQuery ? 'Try adjusting your search' : 'Files will appear here once uploaded'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFiles.map((file) => (
            <div
              key={file.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start space-x-3 mb-3">
                {getFileIcon(file.fileType)}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 truncate mb-1">
                    {file.fileName}
                  </h3>
                  <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                    {file.description || 'No description'}
                  </p>
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                    <span className="uppercase">{file.fileType}</span>
                    {file.fileSize && <span>{formatFileSize(file.fileSize)}</span>}
                  </div>
                  {/* Tier Badge - Show for all files */}
                  <div className="mt-1">
                    {file.tier === -1 ? (
                      <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-800">
                        Admin Only
                      </span>
                    ) : (
                      <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                        file.tier === 0 ? 'bg-green-100 text-green-800' :
                        file.tier === 1 ? 'bg-blue-100 text-blue-800' :
                        file.tier === 2 ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        Tier {file.tier + 1}
                      </span>
                    )}
                  </div>
                  {/* Access Status */}
                  {!canAccessFile(file) && (
                    <div className="mt-1">
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-800">
                        <Lock className="h-3 w-3 mr-1" />
                        Locked
                      </span>
                    </div>
                  )}
                </div>
              </div>


              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                <span className="text-xs text-gray-500">
                  {formatDate(file.uploadDate)}
                </span>
                {canAccessFile(file) ? (
                  <button
                    onClick={() => handleDownload(file)}
                    disabled={downloadingFileId === file.id}
                    className={`px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors flex items-center text-sm ${
                      downloadingFileId === file.id ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {downloadingFileId === file.id ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Downloading...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    disabled
                    className="px-4 py-2 bg-gray-300 text-gray-500 rounded-md cursor-not-allowed flex items-center text-sm"
                    title={file.tier === -1 ? 'Admin only' : `Requires Tier ${file.tier + 1} access`}
                  >
                    <Lock className="h-4 w-4 mr-2" />
                    Locked
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
          <div className="text-sm text-gray-600">
            Showing {((currentPage - 1) * filesPerPage) + 1} to {Math.min(currentPage * filesPerPage, totalFiles)} of {totalFiles} files
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-2 border rounded-md text-sm ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};


