import React, { useState } from 'react';
import { X, Send, Star, MessageSquare, AlertCircle } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { useWeb3 } from '../hooks/useWeb3';
import { trackFeedback } from '../utils/analytics';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type FeedbackType = 'general' | 'bug' | 'feature' | 'suggestion';

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const { addToast } = useToast();
  const { account } = useWeb3();
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('general');
  const [rating, setRating] = useState<number>(0);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const feedbackTypes = [
    { id: 'general' as FeedbackType, label: 'General Feedback', icon: MessageSquare },
    { id: 'bug' as FeedbackType, label: 'Report a Bug', icon: AlertCircle },
    { id: 'feature' as FeedbackType, label: 'Feature Request', icon: Star },
    { id: 'suggestion' as FeedbackType, label: 'Suggestion', icon: MessageSquare },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim()) {
      addToast({
        type: 'error',
        title: 'Message Required',
        message: 'Please provide your feedback message',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
      
      const response = await fetch(`${API_BASE_URL}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: feedbackType,
          rating: rating > 0 ? rating : undefined,
          message: message.trim(),
          email: email.trim() || undefined,
          userAgent: navigator.userAgent,
          walletAddress: account?.toLowerCase() || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit feedback');
      }

      // Track feedback submission in Google Analytics
      trackFeedback(feedbackType);

      addToast({
        type: 'success',
        title: 'Thank You!',
        message: 'Your feedback has been submitted successfully. We appreciate your input!',
      });

      // Reset form
      setMessage('');
      setEmail('');
      setRating(0);
      setFeedbackType('general');
      onClose();
    } catch (error: any) {
      console.error('Feedback submission error:', error);
      
      // Check if it's a connection error
      const isConnectionError = error.message?.includes('Failed to fetch') || 
                               error.message?.includes('ERR_CONNECTION_REFUSED') ||
                               error.name === 'TypeError';
      
      if (isConnectionError) {
        addToast({
          type: 'error',
          title: 'Backend Server Not Available',
          message: 'The backend server is not running. Please start the backend server on port 5001 to submit feedback.',
          duration: 8000,
        });
      } else {
        addToast({
          type: 'error',
          title: 'Submission Failed',
          message: error.message || 'Failed to submit feedback. Please try again later.',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="bg-white rounded-lg shadow-2xl p-6 relative">
          {/* Close Button */}
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Share Your Feedback</h2>
            <p className="text-gray-600">
              We'd love to hear your thoughts, suggestions, or report any issues you've encountered.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Feedback Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                What type of feedback is this?
              </label>
              <div className="grid grid-cols-2 gap-3">
                {feedbackTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setFeedbackType(type.id)}
                      className={`flex items-center justify-center p-4 border-2 rounded-lg transition-all ${
                        feedbackType === type.id
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <Icon className="h-5 w-5 mr-2" />
                      <span className="text-sm font-medium">{type.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Rating (Optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                How would you rate your experience? (Optional)
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`p-2 rounded transition-colors ${
                      star <= rating
                        ? 'text-yellow-400 hover:text-yellow-500'
                        : 'text-gray-300 hover:text-gray-400'
                    }`}
                  >
                    <Star
                      className={`h-6 w-6 ${
                        star <= rating ? 'fill-current' : ''
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Message */}
            <div>
              <label htmlFor="feedback-message" className="block text-sm font-medium text-gray-700 mb-2">
                Your Feedback <span className="text-red-500">*</span>
              </label>
              <textarea
                id="feedback-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Tell us what you think, what you'd like to see, or any issues you've encountered..."
              />
              <p className="mt-1 text-xs text-gray-500">
                {message.length} / 1000 characters
              </p>
            </div>

            {/* Email (Optional) */}
            <div>
              <label htmlFor="feedback-email" className="block text-sm font-medium text-gray-700 mb-2">
                Email (Optional)
              </label>
              <input
                id="feedback-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="your@email.com (if you'd like a response)"
              />
              <p className="mt-1 text-xs text-gray-500">
                We'll only use this to respond to your feedback if needed
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !message.trim()}
                className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Submit Feedback
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

