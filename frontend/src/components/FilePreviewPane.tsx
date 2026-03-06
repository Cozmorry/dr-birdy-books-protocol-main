import React from 'react';

export interface FilePreviewFile {
  fileName: string;
  fileType: string;
  fileSize?: number;
}

const formatFileSize = (bytes?: number) => {
  if (!bytes) return 'Unknown size';
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

const isPreviewableImage = (fileType: string) => {
  const t = fileType.toLowerCase();
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(t);
};

const isPreviewablePdf = (fileType: string) => {
  return fileType.toLowerCase() === 'pdf';
};

interface FilePreviewPaneProps {
  selectedFile: FilePreviewFile | null;
  previewUrl: string | null;
  previewLoading: boolean;
  onClose: () => void;
}

/**
 * Reusable preview pane: header (title, format, size, close) + content (image / PDF / iframe).
 * Used in main app ContentDownloads and admin Files/FolderDetail.
 */
export default function FilePreviewPane({
  selectedFile,
  previewUrl,
  previewLoading,
  onClose,
}: FilePreviewPaneProps) {
  if (!selectedFile) return null;

  return (
    <div className="w-full lg:w-[420px] flex-shrink-0 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Preview</h3>
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate mt-0.5" title={selectedFile.fileName}>
            {selectedFile.fileName}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span className="uppercase">{selectedFile.fileType}</span>
            {selectedFile.fileSize != null && selectedFile.fileSize > 0 && (
              <span> • {formatFileSize(selectedFile.fileSize)}</span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="ml-2 p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          title="Close preview"
          aria-label="Close preview"
        >
          <span className="text-lg leading-none">×</span>
        </button>
      </div>
      <div className="flex-1 min-h-[320px] flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4 overflow-auto">
        {previewLoading && (
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
            <span className="text-sm text-gray-500">Loading preview…</span>
          </div>
        )}
        {!previewLoading && !previewUrl && (
          <p className="text-sm text-gray-500 text-center">Preview not available for this file</p>
        )}
        {!previewLoading && previewUrl && isPreviewableImage(selectedFile.fileType) && (
          <img
            src={previewUrl}
            alt={selectedFile.fileName}
            className="max-w-full max-h-[70vh] object-contain rounded"
          />
        )}
        {!previewLoading && previewUrl && isPreviewablePdf(selectedFile.fileType) && (
          <iframe
            title={selectedFile.fileName}
            src={previewUrl}
            className="w-full h-[70vh] min-h-[400px] rounded border-0"
          />
        )}
        {!previewLoading && previewUrl && !isPreviewableImage(selectedFile.fileType) && !isPreviewablePdf(selectedFile.fileType) && (
          <iframe
            title={selectedFile.fileName}
            src={previewUrl}
            className="w-full h-[70vh] min-h-[400px] rounded border-0"
          />
        )}
      </div>
    </div>
  );
}
