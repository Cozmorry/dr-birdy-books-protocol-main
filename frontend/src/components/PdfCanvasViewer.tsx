import React, { useEffect, useState, useRef, useCallback } from 'react';
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from 'pdfjs-dist';
import { getPdfFromPersistentCache, setPdfInPersistentCache } from '../utils/pdfPreviewCache';

// Serve worker from our app so it works offline and avoids CDN/version mismatch
if (typeof GlobalWorkerOptions.workerSrc === 'string' && GlobalWorkerOptions.workerSrc.length > 0) {
  // already set
} else {
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  GlobalWorkerOptions.workerSrc = `${base}${process.env.PUBLIC_URL || ''}/pdf.worker.min.mjs`;
}

const PDF_PREVIEW_CACHE_MAX = 5;
const pdfPreviewCache = new Map<string, ArrayBuffer>();

function getCachedPdf(url: string): ArrayBuffer | undefined {
  return pdfPreviewCache.get(url);
}

function setCachedPdf(url: string, data: ArrayBuffer): void {
  if (pdfPreviewCache.size >= PDF_PREVIEW_CACHE_MAX) {
    const firstKey = pdfPreviewCache.keys().next().value;
    if (firstKey !== undefined) pdfPreviewCache.delete(firstKey);
  }
  pdfPreviewCache.set(url, data);
}

interface PdfCanvasViewerProps {
  /** Presigned or inline URL for the PDF. Fetched as bytes so the browser never loads a PDF document (no Save As). */
  url: string;
  /** Optional file name for aria-label */
  fileName?: string;
  /** Stable key for cache (e.g. file id). Use so the same file hits cache after reload even when URL changes. */
  cacheKey?: string;
  className?: string;
}

/**
 * Renders a PDF by fetching bytes and drawing to canvas. No iframe = no browser
 * "Save As" / context menu on a PDF document. Right-click and selection are
 * disabled on the container/canvas.
 */
