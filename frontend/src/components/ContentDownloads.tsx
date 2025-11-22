import React, { useState, useEffect } from 'react';
import { Download, File, Image, FileText, Video, Music, AlertCircle, CheckCircle, Eye } from 'lucide-react';

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
}

interface ContentDownloadsProps {
  userInfo: any;
  userTier: number;
  hasAccess: boolean;
  isLoading: boolean;
}

export const ContentDownloads: React.FC<ContentDownloadsProps> = ({
  userInfo,
  userTier,
  hasAccess,
  isLoading,
}) => {
  const [availableFiles, setAvailableFiles] = useState<ContentFile[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<ContentFile[]>([]);
  const [selectedTier, setSelectedTier] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadAvailableFiles();
  }, [userTier, hasAccess]);

  useEffect(() => {
    filterFiles();
  }, [availableFiles, selectedTier, searchQuery, userTier]);

  const loadAvailableFiles = async () => {
    try {
      // Load from localStorage (temporary - will be replaced with API)
      const storedFiles = JSON.parse(localStorage.getItem('userFiles') || '[]');
      const tierFiles = JSON.parse(localStorage.getItem('tierFiles') || '[]');
      
      // Combine and format files
      const allFiles: ContentFile[] = [
        ...storedFiles.map((f: any) => ({
          id: f.txId || f.id,
          txId: f.txId,
          fileName: f.fileName || 'Untitled',
          fileType: f.fileType || 'unknown',
          description: f.description || '',
          tier: -1, // User files
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
    } catch (err: any) {
      console.error('Failed to load files:', err);
    }
  };

  const filterFiles = () => {
    let filtered = [...availableFiles];

    // Filter by tier access
    if (userTier >= 0) {
      filtered = filtered.filter(
        (file) => file.tier === -1 || file.tier <= userTier
      );
    } else {
      filtered = filtered.filter((file) => file.tier === -1);
    }

    // Filter by selected tier
    if (selectedTier !== 'all') {
      filtered = filtered.filter(
        (file) => file.tier === selectedTier || file.tier === -1
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

    setFilteredFiles(filtered);
  };

  const handleDownload = (file: ContentFile) => {
    if (file.fileData) {
      // Download from base64 data
      const link = document.createElement('a');
      link.href = file.fileData;
      link.download = file.fileName || `file.${file.fileType}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (file.txId) {
      // Open Arweave URL
      window.open(`https://arweave.net/${file.txId}`, '_blank');
    }
  };

  const handlePreview = (file: ContentFile) => {
    if (file.fileData && ['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(file.fileType.toLowerCase())) {
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(`
          <html>
            <head><title>${file.fileName || 'File Preview'}</title></head>
            <body style="margin:0; padding:20px; text-align:center; background:#f5f5f5;">
              <h2>${file.description || 'File Preview'}</h2>
              <img src="${file.fileData}" style="max-width:100%; max-height:80vh; border:1px solid #ddd; border-radius:8px; box-shadow:0 2px 8px rgba(0,0,0,0.1);" />
              <br><br>
              <button onclick="window.close()" style="padding:10px 20px; background:#007bff; color:white; border:none; border-radius:4px; cursor:pointer;">Close</button>
            </body>
          </html>
        `);
        newWindow.document.close();
      }
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
        <div className="flex items-center space-x-2">
          {userTier >= 0 && (
            <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
              Tier {userTier + 1} Access
            </span>
          )}
          <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
            {filteredFiles.length} {filteredFiles.length === 1 ? 'File' : 'Files'}
          </span>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {userTier >= 0 && (
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Tiers</option>
              <option value="0">Tier 1</option>
              <option value="1">Tier 2</option>
              <option value="2">Tier 3</option>
            </select>
          )}
        </div>
      </div>

      {/* Files List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading files...</span>
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
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3 flex-1">
                  {getFileIcon(file.fileType)}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">
                      {file.fileName}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {file.description || 'No description'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                <span className="uppercase">{file.fileType}</span>
                {file.fileSize && <span>{formatFileSize(file.fileSize)}</span>}
              </div>

              {file.tier >= 0 && (
                <div className="mb-3">
                  <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                    Tier {file.tier + 1}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  {formatDate(file.uploadDate)}
                </span>
                <div className="flex items-center space-x-2">
                  {file.fileData && ['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(file.fileType.toLowerCase()) && (
                    <button
                      onClick={() => handlePreview(file)}
                      className="p-2 text-purple-600 hover:bg-purple-100 rounded-md transition-colors"
                      title="Preview"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDownload(file)}
                    className="p-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors flex items-center"
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


