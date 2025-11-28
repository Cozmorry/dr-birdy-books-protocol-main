import React, { useState, useEffect } from 'react';
import { Download, File, Image, FileText, Video, Music, AlertCircle } from 'lucide-react';

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
  const [downloadStats, setDownloadStats] = useState<any>(null);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);

  useEffect(() => {
    loadAvailableFiles();
    loadDownloadStats();
  }, [userTier, hasAccess, userInfo?.address]);

  useEffect(() => {
    filterFiles();
  }, [availableFiles, selectedTier, searchQuery, userTier]);

  const loadAvailableFiles = async () => {
    try {
      // Fetch files from backend API
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
      const walletAddress = userInfo?.address;
      
      // Build query parameters
      const params = new URLSearchParams();
      if (walletAddress) {
        params.append('walletAddress', walletAddress);
      }
      
      const response = await fetch(`${API_BASE_URL}/files?${params.toString()}`);
      const data = await response.json();
      
      if (data.success && data.data?.files) {
        // Format files from API response
        const allFiles: ContentFile[] = data.data.files.map((f: any) => ({
          id: f._id || f.id,
          txId: f.arweaveTxId || f._id,
          fileName: f.originalName || f.fileName || 'Untitled',
          fileType: f.fileType || 'unknown',
          description: f.description || '',
          tier: f.tier || -1,
          uploadDate: f.createdAt || new Date().toISOString(),
          fileSize: f.fileSize || 0,
          downloadUrl: `${API_BASE_URL}/files/${f._id}/download`, // Don't include walletAddress here
        }));
        
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

  const loadDownloadStats = async () => {
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
  };

  const handleDownload = async (file: ContentFile) => {
    if (!userInfo?.address) {
      alert('Please connect your wallet to download files');
      return;
    }

    setDownloadingFileId(file.id);
    
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
          alert(
            errorData.message + 
            (errorData.remaining !== undefined ? `\nRemaining: ${errorData.remaining}` : '') +
            (errorData.resetTime ? `\nResets: ${errorData.resetTime}` : '')
          );
        } else {
          alert(errorData.message || 'Failed to generate download link');
        }
        setDownloadingFileId(null);
        return;
      }

      const presignedData = await presignedResponse.json();
      
      // Show quota warning if present
      if (presignedData.warning) {
        const warningMsg = `⚠️ ${presignedData.message}\n\n` +
          `Used: ${(presignedData.warning.used / (1024 * 1024 * 1024)).toFixed(2)} GB / ` +
          `${(presignedData.warning.limit / (1024 * 1024 * 1024)).toFixed(2)} GB\n` +
          `Percentage: ${presignedData.warning.percentage.toFixed(1)}%`;
        
        if (!window.confirm(warningMsg + '\n\nContinue with download?')) {
          setDownloadingFileId(null);
          return;
        }
      }

      // Step 2: Directly navigate to download URL (browser handles download natively)
      // This avoids loading the entire file into memory first
      const downloadUrl = `${API_BASE_URL}${presignedData.downloadUrl}`;
      
      // Create a hidden link and trigger download
      // The browser will handle the download directly without loading into memory
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = file.fileName || `file.${file.fileType}`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Reset loading state immediately (download happens in background)
      setDownloadingFileId(null);
      
      // Refresh stats after a short delay to allow download to complete
      setTimeout(() => {
        loadDownloadStats();
      }, 1000);
      
    } catch (error: any) {
      console.error('Download error:', error);
      alert(error.message || 'Failed to download file');
    } finally {
      setDownloadingFileId(null);
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
              <div className="flex items-start space-x-3 mb-3">
                {getFileIcon(file.fileType)}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 truncate mb-1">
                    {file.fileName}
                  </h3>
                  <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                    {file.description || 'No description'}
                  </p>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span className="uppercase">{file.fileType}</span>
                    {file.fileSize && <span>{formatFileSize(file.fileSize)}</span>}
                  </div>
                </div>
              </div>


              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                <span className="text-xs text-gray-500">
                  {formatDate(file.uploadDate)}
                </span>
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
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


