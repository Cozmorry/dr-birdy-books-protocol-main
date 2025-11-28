import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useFeedbackBadge } from '../hooks/useFeedbackBadge';
import { MessageSquare, Bug, Star, Lightbulb, CheckCircle, XCircle, Clock, Archive, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';

interface Feedback {
  _id: string;
  type: 'general' | 'bug' | 'feature' | 'suggestion';
  rating?: number;
  message: string;
  email?: string;
  walletAddress?: string;
  status: 'new' | 'reviewed' | 'resolved' | 'archived';
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export default function FeedbackPage() {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'new' | 'reviewed' | 'resolved' | 'archived'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'general' | 'bug' | 'feature' | 'suggestion'>('all');
  const [stats, setStats] = useState<any>(null);
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set());
  const { refresh: refreshBadge } = useFeedbackBadge();

  useEffect(() => {
    loadFeedback();
    loadStats();
  }, [filter, typeFilter]);

  const loadFeedback = async () => {
    setIsLoading(true);
    try {
      const response = await api.getFeedback(filter !== 'all' ? { status: filter } : {});
      if (response.success) {
        let feedbackData = response.data.feedback || [];
        
        // Filter by type if needed
        if (typeFilter !== 'all') {
          feedbackData = feedbackData.filter((f: Feedback) => f.type === typeFilter);
        }
        
        setFeedback(feedbackData);
      }
    } catch (error: any) {
      // Don't log rate limit errors as errors - they're expected during heavy usage
      if (error.response?.status !== 429) {
        console.error('Failed to load feedback:', error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await api.getFeedbackStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (error: any) {
      // Don't log rate limit errors as errors - they're expected during heavy usage
      if (error.response?.status !== 429) {
        console.error('Failed to load feedback stats:', error);
      }
    }
  };

  const updateStatus = async (id: string, status: string, notes?: string) => {
    try {
      const response = await api.updateFeedbackStatus(id, status, notes);
      if (response.success) {
        await loadFeedback();
        await loadStats();
        refreshBadge(); // Refresh badge count
      }
    } catch (error: any) {
      if (error.response?.status === 429) {
        alert('Rate limit exceeded. Please wait a moment and try again.');
      } else {
        console.error('Failed to update feedback status:', error);
        alert('Failed to update feedback status');
      }
    }
  };

  const toggleMessageExpansion = (id: string) => {
    const newExpanded = new Set(expandedMessages);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedMessages(newExpanded);
  };

  const copyToClipboard = async (text: string, itemId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      const newCopied = new Set(copiedItems);
      newCopied.add(itemId);
      setCopiedItems(newCopied);
      setTimeout(() => {
        const updated = new Set(copiedItems);
        updated.delete(itemId);
        setCopiedItems(updated);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'bug':
        return <Bug className="h-4 w-4" />;
      case 'feature':
        return <Star className="h-4 w-4" />;
      case 'suggestion':
        return <Lightbulb className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'reviewed':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'archived':
        return <Archive className="h-4 w-4 text-gray-600" />;
      default:
        return <XCircle className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-yellow-100 text-yellow-800';
      case 'reviewed':
        return 'bg-blue-100 text-blue-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const shouldTruncate = (text: string, maxLength: number = 200) => {
    return text.length > maxLength;
  };

  const truncateText = (text: string, maxLength: number = 200) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">User Feedback</h1>
        <p className="text-gray-600 mt-1">View and manage user feedback submissions</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600">Total Feedback</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600">New</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.byStatus?.new || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600">Resolved</p>
            <p className="text-2xl font-bold text-green-600">{stats.byStatus?.resolved || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600">Avg Rating</p>
            <p className="text-2xl font-bold text-blue-600">
              {stats.averageRating ? stats.averageRating.toFixed(1) : 'N/A'}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Status</option>
              <option value="new">New</option>
              <option value="reviewed">Reviewed</option>
              <option value="resolved">Resolved</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Types</option>
              <option value="general">General</option>
              <option value="bug">Bug</option>
              <option value="feature">Feature</option>
              <option value="suggestion">Suggestion</option>
            </select>
          </div>
        </div>
      </div>

      {/* Feedback List */}
      <div className="bg-white rounded-lg shadow-md">
        {feedback.length === 0 ? (
          <div className="p-12 text-center">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No feedback found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {feedback.map((item) => {
              const isExpanded = expandedMessages.has(item._id);
              const messageNeedsTruncation = shouldTruncate(item.message);
              const displayMessage = isExpanded || !messageNeedsTruncation 
                ? item.message 
                : truncateText(item.message);
              
              return (
                <div key={item._id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className={`p-2 rounded-lg ${
                        item.type === 'bug' ? 'bg-red-100 text-red-600' :
                        item.type === 'feature' ? 'bg-blue-100 text-blue-600' :
                        item.type === 'suggestion' ? 'bg-yellow-100 text-yellow-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {getTypeIcon(item.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-medium text-gray-900 capitalize">{item.type}</span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(item.status)}`}>
                            {item.status}
                          </span>
                          {item.rating && (
                            <div className="flex items-center text-yellow-500">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-3 w-3 ${i < item.rating! ? 'fill-current' : ''}`}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                        
                        {/* Message with expand/collapse */}
                        <div className="mb-2">
                          <p className="text-gray-700 whitespace-pre-wrap break-words">
                            {displayMessage}
                          </p>
                          {messageNeedsTruncation && (
                            <button
                              onClick={() => toggleMessageExpansion(item._id)}
                              className="mt-1 text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="h-4 w-4" />
                                  Show Less
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-4 w-4" />
                                  Show More
                                </>
                              )}
                            </button>
                          )}
                        </div>
                        
                        {/* Email and Wallet with Copy */}
                        <div className="flex flex-wrap gap-4 text-xs text-gray-500 mb-2">
                          {item.email && (
                            <div className="flex items-center gap-2">
                              <span>Email:</span>
                              <span className="font-mono text-gray-700">{item.email}</span>
                              <button
                                onClick={() => copyToClipboard(item.email!, `email-${item._id}`)}
                                className="p-1 hover:bg-gray-200 rounded transition-colors"
                                title="Copy email"
                              >
                                {copiedItems.has(`email-${item._id}`) ? (
                                  <Check className="h-3 w-3 text-green-600" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                            </div>
                          )}
                          {item.walletAddress && (
                            <div className="flex items-center gap-2">
                              <span>Wallet:</span>
                              <span className="font-mono text-gray-700">
                                {item.walletAddress}
                              </span>
                              <button
                                onClick={() => copyToClipboard(item.walletAddress!, `wallet-${item._id}`)}
                                className="p-1 hover:bg-gray-200 rounded transition-colors"
                                title="Copy wallet address"
                              >
                                {copiedItems.has(`wallet-${item._id}`) ? (
                                  <Check className="h-3 w-3 text-green-600" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                            </div>
                          )}
                          <span>{new Date(item.createdAt).toLocaleString()}</span>
                        </div>
                        
                        {item.adminNotes && (
                          <div className="mt-2 p-2 bg-blue-50 rounded text-sm text-blue-800">
                            <strong>Admin Notes:</strong> {item.adminNotes}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-2 mt-4">
                    {item.status !== 'reviewed' && (
                      <button
                        onClick={() => updateStatus(item._id, 'reviewed')}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Mark Reviewed
                      </button>
                    )}
                    {item.status !== 'resolved' && (
                      <button
                        onClick={() => updateStatus(item._id, 'resolved')}
                        className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        Mark Resolved
                      </button>
                    )}
                    {item.status !== 'archived' && (
                      <button
                        onClick={() => updateStatus(item._id, 'archived')}
                        className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                      >
                        Archive
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
