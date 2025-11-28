import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Upload, Download, Trash2, Edit, AlertCircle, CheckCircle, X } from 'lucide-react';

export default function FilesPage() {
  const [files, setFiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [tier, setTier] = useState(-1);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editingFile, setEditingFile] = useState<any | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editTier, setEditTier] = useState(-1);
  const [currentPage, setCurrentPage] = useState(1);
  const [filesPerPage, setFilesPerPage] = useState(20);
  const [totalFiles, setTotalFiles] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'downloads'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadFiles();
  }, [currentPage, filesPerPage]);

  const loadFiles = async () => {
    try {
      setIsLoading(true);
      const response = await api.getFiles({
        page: currentPage,
        limit: filesPerPage,
      });
      if (response.success) {
        setFiles(response.data.files);
        if (response.data.pagination) {
          setTotalFiles(response.data.pagination.total);
          setTotalPages(response.data.pagination.pages);
        }
      }
    } catch (error) {
      console.error('Failed to load files:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter and sort files client-side
  const getDisplayedFiles = () => {
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
        case 'downloads':
          comparison = (a.downloads || 0) - (b.downloads || 0);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile || !description) {
      setMessage({ type: 'error', text: 'Please select a file and provide a description' });
      return;
    }

    setIsUploading(true);
    setMessage(null);

    try {
      const response = await api.uploadFile(selectedFile, description, tier);
      
      if (response.success) {
        setMessage({ type: 'success', text: 'File uploaded successfully!' });
        setSelectedFile(null);
        setDescription('');
        setTier(-1);
        loadFiles();
        
        // Reset file input
        const fileInput = document.getElementById('file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      }
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to upload file',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleEdit = (file: any) => {
    setEditingFile(file);
    setEditDescription(file.description || '');
    setEditTier(file.tier !== undefined ? file.tier : -1);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingFile) return;

    try {
      await api.updateFile(editingFile._id, {
        description: editDescription,
        tier: editTier,
      });
      setMessage({ type: 'success', text: 'File updated successfully' });
      setEditingFile(null);
      loadFiles();
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to update file',
      });
    }
  };

  const handleDelete = async (id: string) => {
    // eslint-disable-next-line no-restricted-globals
    if (!window.confirm('Are you sure you want to delete this file?')) return;

    try {
      await api.deleteFile(id);
      setMessage({ type: 'success', text: 'File deleted successfully' });
      loadFiles();
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to delete file',
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">File Management</h1>
        <p className="text-gray-600 mt-1">Upload and manage content files</p>
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
        </div>
      )}

      {/* Upload Form */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload New File</h2>
        
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select File
            </label>
            <input
              id="file-input"
              type="file"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
              disabled={isUploading}
            />
            {selectedFile && (
              <p className="text-xs text-gray-500 mt-1">
                Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter file description..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              disabled={isUploading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Access Tier
            </label>
            <select
              value={tier}
              onChange={(e) => setTier(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              disabled={isUploading}
            >
              <option value={-1}>Admin Only</option>
              <option value={0}>Tier 1 ($24)</option>
              <option value={1}>Tier 2 ($50)</option>
              <option value={2}>Tier 3 ($1000)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isUploading || !selectedFile || !description}
            className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload File
              </>
            )}
          </button>
        </form>
      </div>

      {/* Files List */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Uploaded Files ({files.length})
        </h2>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : files.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No files uploaded yet</p>
        ) : (
          <>
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
                      Tier
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Downloads
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {getDisplayedFiles().map((file) => (
                  <tr key={file._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {file.originalName}
                      </div>
                      <div className="text-sm text-gray-500">{file.description}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {file.fileType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {file.tier === -1 ? 'Admin' : `Tier ${file.tier + 1}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {file.downloads}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEdit(file)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Edit file"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(file._id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete file"
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

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-200 pt-4">
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
                              ? 'bg-primary-600 text-white border-primary-600'
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
          </>
        )}
      </div>

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

            <form onSubmit={handleUpdate} className="p-6 space-y-4">
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
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Enter file description..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Access Tier
                </label>
                <select
                  value={editTier}
                  onChange={(e) => setEditTier(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value={-1}>Admin Only</option>
                  <option value={0}>Tier 1 ($24)</option>
                  <option value={1}>Tier 2 ($50)</option>
                  <option value={2}>Tier 3 ($1000)</option>
                </select>
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
    </div>
  );
}


