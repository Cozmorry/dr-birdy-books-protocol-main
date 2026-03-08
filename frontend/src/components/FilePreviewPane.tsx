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

/** Append PDF viewer params to hide toolbar (copy/edit etc.) so users can't bypass staking by saving content. */
const pdfPreviewUrl = (url: string) => {
  const hash = '#toolbar=0&navpanes=0';
  return url.includes('#') ? `${url.split('#')[0]}${hash}` : `${url}${hash}`;
};

interface FilePreviewPaneProps {
  selectedFile: FilePreviewFile | null;
  previewUrl: string | null;
  previewLoading: boolean;
  onClose: () => void;
}

/** Props for inner pane when we know selectedFile is non-null. */
interface PreviewPaneInnerProps {
  selectedFile: FilePreviewFile;
  previewUrl: string | null;
  previewLoading: boolean;
  onClose: () => void;
  contentClassName?: string;
}

/** Inner pane content (header + body), shared by sidebar and modal. */
function PreviewPaneInner({
  selectedFile,
  previewUrl,
  previewLoading,
  onClose,
  contentClassName,
}: PreviewPaneInnerProps) {
  return (
    <>
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 flex items-center justify-between flex-shrink-0">
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
      <div
        className={`flex-1 min-h-0 flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4 overflow-auto select-none ${contentClassName ?? ''}`}
        onContextMenu={(e) => e.preventDefault()}
        style={{ WebkitUserSelect: 'none', userSelect: 'none' }}
      >
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
            className="max-w-full max-h-full object-contain rounded pointer-events-none"
            onContextMenu={(e) => e.preventDefault()}
            draggable={false}
            style={{ pointerEvents: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
          />
        )}
        {!previewLoading && previewUrl && isPreviewablePdf(selectedFile.fileType) && (
          <div className="w-full h-full min-h-[300px] select-none" onContextMenu={(e) => e.preventDefault()} style={{ WebkitUserSelect: 'none', userSelect: 'none' }}>
            <iframe
              title={selectedFile.fileName}
              src={pdfPreviewUrl(previewUrl)}
              className="w-full h-full min-h-[300px] rounded border-0 pointer-events-auto"
            />
          </div>
        )}
        {!previewLoading && previewUrl && !isPreviewableImage(selectedFile.fileType) && !isPreviewablePdf(selectedFile.fileType) && (
          <div className="w-full h-full min-h-[300px] select-none" onContextMenu={(e) => e.preventDefault()} style={{ WebkitUserSelect: 'none', userSelect: 'none' }}>
            <iframe
              title={selectedFile.fileName}
              src={pdfPreviewUrl(previewUrl)}
              className="w-full h-full min-h-[300px] rounded border-0 pointer-events-auto"
            />
          </div>
        )}
      </div>
    </>
  );
}

/**
 * Reusable preview pane: header (title, format, size, close) + content (image / PDF / iframe).
 * Desktop: sticky sidebar (does not scroll with content, like Windows Explorer).
 * Mobile: modal popup.
 */
export default function FilePreviewPane({
  selectedFile,
  previewUrl,
  previewLoading,
  onClose,
}: FilePreviewPaneProps) {
  if (!selectedFile) return null;

  return (
    <>
      {/* Desktop: sticky sidebar filling viewport height (reaches bottom) */}
      <div
        className="hidden lg:flex sticky top-4 self-start flex-col w-[420px] flex-shrink-0 h-[calc(100vh-2rem)] bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden select-none"
        onContextMenu={(e) => e.preventDefault()}
        style={{ WebkitUserSelect: 'none', userSelect: 'none' }}
      >
        <PreviewPaneInner
          selectedFile={selectedFile}
          previewUrl={previewUrl}
          previewLoading={previewLoading}
          onClose={onClose}
        />
      </div>

      {/* Mobile: modal popup overlay */}
      <div
        className="lg:hidden fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
        onClick={(e) => e.target === e.currentTarget && onClose()}
        role="dialog"
        aria-modal="true"
        aria-label="File preview"
      >
        <div
          className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col max-h-[90vh] w-full max-w-lg select-none"
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
          style={{ WebkitUserSelect: 'none', userSelect: 'none' }}
        >
          <PreviewPaneInner
            selectedFile={selectedFile}
            previewUrl={previewUrl}
            previewLoading={previewLoading}
            onClose={onClose}
            contentClassName="min-h-[240px]"
          />
        </div>
      </div>
    </>
  );
}
