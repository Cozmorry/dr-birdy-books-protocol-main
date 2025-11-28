import { useState, useEffect } from 'react';
import { api } from '../lib/api';

export function useFeedbackBadge() {
  const [newFeedbackCount, setNewFeedbackCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  const loadNewFeedbackCount = async () => {
    try {
      const response = await api.getFeedbackStats();
      if (response.success) {
        const newCount = response.data?.byStatus?.new || 0;
        setNewFeedbackCount(newCount);
      }
    } catch (error: any) {
      // Don't log rate limit errors as errors - they're expected during heavy usage
      if (error.response?.status !== 429) {
        console.error('Failed to load feedback count:', error);
      }
      // Don't reset count on error - keep last known value
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNewFeedbackCount();
    
    // Refresh every 60 seconds (reduced frequency to avoid rate limiting)
    const interval = setInterval(loadNewFeedbackCount, 60000);
    
    return () => clearInterval(interval);
  }, []);

  return { newFeedbackCount, isLoading, refresh: loadNewFeedbackCount };
}

