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

// Global error handler for unhandled promise rejections (like MetaMask errors)
window.addEventListener('unhandledrejection', (event) => {
  // Check if it's a MetaMask connection error
  const error = event.reason;
  if (error && (
    error.message?.includes('Failed to connect to MetaMask') ||
    error.message?.includes('connect') && error.message?.includes('MetaMask') ||
    error.message?.includes('MetaMask') && error.message?.includes('connection')
  )) {
    // Prevent the default error display
    event.preventDefault();
    
    // Log to console for debugging
    console.warn('MetaMask connection error caught globally:', error);
    
    // The error should be handled by the useWeb3 hook, but if it reaches here,
    // we'll just log it and prevent the ugly error overlay
    return;
  }
  
  // For other errors, let them through (they might be handled elsewhere)
});

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