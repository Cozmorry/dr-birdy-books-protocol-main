import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App';
import { GoogleAnalytics } from './components/GoogleAnalytics';

// Initialize theme on app load (apply saved preference or system)
(function initTheme() {
  try {
    const key = 'theme-preference';
    const stored = localStorage.getItem(key);
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const root = document.documentElement;
    if (stored === 'dark' || (!stored && prefersDark)) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  } catch (e) {
    // ignore
  }
})();

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <GoogleAnalytics />
      <App />
    </BrowserRouter>
  </React.StrictMode>
);