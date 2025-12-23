import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Folder,
  File,
  Download,
  Grid3x3,
  List,
  Search,
  X,
  ChevronRight,
  Lock,
  Image,
  Video,
  Music,
  FileText,
} from 'lucide-react';
import { getIconFromName } from '../utils/iconUtils';
import { useToast } from '../contexts/ToastContext';

interface ContentFile {
  id: string;
  txId: string;
  fileName: string;
  fileType: string;
  description: string;
  tier: number;
  uploadDate: string;
  fileSize?: number;
  fileData?: string;
  downloadUrl?: string;
  downloads?: number;
  folder?: {
    _id: string;
    name?: string;
    description?: string;
    tier?: number;
    color?: string;
    icon?: string;
  } | string | null;
}

interface FolderData {
  _id: string;
  name: string;
  description?: string;
  tier: number;
  color?: string;
  icon?: string;
  fileCount?: number;
  createdAt?: string;
  parentFolder?: any;
}

interface FolderDetailPageProps {
  userInfo: any;
  userTier: number;
  hasAccess: boolean;
  isLoading: boolean;
  onRefreshTier?: () => Promise<void>;
  onDownload?: (file: ContentFile) => Promise<void>;
}

export default function FolderDetailPage({
  userInfo,
  userTier,
  hasAccess,
  isLoading: propsLoading,
  onRefreshTier,
  onDownload,
}: FolderDetailPageProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { addToast } = useToast();
  
  const [folder, setFolder] = useState<FolderData | null>(null);
  const [files, setFiles] = useState<ContentFile[]>([]);
  const [subfolders, setSubfolders] = useState<FolderData[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<ContentFile[]>([]);
  const [allFolders, setAllFolders] = useState<FolderData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(searchParams.get('view') as 'grid' | 'list' || 'grid');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size' | 'downloads'>(searchParams.get('sort') as any || 'name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(searchParams.get('order') as 'asc' | 'desc' || 'asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);
  const [breadcrumbPath, setBreadcrumbPath] = useState<FolderData[]>([]);

  const loadFolders = useCallback(async (): Promise<FolderData[]> => {
    try {
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
      const response = await fetch(`${API_BASE_URL}/folders?includeInactive=false`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAllFolders(data.data);
          return data.data;
        }
      }
      return [];
    } catch (error) {
      console.error('Failed to load folders:', error);
      return [];
    }
  }, []);

  // Build breadcrumb path helper function (moved outside to avoid loop function warning)
  const buildBreadcrumbPath = useCallback((folderId: string, allFolders: FolderData[]): FolderData[] => {
    const path: FolderData[] = [];
    let currentId: string | null = folderId;
    
    while (currentId) {
      const currentFolder = allFolders.find(f => f._id === currentId);
      if (!currentFolder) break;
      path.unshift(currentFolder);
      const parentId = typeof currentFolder.parentFolder === 'string'
        ? currentFolder.parentFolder
        : currentFolder.parentFolder?._id;
      currentId = parentId || null;
    }
    
    return path;
  }, []);

  const loadFolder = useCallback(async (foldersList?: FolderData[]) => {
    if (!id) return;
    
    // Use provided folders list or current state
    const foldersToUse = foldersList || allFolders;
    
    try {
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
      const walletAddress = userInfo?.address;
      
      // Build query parameters
      const params = new URLSearchParams();
      if (walletAddress) {
        params.append('walletAddress', walletAddress);
      }
      
      const response = await fetch(`${API_BASE_URL}/folders/${id}?${params.toString()}`);
      
      if (response.status === 403) {
        // Access denied - user doesn't have required tier
        const errorData = await response.json();
        addToast({
          type: 'error',
          title: 'Access Denied',
          message: errorData.message || 'You do not have access to this folder. Please unlock the required tier.',
        });
        navigate('/content');
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const folderData = data.data;
          
          // Check access on frontend as well
          if (walletAddress && !canAccessFolder(folderData.tier)) {
            addToast({
              type: 'error',
              title: 'Access Denied',
              message: `This folder requires ${folderData.tier === 0 ? 'Tier 1' : folderData.tier === 1 ? 'Tier 2' : 'Tier 3'} access.`,
            });
            navigate('/content');
            return;
          }
          
          setFolder(folderData);
          
          // Only build breadcrumb if we have folders
          if (foldersToUse.length > 0) {
            setBreadcrumbPath(buildBreadcrumbPath(id, foldersToUse));
            
            // Load subfolders
            const childFolders = foldersToUse.filter(f => {
              const parentId = typeof f.parentFolder === 'string'
                ? f.parentFolder
                : f.parentFolder?._id;
              return parentId === id;
            });
            setSubfolders(childFolders);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load folder:', error);
    }
  }, [id, buildBreadcrumbPath, userInfo?.address, userTier, navigate, addToast]);

  const loadFiles = useCallback(async () => {
    if (!id) return;
    
    try {
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
      const walletAddress = userInfo?.address;
      
      const params = new URLSearchParams();
      if (walletAddress) {
        params.append('walletAddress', walletAddress);
      }
      params.append('folder', id);
      
      const response = await fetch(`${API_BASE_URL}/files?${params.toString()}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const apiFiles = data.data.files || data.data || [];
          
          // Transform API files to ContentFile format
          const transformedFiles: ContentFile[] = apiFiles.map((file: any) => ({
            id: file._id,
            txId: file.txId || '',
            fileName: file.originalName || file.fileName || 'Unknown',
            fileType: file.fileType || 'unknown',
            description: file.description || '',
            tier: file.tier !== undefined ? file.tier : -1,
            uploadDate: file.createdAt || new Date().toISOString(),
            fileSize: file.fileSize,
            downloadUrl: file.downloadUrl,
            downloads: file.downloads || 0,
            folder: file.folder,
          }));
          
          setFiles(transformedFiles);
        }
      }
    } catch (error) {
      console.error('Failed to load files:', error);
    } finally {
      setIsLoading(false);
    }
  }, [id, userInfo?.address]);

  useEffect(() => {
    if (id) {
      setIsLoading(true);
      loadFolders().then((folders) => {
        // Pass folders directly to avoid dependency on allFolders state
        if (folders && folders.length > 0) {
          loadFolder(folders);
        }
        loadFiles();
      });
    }
  }, [id, loadFolders, loadFolder, loadFiles]);

  const filterAndSortFiles = useCallback(() => {
    let filtered = [...files];

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
        case 'name':
          comparison = a.fileName.localeCompare(b.fileName);
          break;
        case 'date':
          comparison = new Date(a.uploadDate).getTime() - new Date(b.uploadDate).getTime();
          break;
        case 'size':
          comparison = (a.fileSize || 0) - (b.fileSize || 0);
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
  }, [files, searchQuery, sortBy, sortOrder]);

  useEffect(() => {
    filterAndSortFiles();
  }, [filterAndSortFiles]);

  const canAccessFile = (file: ContentFile): boolean => {
    if (file.tier === -1) return false;
    if (userTier >= 0) {
      return file.tier <= userTier;
    }
    return false;
  };

  const canAccessFolder = (folderTier: number): boolean => {
    // Admin folders (-1) are not accessible to regular users
    if (folderTier === -1) return false;
    // User must have unlocked the required tier or higher
    if (userTier >= 0) {
      return folderTier <= userTier;
    }
    return false;
  };

  const handleDownload = async (file: ContentFile) => {
    if (onDownload) {
      await onDownload(file);
      return;
    }

    if (!userInfo?.address) {
      addToast({
        type: 'warning',
        title: 'Wallet Required',
        message: 'Please connect your wallet to download files',
      });
      return;
    }

    if (downloadingFileId === file.id) return;

    setDownloadingFileId(file.id);

    if (onRefreshTier) {
      try {
        await onRefreshTier();
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (refreshError) {
        console.warn('Failed to refresh tier:', refreshError);
      }
    }

    try {
      if (file.fileData) {
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
        window.open(`https://arweave.net/${file.txId}`, '_blank');
        setDownloadingFileId(null);
        return;
      }

      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
      const presignedResponse = await fetch(
        `${API_BASE_URL}/files/${file.id}/presigned?walletAddress=${userInfo.address}`
      );

      if (!presignedResponse.ok) {
        const errorData = await presignedResponse.json();
        throw new Error(errorData.message || 'Failed to get download URL');
      }

      const presignedData = await presignedResponse.json();
      
      // Validate response
      if (!presignedData.success || !presignedData.downloadUrl) {
        throw new Error(presignedData.message || 'Invalid download URL received from server');
      }

      // Construct download URL
      let downloadUrl: string;
      if (presignedData.downloadUrl.startsWith('http://') || presignedData.downloadUrl.startsWith('https://')) {
        downloadUrl = presignedData.downloadUrl;
      } else if (presignedData.downloadUrl.startsWith('/')) {
        downloadUrl = `${API_BASE_URL}${presignedData.downloadUrl}`;
      } else {
        downloadUrl = `${API_BASE_URL}/${presignedData.downloadUrl}`;
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
      }, 100);
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Download Failed',
        message: error.message || 'Failed to download file',
      });
    } finally {
      setDownloadingFileId(null);
    }
  };

  const getParentFolderId = () => {
    if (!folder) return null;
    const parentId = typeof folder.parentFolder === 'string'
      ? folder.parentFolder
      : folder.parentFolder?._id;
    return parentId || null;
  };

  const handleBack = () => {
    const parentId = getParentFolderId();
    if (parentId) {
      navigate(`/content/folders/${parentId}`);
    } else {
      navigate('/content');
    }
  };

  const getFileIcon = (fileType: string) => {
    const type = fileType.toLowerCase();
    if (type.includes('image') || type.includes('jpg') || type.includes('png') || type.includes('gif')) {
      return <Image className="h-8 w-8 text-blue-500" />;
    } else if (type.includes('pdf')) {
      return <FileText className="h-8 w-8 text-red-500" />;
    } else if (type.includes('video')) {
      return <Video className="h-8 w-8 text-purple-500" />;
    } else if (type.includes('audio') || type.includes('music')) {
      return <Music className="h-8 w-8 text-green-500" />;
    }
    return <File className="h-8 w-8 text-gray-500" />;
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateString;
    }
  };

  if (isLoading || propsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-400">Loading folder...</span>
      </div>
    );
  }

  if (!folder) {
    return (
      <div className="text-center py-12">
        <Folder className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">Folder not found</p>
        <button
          onClick={() => navigate('/content')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Back to Content
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors flex-shrink-0"
            title={getParentFolderId() ? 'Back to parent folder' : 'Back to content'}
          >
            <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
          
          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button
              onClick={() => navigate('/content')}
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
              Content
            </button>
            {breadcrumbPath.length > 0 && (
              <>
                {breadcrumbPath.map((crumb, index) => (
                  <div key={crumb._id} className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                    {index === breadcrumbPath.length - 1 ? (
                      <div className="flex items-center gap-2">
                        <div
                          className="w-5 h-5 rounded flex-shrink-0"
                          style={{ backgroundColor: crumb.color || '#3B82F6' }}
                        />
                        {(() => {
                          const IconComponent = getIconFromName(crumb.icon);
                          return <IconComponent className="h-4 w-4 text-gray-500 dark:text-gray-400" />;
                        })()}
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {crumb.name}
                        </span>
                      </div>
                    ) : (
                      <button
                        onClick={() => navigate(`/content/folders/${crumb._id}`)}
                        className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors truncate"
                      >
                        {crumb.name}
                      </button>
                    )}
                  </div>
                ))}
              </>
            )}
            {breadcrumbPath.length === 0 && (
              <>
                <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                <div className="flex items-center gap-2">
                  <div
                    className="w-5 h-5 rounded flex-shrink-0"
                    style={{ backgroundColor: folder.color || '#3B82F6' }}
                  />
                  {(() => {
                    const IconComponent = getIconFromName(folder.icon);
                    return <IconComponent className="h-4 w-4 text-gray-500 dark:text-gray-400" />;
                  })()}
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {folder.name}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Folder Info */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-start gap-4">
          <div
            className="w-12 h-12 rounded flex-shrink-0 flex items-center justify-center"
            style={{ backgroundColor: folder.color || '#3B82F6' }}
          >
            {(() => {
              const IconComponent = getIconFromName(folder.icon);
              return <IconComponent className="h-6 w-6 text-white" />;
            })()}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{folder.name}</h1>
            {folder.description && (
              <p className="text-gray-600 dark:text-gray-400 mb-4">{folder.description}</p>
            )}
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              <span>Files: {files.length}</span>
              <span>Subfolders: {subfolders.length}</span>
              <span>Tier: {folder.tier === -1 ? 'Admin' : `Tier ${folder.tier + 1}`}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        >
          <option value="name">Sort by Name</option>
          <option value="date">Sort by Date</option>
          <option value="size">Sort by Size</option>
          <option value="downloads">Sort by Downloads</option>
        </select>
        <button
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          {sortOrder === 'asc' ? '↑' : '↓'}
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-md ${viewMode === 'grid' ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}
          >
            <Grid3x3 className="h-5 w-5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}
          >
            <List className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {/* Subfolders */}
          {subfolders.map((subfolder) => (
            <div
              key={subfolder._id}
              onClick={() => navigate(`/content/folders/${subfolder._id}`)}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700 flex flex-col h-full cursor-pointer"
            >
              <div className="flex-1 flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="w-5 h-5 rounded flex-shrink-0"
                        style={{ backgroundColor: subfolder.color || '#3B82F6' }}
                      />
                      {(() => {
                        const IconComponent = getIconFromName(subfolder.icon);
                        return <IconComponent className="h-5 w-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />;
                      })()}
                      <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate" title={subfolder.name}>
                        {subfolder.name}
                      </h3>
                    </div>
                    {subfolder.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">{subfolder.description}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-1 mb-3 text-xs text-gray-500 dark:text-gray-400 flex-grow">
                  <div>Files: {subfolder.fileCount || 0}</div>
                  <div>Tier: {subfolder.tier === -1 ? 'Admin' : `Tier ${subfolder.tier + 1}`}</div>
                </div>
              </div>
            </div>
          ))}
          
          {/* Files */}
          {filteredFiles.map((file) => (
            <div
              key={file.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-start gap-3 mb-3">
                {getFileIcon(file.fileType)}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate mb-1">
                    {file.fileName}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">
                    {file.description || 'No description'}
                  </p>
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                    <span className="uppercase">{file.fileType}</span>
                    {file.fileSize && <span>{formatFileSize(file.fileSize)}</span>}
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    {file.tier === -1 ? (
                      <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                        Admin Only
                      </span>
                    ) : (
                      <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                        file.tier === 0 ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                        file.tier === 1 ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' :
                        file.tier === 2 ? 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200' :
                        'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                      }`}>
                        Tier {file.tier + 1}
                      </span>
                    )}
                    {!canAccessFile(file) && (
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">
                        <Lock className="h-3 w-3 mr-1" />
                        Locked
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formatDate(file.uploadDate)}
                </span>
                {canAccessFile(file) ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(file);
                    }}
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
                    className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 rounded-md cursor-not-allowed flex items-center text-sm"
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
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Size</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tier</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {/* Subfolders */}
              {subfolders.map((subfolder) => (
                <tr
                  key={subfolder._id}
                  onClick={() => navigate(`/content/folders/${subfolder._id}`)}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div
                        className="w-4 h-4 rounded mr-3"
                        style={{ backgroundColor: subfolder.color || '#3B82F6' }}
                      />
                      {(() => {
                        const IconComponent = getIconFromName(subfolder.icon);
                        return <IconComponent className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-3" />;
                      })()}
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{subfolder.name}</div>
                        {subfolder.description && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">{subfolder.description}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">Folder</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">-</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {subfolder.tier === -1 ? 'Admin' : `Tier ${subfolder.tier + 1}`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">-</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/content/folders/${subfolder._id}`);
                      }}
                      className="text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-300"
                      title="Open folder"
                    >
                      {(() => {
                        const IconComponent = getIconFromName(subfolder.icon);
                        return <IconComponent className="h-4 w-4" />;
                      })()}
                    </button>
                  </td>
                </tr>
              ))}
              
              {/* Files */}
              {filteredFiles.map((file) => (
                <tr key={file.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getFileIcon(file.fileType)}
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{file.fileName}</div>
                        {file.description && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">{file.description}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 uppercase">{file.fileType}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatFileSize(file.fileSize)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {file.tier === -1 ? (
                      <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                        Admin
                      </span>
                    ) : (
                      <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                        file.tier === 0 ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                        file.tier === 1 ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' :
                        file.tier === 2 ? 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200' :
                        'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                      }`}>
                        Tier {file.tier + 1}
                      </span>
                    )}
                    {!canAccessFile(file) && (
                      <span className="ml-2 inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">
                        <Lock className="h-3 w-3 mr-1" />
                        Locked
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatDate(file.uploadDate)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {canAccessFile(file) ? (
                      <button
                        onClick={() => handleDownload(file)}
                        disabled={downloadingFileId === file.id}
                        className={`text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-300 flex items-center gap-2 ${
                          downloadingFileId === file.id ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        {downloadingFileId === file.id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                            Downloading...
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4" />
                            Download
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        disabled
                        className="text-gray-400 dark:text-gray-500 cursor-not-allowed flex items-center gap-2"
                        title={file.tier === -1 ? 'Admin only' : `Requires Tier ${file.tier + 1} access`}
                      >
                        <Lock className="h-4 w-4" />
                        Locked
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {subfolders.length === 0 && filteredFiles.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <Folder className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">This folder is empty</p>
        </div>
      )}
    </div>
  );
}

