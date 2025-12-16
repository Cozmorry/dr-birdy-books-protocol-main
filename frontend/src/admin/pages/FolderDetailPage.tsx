import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import {
  ArrowLeft,
  Folder,
  File,
  Download,
  Edit,
  Trash2,
  Grid3x3,
  List,
  Search,
  X,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
  Eye,
} from 'lucide-react';
import FolderSelector from '../components/FolderSelector';
import { getIconFromName, SUGGESTED_ICONS } from '../utils/iconUtils';

interface FileData {
  _id: string;
  originalName: string;
  description?: string;
  fileType?: string;
  fileSize?: number;
  tier: number;
  downloads: number;
  folder?: any;
  createdAt: string;
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
  order?: number;
}

export default function FolderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [folder, setFolder] = useState<FolderData | null>(null);
  const [files, setFiles] = useState<FileData[]>([]);
  const [subfolders, setSubfolders] = useState<FolderData[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<FileData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(searchParams.get('view') as 'grid' | 'list' || 'grid');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size' | 'downloads'>(searchParams.get('sort') as any || 'name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(searchParams.get('order') as 'asc' | 'desc' || 'asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingFile, setEditingFile] = useState<FileData | null>(null);
  const [editFileDescription, setEditFileDescription] = useState('');
  const [editFileTier, setEditFileTier] = useState(-1);
  const [editFileFolder, setEditFileFolder] = useState('');
  const [folders, setFolders] = useState<FolderData[]>([]);
  const [breadcrumbPath, setBreadcrumbPath] = useState<FolderData[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; fileId: string | null }>({
    show: false,
    fileId: null,
  });
  const [deleteFolderConfirm, setDeleteFolderConfirm] = useState<{ show: boolean; folderId: string | null }>({
    show: false,
    folderId: null,
  });
  const [editingFolder, setEditingFolder] = useState<FolderData | null>(null);
  const [folderFormData, setFolderFormData] = useState({
    name: '',
    description: '',
    parentFolder: '',
    tier: -1,
    color: '#3B82F6',
    icon: '',
    order: 0,
  });
  const [isUpdatingFolder, setIsUpdatingFolder] = useState(false);

  useEffect(() => {
    if (id) {
      loadFolders().then(() => {
        loadFolder();
        loadFiles();
      });
    }
  }, [id]);

  useEffect(() => {
    filterAndSortFiles();
  }, [files, searchQuery, sortBy, sortOrder]);

  useEffect(() => {
    // Update URL params when view/sort changes
    const params = new URLSearchParams();
    if (viewMode) params.set('view', viewMode);
    if (sortBy) params.set('sort', sortBy);
    if (sortOrder) params.set('order', sortOrder);
    setSearchParams(params, { replace: true });
  }, [viewMode, sortBy, sortOrder]);

  const buildBreadcrumbPath = async (folderId: string, allFolders: FolderData[]): Promise<FolderData[]> => {
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
  };

  const loadFolder = async () => {
    if (!id) return;
    try {
      const response = await api.getFolder(id);
      if (response.success) {
        setFolder(response.data);
      }
    } catch (error) {
      console.error('Failed to load folder:', error);
      setMessage({ type: 'error', text: 'Failed to load folder' });
    }
  };

  const loadFiles = async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      const response = await api.getFiles({ folder: id, limit: 1000 });
      if (response.success) {
        setFiles(response.data.files || []);
      }
    } catch (error) {
      console.error('Failed to load files:', error);
      setMessage({ type: 'error', text: 'Failed to load files' });
    } finally {
      setIsLoading(false);
    }
  };

  const loadFolders = async () => {
    try {
      const response = await api.getFolders();
      if (response.success) {
        setFolders(response.data);
        // Load subfolders of current folder
        if (id) {
          const childFolders = response.data.filter((f: FolderData) => {
            const parentId = typeof f.parentFolder === 'string' ? f.parentFolder : f.parentFolder?._id;
            return parentId === id;
          });
          setSubfolders(childFolders);
          // Build breadcrumb path
          const path = await buildBreadcrumbPath(id, response.data);
          setBreadcrumbPath(path);
        }
      }
    } catch (error) {
      console.error('Failed to load folders:', error);
    }
  };

  const filterAndSortFiles = () => {
    let filtered = [...files];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (file) =>
          file.originalName?.toLowerCase().includes(query) ||
          file.description?.toLowerCase().includes(query) ||
          file.fileType?.toLowerCase().includes(query)
      );
    }

    // Sort files
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = (a.originalName || '').localeCompare(b.originalName || '');
          break;
        case 'date':
          comparison = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
          break;
        case 'size':
          comparison = (a.fileSize || 0) - (b.fileSize || 0);
          break;
        case 'downloads':
          comparison = (a.downloads || 0) - (b.downloads || 0);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredFiles(filtered);
  };

  const handleDownloadFile = (fileId: string) => {
    const url = api.getFileDownloadUrl(fileId);
    window.open(url, '_blank');
  };

  const handleEditFile = (file: FileData) => {
    setEditingFile(file);
    setEditFileDescription(file.description || '');
    setEditFileTier(file.tier !== undefined ? file.tier : -1);
    setEditFileFolder(file.folder?._id || file.folder || '');
  };

  const handleUpdateFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFile) return;

    try {
      const response = await api.updateFile(editingFile._id, {
        description: editFileDescription,
        tier: editFileTier,
        folder: editFileFolder || null,
      });

      if (response.success) {
        setMessage({ type: 'success', text: 'File updated successfully' });
        setEditingFile(null);
        loadFiles();
      } else {
        setMessage({ type: 'error', text: response.message || 'Failed to update file' });
      }
    } catch (error: any) {
      console.error('Failed to update file:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to update file' });
    }
  };

  const handleDeleteClick = (fileId: string) => {
    setDeleteConfirm({ show: true, fileId });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.fileId) return;

    try {
      const response = await api.deleteFile(deleteConfirm.fileId);
      if (response.success) {
        setMessage({ type: 'success', text: 'File deleted successfully' });
        setDeleteConfirm({ show: false, fileId: null });
        loadFiles();
        loadFolder(); // Refresh folder to update file count
      } else {
        setMessage({ type: 'error', text: response.message || 'Failed to delete file' });
        setDeleteConfirm({ show: false, fileId: null });
      }
    } catch (error: any) {
      console.error('Failed to delete file:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to delete file' });
      setDeleteConfirm({ show: false, fileId: null });
    }
  };

  const handleDeleteFolderClick = (folderId: string) => {
    setDeleteFolderConfirm({ show: true, folderId });
  };

  const handleDeleteFolderConfirm = async () => {
    if (!deleteFolderConfirm.folderId) return;

    try {
      const response = await api.deleteFolder(deleteFolderConfirm.folderId);
      if (response.success) {
        setMessage({ type: 'success', text: 'Folder deleted successfully' });
        setDeleteFolderConfirm({ show: false, folderId: null });
        loadFolders();
        loadFolder(); // Refresh current folder
      } else {
        setMessage({ type: 'error', text: response.message || 'Failed to delete folder' });
        setDeleteFolderConfirm({ show: false, folderId: null });
      }
    } catch (error: any) {
      console.error('Failed to delete folder:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to delete folder' });
      setDeleteFolderConfirm({ show: false, folderId: null });
    }
  };

  const handleViewFolder = (folderId: string) => {
    navigate(`/admin/folders/${folderId}`);
  };

  const handleEditFolder = (folder: FolderData) => {
    setFolderFormData({
      name: folder.name,
      description: folder.description || '',
      parentFolder: folder.parentFolder?._id || '',
      tier: folder.tier,
      color: folder.color || '#3B82F6',
      icon: folder.icon || '',
      order: folder.order || 0,
    });
    setEditingFolder(folder);
  };

  const handleUpdateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFolder) return;

    try {
      setIsUpdatingFolder(true);
      const response = await api.updateFolder(editingFolder._id, {
        name: folderFormData.name,
        description: folderFormData.description,
        parentFolder: folderFormData.parentFolder || null,
        tier: folderFormData.tier,
        color: folderFormData.color,
        icon: folderFormData.icon,
        order: folderFormData.order,
      });

      if (response.success) {
        setMessage({ type: 'success', text: 'Folder updated successfully' });
        setEditingFolder(null);
        loadFolders();
        loadFolder(); // Refresh current folder
      } else {
        setMessage({ type: 'error', text: response.message || 'Failed to update folder' });
      }
    } catch (error: any) {
      console.error('Failed to update folder:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to update folder' });
    } finally {
      setIsUpdatingFolder(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!folder) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Folder not found</p>
        <button
          onClick={() => navigate('/admin/folders')}
          className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
        >
          Back to Folders
        </button>
      </div>
    );
  }

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
      navigate(`/admin/folders/${parentId}`);
    } else {
      navigate('/admin/folders');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors flex-shrink-0"
            title={getParentFolderId() ? 'Back to parent folder' : 'Back to folders'}
          >
            <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
          
          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button
              onClick={() => navigate('/admin/folders')}
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
              Folders
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
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {crumb.name}
                        </span>
                      </div>
                    ) : (
                      <button
                        onClick={() => navigate(`/admin/folders/${crumb._id}`)}
                        className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors truncate"
                      >
                        {crumb.name}
                      </button>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {filteredFiles.length} {filteredFiles.length === 1 ? 'file' : 'files'}
          </span>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`p-4 rounded-lg flex items-start ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
          )}
          <p
            className={`text-sm ${
              message.type === 'success' ? 'text-green-800' : 'text-red-800'
            }`}
          >
            {message.text}
          </p>
          <button
            onClick={() => setMessage(null)}
            className="ml-auto text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Search */}
          <div className="flex-1 w-full sm:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search files..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
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

          {/* View Mode & Sort */}
          <div className="flex items-center gap-3">
            {/* Sort */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700">Sort:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              >
                <option value="name">Name</option>
                <option value="date">Date</option>
                <option value="size">Size</option>
                <option value="downloads">Downloads</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 border border-gray-300 rounded-md p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                title="Grid view"
              >
                <Grid3x3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded transition-colors ${
                  viewMode === 'list'
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                title="List view"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Files and Folders Display */}
      {subfolders.length === 0 && filteredFiles.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
          <File className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            {searchQuery ? 'No files match your search' : 'No files or folders in this folder'}
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="mt-2 text-primary-600 hover:text-primary-700 text-sm"
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <>
          {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {/* Subfolders */}
          {subfolders.map((subfolder) => (
            <div
              key={subfolder._id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700 flex flex-col h-full"
            >
              <div className="flex-1 flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <div 
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => navigate(`/admin/folders/${subfolder._id}`)}
                  >
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
              <div className="flex items-center gap-1 pt-3 border-t border-gray-100 dark:border-gray-700 mt-auto">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewFolder(subfolder._id);
                  }}
                  className="flex-1 p-1.5 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded transition-colors text-xs font-medium"
                  title="View folder"
                >
                  <Eye className="h-4 w-4 mx-auto" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditFolder(subfolder);
                  }}
                  className="flex-1 p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors text-xs font-medium"
                  title="Edit folder"
                >
                  <Edit className="h-4 w-4 mx-auto" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteFolderClick(subfolder._id);
                  }}
                  className="flex-1 p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors text-xs font-medium"
                  title="Delete folder"
                >
                  <Trash2 className="h-4 w-4 mx-auto" />
                </button>
              </div>
            </div>
          ))}
          {/* Files */}
          {filteredFiles.map((file) => (
            <div
              key={file._id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700 flex flex-col h-full"
            >
              <div className="flex-1 flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <File className="h-5 w-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                      <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate" title={file.originalName}>
                        {file.originalName}
                      </h3>
                    </div>
                    {file.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">{file.description}</p>
                    )}
                    {file.fileType && (
                      <span className="inline-block px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded mb-2">
                        {file.fileType}
                      </span>
                    )}
                  </div>
                </div>
                <div className="space-y-1 mb-3 text-xs text-gray-500 dark:text-gray-400 flex-grow">
                  {file.fileSize && <div>Size: {formatFileSize(file.fileSize)}</div>}
                  <div>Downloads: {file.downloads || 0}</div>
                  <div>Tier: {file.tier === -1 ? 'Admin' : `Tier ${file.tier + 1}`}</div>
                  <div>Added: {formatDate(file.createdAt)}</div>
                </div>
              </div>
              <div className="flex items-center gap-1 pt-3 border-t border-gray-100 dark:border-gray-700 mt-auto">
                <button
                  onClick={() => handleDownloadFile(file._id)}
                  className="flex-1 p-1.5 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded transition-colors text-xs font-medium"
                  title="Download"
                >
                  <Download className="h-4 w-4 mx-auto" />
                </button>
                <button
                  onClick={() => handleEditFile(file)}
                  className="flex-1 p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors text-xs font-medium"
                  title="Edit"
                >
                  <Edit className="h-4 w-4 mx-auto" />
                </button>
                <button
                  onClick={() => handleDeleteClick(file._id)}
                  className="flex-1 p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors text-xs font-medium"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4 mx-auto" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    File
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Downloads
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {/* Subfolders */}
                {subfolders.map((subfolder) => (
                  <tr
                    key={`folder-${subfolder._id}`}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div 
                        className="flex items-center cursor-pointer"
                        onClick={() => navigate(`/admin/folders/${subfolder._id}`)}
                      >
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                        Folder
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      —
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {subfolder.tier === -1 ? 'Admin' : `Tier ${subfolder.tier + 1}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {subfolder.fileCount || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {subfolder.createdAt ? formatDate(subfolder.createdAt) : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewFolder(subfolder._id);
                          }}
                          className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded transition-colors"
                          title="View folder"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditFolder(subfolder);
                          }}
                          className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                          title="Edit folder"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFolderClick(subfolder._id);
                          }}
                          className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                          title="Delete folder"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {/* Files */}
                {filteredFiles.map((file) => (
                  <tr key={file._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <File className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{file.originalName}</div>
                          {file.description && (
                            <div className="text-sm text-gray-500 dark:text-gray-400">{file.description}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {file.fileType && (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {file.fileType}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {file.fileSize ? formatFileSize(file.fileSize) : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {file.tier === -1 ? 'Admin' : `Tier ${file.tier + 1}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {file.downloads || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(file.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDownloadFile(file._id)}
                          className="text-green-600 hover:text-green-900"
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEditFile(file)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(file._id)}
                          className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
        </>
      )}

      {/* Edit File Modal */}
      {editingFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">Edit File</h2>
              <button
                onClick={() => setEditingFile(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateFile} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  File Name
                </label>
                <input
                  type="text"
                  value={editingFile.originalName}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={editFileDescription}
                  onChange={(e) => setEditFileDescription(e.target.value)}
                  placeholder="Enter file description..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Access Tier
                  </label>
                  <select
                    value={editFileTier}
                    onChange={(e) => setEditFileTier(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value={-1}>Admin Only</option>
                    <option value={0}>Tier 1 ($24)</option>
                    <option value={1}>Tier 2 ($50)</option>
                    <option value={2}>Tier 3 ($1000)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Folder (Optional)
                  </label>
                  <FolderSelector
                    folders={folders}
                    value={editFileFolder}
                    onChange={setEditFileFolder}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingFile(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  Update File
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Folder Modal */}
      {editingFolder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Edit Folder</h2>
              <button
                onClick={() => setEditingFolder(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateFolder} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Folder Name *
                </label>
                <input
                  type="text"
                  value={folderFormData.name}
                  onChange={(e) => setFolderFormData({ ...folderFormData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={folderFormData.description}
                  onChange={(e) => setFolderFormData({ ...folderFormData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Parent Folder
                </label>
                <FolderSelector
                  folders={folders.filter(f => f._id !== editingFolder._id)}
                  value={folderFormData.parentFolder}
                  onChange={(value) => setFolderFormData({ ...folderFormData, parentFolder: value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Access Tier
                </label>
                <select
                  value={folderFormData.tier}
                  onChange={(e) => setFolderFormData({ ...folderFormData, tier: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value={-1}>Admin Only</option>
                  <option value={0}>Tier 1 ($24)</option>
                  <option value={1}>Tier 2 ($50)</option>
                  <option value={2}>Tier 3 ($1000)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Color
                  </label>
                  <input
                    type="color"
                    value={folderFormData.color}
                    onChange={(e) => setFolderFormData({ ...folderFormData, color: e.target.value })}
                    className="w-full h-10 border border-gray-300 dark:border-gray-600 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Order
                  </label>
                  <input
                    type="number"
                    value={folderFormData.order}
                    onChange={(e) => setFolderFormData({ ...folderFormData, order: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    min="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Icon (optional)
                </label>
                <div className="flex gap-2">
                  <select
                    value={folderFormData.icon}
                    onChange={(e) => setFolderFormData({ ...folderFormData, icon: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Default (Folder)</option>
                    {SUGGESTED_ICONS.map((iconName) => {
                      const IconComponent = getIconFromName(iconName);
                      return (
                        <option key={iconName} value={iconName}>
                          {iconName}
                        </option>
                      );
                    })}
                  </select>
                  {folderFormData.icon && (
                    <div className="flex items-center justify-center w-10 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700">
                      {(() => {
                        const IconComponent = getIconFromName(folderFormData.icon);
                        return <IconComponent className="h-5 w-5 text-gray-600 dark:text-gray-400" />;
                      })()}
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Select a Lucide icon name (e.g., book, video, file-text)
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingFolder(null)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingFolder}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors disabled:opacity-50"
                >
                  {isUpdatingFolder ? 'Updating...' : 'Update Folder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    Delete File
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Are you sure you want to delete this file? This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteConfirm({ show: false, fileId: null })}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Folder Confirmation Modal */}
      {deleteFolderConfirm.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    Delete Folder
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Are you sure you want to delete this folder? This action cannot be undone. All files and subfolders in this folder will also be deleted.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteFolderConfirm({ show: false, folderId: null })}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteFolderConfirm}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

