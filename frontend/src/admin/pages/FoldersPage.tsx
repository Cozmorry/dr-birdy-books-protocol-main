import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { Folder, FolderPlus, Edit, Trash2, FolderOpen, ChevronRight, ChevronDown, Eye, File, Download, X, AlertTriangle } from 'lucide-react';
import { getIconFromName, SUGGESTED_ICONS } from '../utils/iconUtils';

interface FolderData {
  _id: string;
  name: string;
  description?: string;
  parentFolder?: any;
  tier: number;
  color?: string;
  icon?: string;
  order: number;
  fileCount?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

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

export default function FoldersPage() {
  const navigate = useNavigate();
  const [folders, setFolders] = useState<FolderData[]>([]);
  const [folderFiles, setFolderFiles] = useState<Record<string, FileData[]>>({});
  const [loadingFiles, setLoadingFiles] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingFolder, setEditingFolder] = useState<FolderData | null>(null);
  const [editingFile, setEditingFile] = useState<FileData | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deleteFolderConfirm, setDeleteFolderConfirm] = useState<{ show: boolean; folderId: string | null }>({
    show: false,
    folderId: null,
  });
  const [deleteFileConfirm, setDeleteFileConfirm] = useState<{ show: boolean; fileId: string | null; folderId: string | null }>({
    show: false,
    fileId: null,
    folderId: null,
  });
  const [editFileDescription, setEditFileDescription] = useState('');
  const [editFileTier, setEditFileTier] = useState(-1);
  const [editFileFolder, setEditFileFolder] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parentFolder: '',
    tier: -1,
    color: '#3B82F6',
    icon: '',
    order: 0,
  });

  useEffect(() => {
    loadFolders();
  }, []);

  const loadFolders = async () => {
    try {
      setIsLoading(true);
      const response = await api.getFolders();
      if (response.success) {
        setFolders(response.data);
      }
    } catch (error) {
      console.error('Failed to load folders:', error);
      setMessage({ type: 'error', text: 'Failed to load folders' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsCreating(true);
      const response = await api.createFolder({
        name: formData.name,
        description: formData.description,
        parentFolder: formData.parentFolder || undefined,
        tier: formData.tier,
        color: formData.color,
        icon: formData.icon,
        order: formData.order,
      });

      if (response.success) {
        setMessage({ type: 'success', text: 'Folder created successfully' });
        setShowCreateModal(false);
        resetForm();
        loadFolders();
      } else {
        setMessage({ type: 'error', text: response.message || 'Failed to create folder' });
      }
    } catch (error: any) {
      console.error('Failed to create folder:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to create folder' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFolder) return;

    try {
      setIsCreating(true);
      const response = await api.updateFolder(editingFolder._id, {
        name: formData.name,
        description: formData.description,
        parentFolder: formData.parentFolder || null,
        tier: formData.tier,
        color: formData.color,
        icon: formData.icon,
        order: formData.order,
      });

      if (response.success) {
        setMessage({ type: 'success', text: 'Folder updated successfully' });
        setEditingFolder(null);
        resetForm();
        loadFolders();
      } else {
        setMessage({ type: 'error', text: response.message || 'Failed to update folder' });
      }
    } catch (error: any) {
      console.error('Failed to update folder:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to update folder' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeleteFolderConfirm({ show: true, folderId: id });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteFolderConfirm.folderId) return;

    try {
      const response = await api.deleteFolder(deleteFolderConfirm.folderId);
      if (response.success) {
        setMessage({ type: 'success', text: 'Folder deleted successfully' });
        setDeleteFolderConfirm({ show: false, folderId: null });
        loadFolders();
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

  const handleDeleteFileClick = (fileId: string, folderId: string) => {
    setDeleteFileConfirm({ show: true, fileId, folderId });
  };

  const handleDeleteFileConfirm = async () => {
    if (!deleteFileConfirm.fileId || !deleteFileConfirm.folderId) return;

    try {
      const response = await api.deleteFile(deleteFileConfirm.fileId);
      if (response.success) {
        setMessage({ type: 'success', text: 'File deleted successfully' });
        setDeleteFileConfirm({ show: false, fileId: null, folderId: null });
        // Reload files for the folder
        await loadFolderFiles(deleteFileConfirm.folderId);
        // Reload folders to update file counts
        loadFolders();
      } else {
        setMessage({ type: 'error', text: response.message || 'Failed to delete file' });
        setDeleteFileConfirm({ show: false, fileId: null, folderId: null });
      }
    } catch (error: any) {
      console.error('Failed to delete file:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to delete file' });
      setDeleteFileConfirm({ show: false, fileId: null, folderId: null });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      parentFolder: '',
      tier: -1,
      color: '#3B82F6',
      icon: '',
      order: 0,
    });
  };

  const openCreateModal = () => {
    resetForm();
    setEditingFolder(null);
    setShowCreateModal(true);
  };

  const openEditModal = (folder: FolderData) => {
    setFormData({
      name: folder.name,
      description: folder.description || '',
      parentFolder: folder.parentFolder?._id || '',
      tier: folder.tier,
      color: folder.color || '#3B82F6',
      icon: folder.icon || '',
      order: folder.order,
    });
    setEditingFolder(folder);
    setShowCreateModal(true);
  };

  const toggleExpand = async (folderId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
      // Load files when expanding
      if (!folderFiles[folderId]) {
        await loadFolderFiles(folderId);
      }
    }
    setExpandedFolders(newExpanded);
  };

  const loadFolderFiles = async (folderId: string) => {
    try {
      setLoadingFiles(prev => new Set(prev).add(folderId));
      const response = await api.getFiles({ folder: folderId, limit: 1000 });
      if (response.success) {
        setFolderFiles(prev => ({
          ...prev,
          [folderId]: response.data.files || []
        }));
      }
    } catch (error) {
      console.error('Failed to load folder files:', error);
      setMessage({ type: 'error', text: 'Failed to load files' });
    } finally {
      setLoadingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(folderId);
        return newSet;
      });
    }
  };

  const handleViewFiles = (folderId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    navigate(`/admin/folders/${folderId}`);
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
        // Reload files for the folder
        if (editingFile.folder?._id || editingFile.folder) {
          const folderId = typeof editingFile.folder === 'string' ? editingFile.folder : editingFile.folder._id;
          await loadFolderFiles(folderId);
        }
        // Also reload if file was moved to a different folder
        if (editFileFolder && editFileFolder !== (editingFile.folder?._id || editingFile.folder)) {
          await loadFolderFiles(editFileFolder);
        }
      } else {
        setMessage({ type: 'error', text: response.message || 'Failed to update file' });
      }
    } catch (error: any) {
      console.error('Failed to update file:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to update file' });
    }
  };


  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const getRootFolders = () => {
    return folders.filter(f => !f.parentFolder || !f.parentFolder._id);
  };

  const getChildFolders = (parentId: string) => {
    return folders.filter(f => f.parentFolder?._id === parentId);
  };

  const renderFolderTree = (parentId: string | null = null, level: number = 0) => {
    const foldersToRender = parentId
      ? getChildFolders(parentId)
      : getRootFolders();

    if (foldersToRender.length === 0) return null;

    return (
      <div className={level > 0 ? 'ml-6 border-l-2 border-gray-200 pl-4' : ''}>
        {foldersToRender.map((folder) => {
          const hasChildren = getChildFolders(folder._id).length > 0;
          const hasFiles = (folder.fileCount || 0) > 0;
          const isExpanded = expandedFolders.has(folder._id);
          const files = folderFiles[folder._id] || [];
          const isLoadingFiles = loadingFiles.has(folder._id);

          return (
            <div key={folder._id} className="mb-2">
              <div
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  folder.isActive ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100'
                }`}
              >
                <div className="flex items-center flex-1">
                  {(hasChildren || hasFiles) && (
                    <button
                      onClick={(e) => toggleExpand(folder._id, e)}
                      className="mr-2 p-1 hover:bg-gray-100 rounded"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-500" />
                      )}
                    </button>
                  )}
                  {!hasChildren && !hasFiles && <div className="w-6" />}
                  <div
                    className="w-4 h-4 rounded mr-3"
                    style={{ backgroundColor: folder.color || '#3B82F6' }}
                  />
                  <div className="flex-1 cursor-pointer" onClick={() => handleViewFiles(folder._id)}>
                    <div className="flex items-center gap-2">
                      {(() => {
                        const IconComponent = getIconFromName(folder.icon);
                        return <IconComponent className="h-5 w-5 text-gray-400" />;
                      })()}
                      <h3 className="font-semibold text-gray-900 hover:text-primary-600 transition-colors">{folder.name}</h3>
                      {!folder.isActive && (
                        <span className="px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded">Inactive</span>
                      )}
                    </div>
                    {folder.description && (
                      <p className="text-sm text-gray-500 mt-1">{folder.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      <span>Tier: {folder.tier === -1 ? 'Admin' : `Tier ${folder.tier + 1}`}</span>
                      <span className="font-medium">Files: {folder.fileCount || 0}</span>
                      {folder.parentFolder && (
                        <span>Parent: {folder.parentFolder.name}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewFiles(folder._id);
                    }}
                    className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-md transition-colors"
                    title="View files in folder"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditModal(folder);
                    }}
                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-colors"
                    title="Edit folder"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick(folder._id);
                    }}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"
                    title="Delete folder"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {isExpanded && (
                <div className="mt-2 ml-6">
                  {/* Show files */}
                  {isLoadingFiles ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                    </div>
                  ) : files.length > 0 ? (
                    <div className="space-y-1">
                      {files.map((file) => (
                        <div
                          key={file._id}
                          className="flex items-center justify-between p-2 pl-4 rounded border border-gray-100 bg-gray-50 hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center flex-1 gap-3">
                            <File className="h-4 w-4 text-gray-400" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm text-gray-900 truncate">{file.originalName}</span>
                                {file.fileType && (
                                  <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
                                    {file.fileType}
                                  </span>
                                )}
                              </div>
                              {file.description && (
                                <p className="text-xs text-gray-500 mt-0.5 truncate">{file.description}</p>
                              )}
                              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                {file.fileSize && <span>{formatFileSize(file.fileSize)}</span>}
                                <span>Downloads: {file.downloads || 0}</span>
                                <span>Tier: {file.tier === -1 ? 'Admin' : `Tier ${file.tier + 1}`}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDownloadFile(file._id)}
                              className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded transition-colors"
                              title="Download file"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleEditFile(file)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                              title="Edit file"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteFileClick(file._id, folder._id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                              title="Delete file"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-sm text-gray-500">
                      No files in this folder
                    </div>
                  )}
                  {/* Show child folders */}
                  {hasChildren && (
                    <div className="mt-2">
                      {renderFolderTree(folder._id, level + 1)}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Folder Management</h1>
          <p className="text-gray-600 mt-1">Organize files into folders for better management</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
        >
          <FolderPlus className="h-5 w-5" />
          Create Folder
        </button>
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Folders</h2>
        {folders.length === 0 ? (
          <div className="text-center py-12">
            <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No folders yet</p>
            <p className="text-sm text-gray-500 mt-2">Create your first folder to organize files</p>
          </div>
        ) : (
          <div>{renderFolderTree()}</div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingFolder ? 'Edit Folder' : 'Create Folder'}
            </h2>
            <form onSubmit={editingFolder ? handleUpdate : handleCreate}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Folder Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Parent Folder
                  </label>
                  <select
                    value={formData.parentFolder}
                    onChange={(e) => setFormData({ ...formData, parentFolder: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Root (No parent)</option>
                    {folders
                      .filter(f => !editingFolder || f._id !== editingFolder._id)
                      .map((folder) => (
                        <option key={folder._id} value={folder._id}>
                          {folder.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tier
                  </label>
                  <select
                    value={formData.tier}
                    onChange={(e) => setFormData({ ...formData, tier: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="-1">Admin</option>
                    <option value="0">Tier 1</option>
                    <option value="1">Tier 2</option>
                    <option value="2">Tier 3</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Color
                    </label>
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-full h-10 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Order
                    </label>
                    <input
                      type="number"
                      value={formData.order}
                      onChange={(e) => setFormData({ ...formData, order: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                      value={formData.icon}
                      onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
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
                    {formData.icon && (
                      <div className="flex items-center justify-center w-10 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700">
                        {(() => {
                          const IconComponent = getIconFromName(formData.icon);
                          return <IconComponent className="h-5 w-5 text-gray-600 dark:text-gray-400" />;
                        })()}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Select a Lucide icon name (e.g., book, video, file-text)
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                    setEditingFolder(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors disabled:opacity-50"
                >
                  {isCreating ? 'Saving...' : editingFolder ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Folder (Optional)
                  </label>
                  <select
                    value={editFileFolder}
                    onChange={(e) => setEditFileFolder(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">No Folder</option>
                    {folders.map((folder) => (
                      <option key={folder._id} value={folder._id}>
                        {folder.name}
                      </option>
                    ))}
                  </select>
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
                      Are you sure you want to delete this folder? Files in this folder will be moved to root (no folder). This action cannot be undone.
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

      {/* Delete File Confirmation Modal */}
      {deleteFileConfirm.show && (
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
                  onClick={() => setDeleteFileConfirm({ show: false, fileId: null, folderId: null })}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteFileConfirm}
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

