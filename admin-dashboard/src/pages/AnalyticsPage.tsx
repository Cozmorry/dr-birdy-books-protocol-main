import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { BarChart3, TrendingUp, Download, Eye } from 'lucide-react';

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const response = await api.getDashboardAnalytics();
      if (response.success) {
        setAnalytics(response.data);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setIsLoading(false);
    }
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-600 mt-1">Detailed insights and statistics</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Downloads</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {analytics?.summary?.totalDownloads || 0}
              </p>
            </div>
            <Download className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Views</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {analytics?.summary?.totalBlogViews || 0}
              </p>
            </div>
            <Eye className="h-8 w-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Files</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {analytics?.summary?.totalFiles || 0}
              </p>
            </div>
            <BarChart3 className="h-8 w-8 text-purple-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Blog Posts</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {analytics?.summary?.totalBlogPosts || 0}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Downloads by Tier */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Downloads by Tier</h2>
        {analytics?.downloadsByTier && analytics.downloadsByTier.length > 0 ? (
          <div className="space-y-3">
            {analytics.downloadsByTier.map((item: any) => (
              <div key={item._id} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">
                  {item._id === -1 ? 'Admin Files' : `Tier ${item._id + 1}`}
                </span>
                <span className="text-sm font-semibold text-gray-900">{item.count} downloads</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No download data available</p>
        )}
      </div>

      {/* Downloads by File Type */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Downloads by File Type</h2>
        {analytics?.downloadsByFileType && analytics.downloadsByFileType.length > 0 ? (
          <div className="space-y-3">
            {analytics.downloadsByFileType.map((item: any) => (
              <div key={item._id} className="flex items-center justify-between">
                <span className="text-sm text-gray-700 uppercase">{item._id}</span>
                <span className="text-sm font-semibold text-gray-900">{item.count} downloads</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No file type data available</p>
        )}
      </div>
    </div>
  );
}















