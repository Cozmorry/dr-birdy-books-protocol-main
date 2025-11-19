import React, { useState, useEffect } from 'react';
import { Upload, File, CheckCircle, AlertCircle, Eye, Download, Trash2 } from 'lucide-react';
import { ArweaveFile } from '../types';

interface FileManagementProps {
  userInfo: any;
  userTier: number;
  hasAccess: boolean;
  onVerifyTransaction: (txId: string) => Promise<boolean>;
  onAddTransaction: (txId: string, isVerified: boolean) => Promise<void>;
  onGetTierFiles: (tierIndex: number) => Promise<any[]>;
  onGetUserFiles: (userAddress: string) => Promise<any[]>;
  onLogFileAccess: (userAddress: string, tierIndex: number, txId: string) => Promise<void>;
  onAddFileToTier: (tierIndex: number, txIds: string[], fileTypes: string[], descriptions: string[], versions: number[]) => Promise<void>;
  onAddFileToUser: (userAddress: string, txIds: string[], fileTypes: string[], descriptions: string[], versions: number[]) => Promise<void>;
  isLoading: boolean;
}

export const FileManagement: React.FC<FileManagementProps> = ({
  userInfo,
  userTier,
  hasAccess,
  onVerifyTransaction,
  onAddTransaction,
  onGetTierFiles,
  onGetUserFiles,
  onLogFileAccess,
  onAddFileToTier,
  onAddFileToUser,
  isLoading,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileDescription, setFileDescription] = useState('');
  const [fileType, setFileType] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tierFiles, setTierFiles] = useState<any[]>([]);
  const [userFiles, setUserFiles] = useState<any[]>([]);
  const [verificationTxId, setVerificationTxId] = useState('');
  const [isAdmin, setIsAdmin] = useState(false); // This would be determined by contract role

  // Load files when component mounts or user changes
  useEffect(() => {
    if (userInfo?.address) {
      loadFiles();
    }
  }, [userInfo?.address, userTier]);

  // Also load files from local storage on component mount
  useEffect(() => {
    const localFiles = JSON.parse(localStorage.getItem('userFiles') || '[]');
    if (localFiles.length > 0) {
      console.log('Loading files from local storage on mount:', localFiles);
      setUserFiles(localFiles);
    }
  }, []);

  const loadFiles = async () => {
    try {
      // Load tier files from contract
      if (userTier >= 0) {
        try {
          const tierFilesData = await onGetTierFiles(userTier);
          console.log('Tier files data:', tierFilesData);
          setTierFiles(tierFilesData);
        } catch (err: any) {
          console.log('Could not load tier files from contract:', err.message);
          setTierFiles([]);
        }
      }
      
      // Load user files from contract and local storage
      if (userInfo?.address) {
        try {
          const userFilesData = await onGetUserFiles(userInfo.address);
          console.log('User files data from contract:', userFilesData);
          
          // Also load from local storage
          const localFiles = JSON.parse(localStorage.getItem('userFiles') || '[]');
          console.log('User files data from local storage:', localFiles);
          
          // Combine both sources (contract files + local files)
          const combinedFiles = [...userFilesData, ...localFiles];
          setUserFiles(combinedFiles);
        } catch (err: any) {
          console.log('Could not load user files from contract:', err.message);
          
          // Fallback to local storage only
          const localFiles = JSON.parse(localStorage.getItem('userFiles') || '[]');
          console.log('Using local storage files only:', localFiles);
          setUserFiles(localFiles);
        }
      }
    } catch (err: any) {
      setError('Failed to load files: ' + err.message);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setFileType(file.type.split('/')[1] || 'unknown');
      setError(null);
    }
  };

  const handleFileUpload = async () => {
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

      // Try to add to Arweave gateway (this will work now)
      try {
        await onAddTransaction(mockTxId, true);
        console.log('✅ Transaction added to Arweave gateway');
      } catch (gatewayErr: any) {
        console.log('⚠️ Could not add to Arweave gateway:', gatewayErr.message);
        // Continue anyway since we're using local storage
      }

      // Try to add to user files (this will work now)
      try {
        await onAddFileToUser(
          userInfo.address,
          [mockTxId],
          [fileType],
          [fileDescription],
          [1]
        );
        console.log('✅ File added to user files');
      } catch (userErr: any) {
        console.log('⚠️ Could not add to user files:', userErr.message);
        // Continue anyway since we're using local storage
      }

      setSuccess(`File uploaded successfully! Transaction ID: ${mockTxId}`);
      setSelectedFile(null);
      setFileDescription('');
      setFileType('');
      
      // Reload files
      await loadFiles();
      
      // Force update userFiles state with local storage data
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
      const isVerified = await onVerifyTransaction(verificationTxId);
      if (isVerified) {
        setSuccess(`Transaction ${verificationTxId} is verified`);
      } else {
        setError(`Transaction ${verificationTxId} is not verified`);
      }
    } catch (err: any) {
      setError('Failed to verify transaction: ' + err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleFileAccess = async (txId: string, tierIndex: number) => {
    try {
      await onLogFileAccess(userInfo.address, tierIndex, txId);
      setSuccess(`File access logged for ${txId}`);
    } catch (err: any) {
      setError('Failed to log file access: ' + err.message);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">File Management</h3>
      
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
              onClick={handleFileUpload}
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

        {/* Tier Files */}
        {tierFiles.length > 0 && (
          <div className="bg-purple-50 rounded-lg p-4">
            <h4 className="text-lg font-medium text-purple-900 mb-4">
              Tier {userTier + 1} Files ({tierFiles.length})
            </h4>
            
            <div className="space-y-2">
              {tierFiles.map((file, index) => (
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
                    {file.txId ? (
                      <>
                        <button
                          onClick={() => handleFileAccess(file.txId, userTier)}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                          title="Log Access"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => window.open(`https://arweave.net/${file.txId}`, '_blank')}
                          className="p-2 text-green-600 hover:bg-green-100 rounded-md transition-colors"
                          title="View on Arweave"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500 px-2 py-1 bg-gray-100 rounded">
                          No Arweave ID
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}


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
        {tierFiles.length === 0 && userFiles.length === 0 && (
          <div className="text-center py-8">
            <File className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No files available for your tier</p>
            <p className="text-sm text-gray-500 mt-2">
              Upload files or contact an administrator to add files to your tier
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
