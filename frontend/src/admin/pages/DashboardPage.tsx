import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import {
  BarChart3,
  FileText,
  Upload,
  TrendingUp,
  Users,
  Download,
  Eye,
} from 'lucide-react';

export default function DashboardPage() {
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

  const stats = [
    {
      name: 'Total Files',
      value: analytics?.summary?.totalFiles || 0,
      icon: Upload,
      color: 'bg-blue-500',
    },
    {
      name: 'Total Downloads',
      value: analytics?.summary?.totalDownloads || 0,
      icon: Download,
      color: 'bg-green-500',
    },
    {
      name: 'Blog Posts',
      value: analytics?.summary?.totalBlogPosts || 0,
      icon: FileText,
      color: 'bg-purple-500',
    },
    {
      name: 'Blog Views',
      value: analytics?.summary?.totalBlogViews || 0,
      icon: Eye,
      color: 'bg-orange-500',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="text-gray-600 mt-1">Welcome to your admin dashboard</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
              </div>
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Files */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Top Downloaded Files
          </h2>
          {analytics?.topFiles && analytics.topFiles.length > 0 ? (
            <div className="space-y-3 max-h-[280px] overflow-y-auto">
              {analytics.topFiles.slice(0, 5).map((file: any) => (
                <div key={file._id} className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.originalName}
                    </p>
                    <p className="text-xs text-gray-500">
                      Tier {file.tier >= 0 ? file.tier + 1 : 'Admin'} • {file.fileType}
                    </p>
                  </div>
                  <div className="ml-4 flex items-center">
                    <Download className="h-4 w-4 text-gray-400 mr-1" />
                    <span className="text-sm font-medium text-gray-900">
                      {file.downloads}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No files yet</p>
          )}
        </div>

        {/* Top Blog Posts */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Top Blog Posts
          </h2>
          {analytics?.topBlogPosts && analytics.topBlogPosts.length > 0 ? (
            <div className="space-y-3 max-h-[280px] overflow-y-auto">
              {analytics.topBlogPosts.slice(0, 5).map((post: any) => (
                <div key={post._id} className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {post.title}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(post.publishedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="ml-4 flex items-center">
                    <Eye className="h-4 w-4 text-gray-400 mr-1" />
                    <span className="text-sm font-medium text-gray-900">
                      {post.views}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No blog posts yet</p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/admin/files"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Upload className="h-8 w-8 text-primary-600 mr-3" />
            <div>
              <p className="font-medium text-gray-900">Upload File</p>
              <p className="text-sm text-gray-500">Add new content</p>
            </div>
          </Link>
          
          <Link
            to="/admin/blog"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FileText className="h-8 w-8 text-primary-600 mr-3" />
            <div>
              <p className="font-medium text-gray-900">Create Post</p>
              <p className="text-sm text-gray-500">Write a blog post</p>
            </div>
          </Link>
          
          <Link
            to="/admin/analytics"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <BarChart3 className="h-8 w-8 text-primary-600 mr-3" />
            <div>
              <p className="font-medium text-gray-900">View Analytics</p>
              <p className="text-sm text-gray-500">Detailed reports</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}


