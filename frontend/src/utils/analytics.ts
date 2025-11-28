/**
 * Google Analytics utility functions
 * Uses Google Analytics 4 (GA4)
 */

declare global {
  interface Window {
    gtag: (
      command: 'config' | 'event' | 'js' | 'set',
      targetId: string | Date,
      config?: Record<string, any>
    ) => void;
    dataLayer: any[];
  }
}

// Get GA tracking ID from environment variable
const GA_TRACKING_ID = process.env.REACT_APP_GA_TRACKING_ID;

/**
 * Initialize Google Analytics
 * Call this once when the app loads
 */
export const initGA = () => {
  if (!GA_TRACKING_ID) {
    console.warn('Google Analytics tracking ID not found. Set REACT_APP_GA_TRACKING_ID in .env');
    return;
  }

  // Create dataLayer if it doesn't exist
  window.dataLayer = window.dataLayer || [];
  
  // Define gtag function
  window.gtag = function() {
    window.dataLayer.push(arguments);
  };

  // Load GA script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`;
  document.head.appendChild(script);

  // Initialize GA
  window.gtag('js', new Date());
  window.gtag('config', GA_TRACKING_ID, {
    page_path: window.location.pathname,
  });
};

/**
 * Track page view
 * Call this when the route changes
 */
export const trackPageView = (path: string, title?: string) => {
  if (!GA_TRACKING_ID || !window.gtag) return;

  window.gtag('config', GA_TRACKING_ID, {
    page_path: path,
    page_title: title || document.title,
  });
};

/**
 * Track custom event
 */
export const trackEvent = (
  action: string,
  category: string,
  label?: string,
  value?: number
) => {
  if (!GA_TRACKING_ID || !window.gtag) return;

  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value,
  });
};

/**
 * Track wallet connection
 */
export const trackWalletConnect = (walletType: string, chainId?: number) => {
  trackEvent('wallet_connect', 'Wallet', walletType, chainId);
};

/**
 * Track staking action
 */
export const trackStaking = (action: 'stake' | 'unstake', amount: number, tier?: number) => {
  trackEvent(action, 'Staking', tier ? `Tier ${tier}` : undefined, amount);
};

/**
 * Track file download
 */
export const trackFileDownload = (fileId: string, fileName: string, tier: number) => {
  trackEvent('file_download', 'Content', `${fileName} (Tier ${tier})`);
};

/**
 * Track blog view
 */
export const trackBlogView = (postId: string, postTitle?: string) => {
  trackEvent('blog_view', 'Content', postTitle || postId);
};

/**
 * Track tier purchase
 */
export const trackTierPurchase = (tier: number, amount: number) => {
  trackEvent('tier_purchase', 'Tier', `Tier ${tier}`, amount);
};

/**
 * Track feedback submission
 */
export const trackFeedback = (type: string) => {
  trackEvent('feedback_submit', 'Feedback', type);
};