export default function PdfCanvasViewer({ url, fileName, cacheKey, className = '' }: PdfCanvasViewerProps) {
  const cacheKeyOrUrl = cacheKey ?? url;
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useIframeFallback, setUseIframeFallback] = useState(false);
  const pdfRef = useRef<PDFDocumentProxy | null>(null);
  const renderTaskRef = useRef<{ cancel: () => void; promise: Promise<void> } | null>(null);

  const renderPage = useCallback(
    async (pdf: PDFDocumentProxy, pageNum: number) => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      try {
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
          renderTaskRef.current = null;
        }
        const page = await pdf.getPage(pageNum);
        const containerWidth = container.clientWidth || 600;
        const viewport = page.getViewport({ scale: 1 });
        const scale = Math.min(containerWidth / viewport.width, 2);
        const scaledViewport = page.getViewport({ scale });
        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const task = page.render({
          canvasContext: ctx,
          viewport: scaledViewport,
        });
        renderTaskRef.current = task;
        await task.promise;
        renderTaskRef.current = null;
      } catch (e) {
        if (e && typeof e === 'object' && 'name' in e && (e as { name: string }).name === 'RenderingCancelledException') return;
        console.error('PDF render error:', e);
      }
    },
    []
  );

  useEffect(() => {
    let cancelled = false;
    const abortController = new AbortController();
    const FETCH_TIMEOUT_MS = 20000;

    setLoading(true);
    setError(null);
    setUseIframeFallback(false);
    setNumPages(0);
    setCurrentPage(1);

    (async () => {
      try {
        // 0a) In-memory cache (instant when reopening same file in this tab)
        const cached = getCachedPdf(cacheKeyOrUrl);
        if (cached) {
          const dataTask = getDocument({ data: cached });
          const pdf = await dataTask.promise;
          if (cancelled) return;
          pdfRef.current = pdf;
          setNumPages(pdf.numPages);
          setLoading(false);
          await renderPage(pdf, 1);
          return;
        }

        // 0b) Persistent cache (survives reload; IndexedDB) – key by file id so same file hits after reload
        const persisted = await getPdfFromPersistentCache(cacheKeyOrUrl);
        if (persisted && !cancelled) {
          setCachedPdf(cacheKeyOrUrl, persisted);
          const dataTask = getDocument({ data: persisted });
          const pdf = await dataTask.promise;
          if (cancelled) return;
          pdfRef.current = pdf;
          setNumPages(pdf.numPages);
          setLoading(false);
          await renderPage(pdf, 1);
          return;
        }

        // 1) Try URL-based loading so PDF.js does the request (handles redirects / same-origin)
        const loadingTask = getDocument({
          url,
          withCredentials: true,
        });
        const pdf = await Promise.race([
          loadingTask.promise,
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), FETCH_TIMEOUT_MS)
          ),
        ]);
        if (cancelled) return;
        pdfRef.current = pdf;
        setNumPages(pdf.numPages);
        setLoading(false);
        await renderPage(pdf, 1);
        return;
      } catch (_urlErr) {
        if (cancelled) return;
        // 2) Fallback: fetch bytes then load (required when URL is cross-origin and CORS allows)
        try {
          const timeoutId = setTimeout(() => abortController.abort(), FETCH_TIMEOUT_MS);
          const res = await fetch(url, {
            signal: abortController.signal,
            credentials: 'same-origin',
            mode: 'cors',
          });
          clearTimeout(timeoutId);
          if (cancelled) return;
          if (!res.ok) {
            setError(`Could not load preview (${res.status})`);
            setLoading(false);
            return;
          }
          const arrayBuffer = await res.arrayBuffer();
          if (cancelled) return;
          setCachedPdf(cacheKeyOrUrl, arrayBuffer);
          setPdfInPersistentCache(cacheKeyOrUrl, arrayBuffer).catch(() => {});
          const dataTask = getDocument({ data: arrayBuffer });
          const pdf = await dataTask.promise;
          if (cancelled) return;
          pdfRef.current = pdf;
          setNumPages(pdf.numPages);
          setLoading(false);
          await renderPage(pdf, 1);
        } catch (e: unknown) {
          if (cancelled) return;
          const err = e as { name?: string; message?: string };
          if (err?.name === 'AbortError') {
            setError('Preview timed out. Try again.');
          } else if (err?.message?.includes('Failed to fetch') || err?.message?.includes('NetworkError')) {
            setError('Network error. If the file is on another site, it may block preview.');
          } else {
            setError('Could not load preview');
            console.error('PdfCanvasViewer error:', e);
          }
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      abortController.abort();
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
      if (pdfRef.current) {
        pdfRef.current.destroy();
        pdfRef.current = null;
      }
    };
  }, [url, cacheKey, renderPage]);

  useEffect(() => {
    const pdf = pdfRef.current;
    if (!pdf || currentPage < 1 || currentPage > numPages) return;
    renderPage(pdf, currentPage);
  }, [currentPage, numPages, renderPage]);

  const onContextMenu = (e: React.MouseEvent) => e.preventDefault();

  if (loading) {
    return (
      <div className={`flex items-center justify-center min-h-[300px] ${className}`} onContextMenu={onContextMenu}>
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
          <span className="text-sm text-gray-500">Loading PDF…</span>
        </div>
      </div>
    );
  }

  if (error && !useIframeFallback) {
    return (
      <div className={`flex flex-col items-center justify-center min-h-[300px] gap-3 px-4 ${className}`} onContextMenu={onContextMenu}>
        <span className="text-gray-500 text-center">{error}</span>
        <button
          type="button"
          onClick={() => setUseIframeFallback(true)}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          Open preview in browser viewer
        </button>
      </div>
    );
  }

  if (useIframeFallback) {
    return (
      <div className={`w-full h-full min-h-[300px] select-none ${className}`} onContextMenu={onContextMenu} style={{ WebkitUserSelect: 'none', userSelect: 'none' }}>
        <iframe
          title={fileName ?? 'PDF preview'}
          src={url}
          className="w-full h-full min-h-[300px] rounded border-0"
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`flex flex-col items-center min-h-0 overflow-auto select-none ${className}`}
      onContextMenu={onContextMenu}
      style={{ WebkitUserSelect: 'none', userSelect: 'none' }}
      role="img"
      aria-label={fileName ? `PDF preview: ${fileName}` : 'PDF preview'}
    >
      <canvas
        ref={canvasRef}
        className="max-w-full h-auto"
        onContextMenu={onContextMenu}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
        draggable={false}
      />
      {numPages > 1 && (
        <div className="flex items-center gap-2 mt-2 pb-2">
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Page {currentPage} of {numPages}
          </span>
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
            disabled={currentPage >= numPages}
            className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
