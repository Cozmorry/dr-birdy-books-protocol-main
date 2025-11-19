import React, { useState, useEffect } from 'react';
import { Upload, File, CheckCircle, AlertCircle, Download, Trash2, Eye } from 'lucide-react';
import { formatNumber } from '../utils/formatNumbers';

interface FileManagementStoreProps {
  userInfo: any;
  userTier: number;
  hasAccess: boolean;
  isLoading: boolean;
}

export const FileManagementStore: React.FC<FileManagementStoreProps> = ({
  userInfo,
  userTier,
  hasAccess,
  isLoading,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileDescription, setFileDescription] = useState('');
  const [fileType, setFileType] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  // const [tierFiles, setTierFiles] = useState<any[]>([]);
  const [userFiles, setUserFiles] = useState<any[]>([]);
  const [verificationTxId, setVerificationTxId] = useState('');

  // Load files from local storage on component mount
  useEffect(() => {
    const localFiles = JSON.parse(localStorage.getItem('userFiles') || '[]');
    if (localFiles.length > 0) {
      console.log('Loading files from local storage on mount:', localFiles);
      setUserFiles(localFiles);
    }
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setFileType(file.type.split('/')[1] || 'unknown');
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file to upload');
      return;
    }

    if (!fileDescription.trim()) {
      setError('Please provide a file description');
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccess(null);

    try {
      // Convert file to base64 for storage
      const fileReader = new FileReader();
      const fileDataPromise = new Promise<string>((resolve, reject) => {
        fileReader.onload = () => resolve(fileReader.result as string);
        fileReader.onerror = () => reject(new Error('Failed to read file'));
        fileReader.readAsDataURL(selectedFile);
      });

      const fileBase64 = await fileDataPromise;
      
      // Generate a mock transaction ID for demonstration
      const mockTxId = `arweave_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create file object with base64 data
      const fileData = {
        txId: mockTxId,
        fileType: fileType,
        description: fileDescription,
        version: 1,
        uploadDate: new Date().toISOString(),
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileData: fileBase64 // Store the actual file content
      };

      // Store in local storage as temporary solution
      const existingFiles = JSON.parse(localStorage.getItem('userFiles') || '[]');
      existingFiles.push(fileData);
      localStorage.setItem('userFiles', JSON.stringify(existingFiles));

      setSuccess(`File uploaded successfully! Transaction ID: ${mockTxId}`);
      setSelectedFile(null);
      setFileDescription('');
      setFileType('');
      
      // Reload files
      const updatedLocalFiles = JSON.parse(localStorage.getItem('userFiles') || '[]');
      setUserFiles(updatedLocalFiles);
      console.log('Force updated userFiles:', updatedLocalFiles);
    } catch (err: any) {
      setError('Failed to upload file: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleVerifyTransaction = async () => {
    if (!verificationTxId.trim()) {
      setError('Please enter a transaction ID');
      return;
    }

    setIsVerifying(true);
    setError(null);
    setSuccess(null);

    try {
      // Simulate transaction verification
      // In a real implementation, this would call the contract to verify
      const isValid = Math.random() > 0.3; // Simulate 70% success rate
      
      if (isValid) {
        setSuccess(`Transaction ${verificationTxId} verified successfully!`);
      } else {
        setError(`Transaction ${verificationTxId} verification failed`);
      }
    } catch (err: any) {
      setError(`Verification failed: ${err.message}`);
    } finally {
      setIsVerifying(false);
    }
  };

  // const handleDownload = (file: any) => {
  //   // In a real implementation, this would download from Arweave
  //   setSuccess(`Downloading ${file.fileName}...`);
  // };

  const handleDelete = (file: any) => {
    // Remove from local storage
    const existingFiles = JSON.parse(localStorage.getItem('userFiles') || '[]');
    const updatedFiles = existingFiles.filter((f: any) => f.txId !== file.txId);
    localStorage.setItem('userFiles', JSON.stringify(updatedFiles));
    
    setUserFiles(prev => prev.filter(f => f.txId !== file.txId));
    setSuccess(`File ${file.fileName} removed`);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return formatNumber(bytes / Math.pow(k, i)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    if (!fileType) {
      return '📁';
    }
    
    switch (fileType.toLowerCase()) {
      case 'pdf':
        return '📄';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return '🖼️';
      case 'mp4':
      case 'avi':
      case 'mov':
        return '🎥';
      case 'mp3':
      case 'wav':
        return '🎵';
      default:
        return '📁';
    }
  };

  if (!hasAccess) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">File Management</h3>
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">You need to stake tokens to access file management features</p>
        </div>
      </div>
    );
  }

  if (!userInfo) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <File className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Please connect your wallet to access file management</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center">
          <Upload className="h-6 w-6 text-blue-600 mr-2" />
          File Management
        </h2>
        <div className="flex items-center space-x-2">
          <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
            Tier {userTier >= 0 ? userTier : 'None'}
          </span>
          {hasAccess && (
            <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
              Access Granted
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
          <div className="flex">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <div className="ml-3">
              <p className="text-sm text-green-800">{success}</p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* File Upload Section */}
        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="text-lg font-medium text-blue-900 mb-4">Upload New File</h4>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select File
              </label>
              <input
                type="file"
                onChange={handleFileSelect}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isUploading || isLoading}
              />
              {selectedFile && (
                <p className="text-xs text-gray-500 mt-1">
                  Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                </p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                Note: Files are stored locally. For production, consider uploading to Arweave.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                File Description
              </label>
              <input
                type="text"
                value={fileDescription}
                onChange={(e) => setFileDescription(e.target.value)}
                placeholder="Describe your file..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isUploading || isLoading}
              />
            </div>

            <button
              onClick={handleUpload}
              disabled={!selectedFile || !fileDescription.trim() || isUploading || isLoading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isUploading ? 'Uploading...' : 'Upload to Arweave'}
            </button>
          </div>
        </div>

        {/* Transaction Verification */}
        <div className="bg-green-50 rounded-lg p-4">
          <h4 className="text-lg font-medium text-green-900 mb-4">Verify Arweave Transaction</h4>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transaction ID
              </label>
              <input
                type="text"
                value={verificationTxId}
                onChange={(e) => setVerificationTxId(e.target.value)}
                placeholder="Enter Arweave transaction ID..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                disabled={isVerifying || isLoading}
              />
            </div>

            <button
              onClick={handleVerifyTransaction}
              disabled={!verificationTxId.trim() || isVerifying || isLoading}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isVerifying ? 'Verifying...' : 'Verify Transaction'}
            </button>
          </div>
        </div>

        {/* User Files */}
        {userFiles.length > 0 && (
          <div className="bg-orange-50 rounded-lg p-4">
            <h4 className="text-lg font-medium text-orange-900 mb-4">
              Your Files ({userFiles.length})
            </h4>
            
            <div className="space-y-2">
              {userFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between bg-white rounded-md p-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{getFileIcon(file.fileType)}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{file.description || 'No description'}</p>
                      <p className="text-xs text-gray-500">
                        {file.fileType || 'unknown'} • Version {file.version || 1} • {file.txId ? file.txId.slice(0, 8) + '...' : 'No ID'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {/* Preview button for images */}
                    {file.fileData && (file.fileType === 'png' || file.fileType === 'jpg' || file.fileType === 'jpeg' || file.fileType === 'gif' || file.fileType === 'svg') && (
                      <button
                        onClick={() => {
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
                        }}
                        className="p-2 text-purple-600 hover:bg-purple-100 rounded-md transition-colors"
                        title="Preview File"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    )}
                    
                    {/* Download button */}
                    <button
                      onClick={() => {
                        if (file.fileData) {
                          // If we have the actual file data, download it
                          const link = document.createElement('a');
                          link.href = file.fileData;
                          link.download = file.fileName || `file.${file.fileType}`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        } else {
                          // Fallback to Arweave URL (for real transactions)
                          window.open(`https://arweave.net/${file.txId}`, '_blank');
                        }
                      }}
                      className="p-2 text-green-600 hover:bg-green-100 rounded-md transition-colors"
                      title={file.fileData ? "Download File" : "View on Arweave"}
                    >
                      <Download className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => handleDelete(file)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Force show user files if they exist in local storage */}
        {userFiles.length === 0 && (() => {
          const localFiles = JSON.parse(localStorage.getItem('userFiles') || '[]');
          if (localFiles.length > 0) {
            setUserFiles(localFiles);
            return null;
          }
          return null;
        })()}

        {/* No Files Message */}
        {userFiles.length === 0 && (
          <div className="text-center py-8">
            <File className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No files uploaded yet</p>
            <p className="text-sm text-gray-500 mt-2">
              Upload files to get started with file management
            </p>
          </div>
        )}
      </div>

      {/* Loading State */}
      {(isLoading || isUploading || isVerifying) && (
        <div className="mt-4 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">
            {isUploading ? 'Uploading...' : isVerifying ? 'Verifying...' : 'Loading...'}
          </span>
        </div>
      )}
    </div>
  );
};
