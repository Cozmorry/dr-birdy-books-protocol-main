import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

const THEME_KEY = 'theme-preference';

export const ThemeToggle: React.FC = () => {
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(THEME_KEY);
      if (stored) return stored === 'dark';
    } catch (e) {}
    // default to system preference
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      try { localStorage.setItem(THEME_KEY, 'dark'); } catch {}
    } else {
      root.classList.remove('dark');
      try { localStorage.setItem(THEME_KEY, 'light'); } catch {}
    }
  }, [isDark]);

  return (
    <button
      onClick={() => setIsDark((v) => !v)}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="p-1 sm:p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
};

export default ThemeToggle;
