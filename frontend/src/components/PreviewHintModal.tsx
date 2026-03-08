import React, { useState, useEffect } from 'react';

const STORAGE_KEY = 'drbirdy_preview_hint_dismissed';

interface PreviewHintModalProps {
  /** When true, the hint can show (e.g. there are files to preview). */
  showCondition: boolean;
}

export default function PreviewHintModal({ showCondition }: PreviewHintModalProps) {
  const [visible, setVisible] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    if (showCondition && !localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, [showCondition]);

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem(STORAGE_KEY, '1');
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-hint-title"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-6 max-w-sm w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="preview-hint-title" className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Preview files
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Click on a file to preview it.
        </p>
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span>Don&apos;t show this again</span>
        </label>
        <button
          type="button"
          onClick={handleClose}
          className="w-full px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-md transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
