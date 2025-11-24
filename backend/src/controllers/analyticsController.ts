import { Response } from 'express';
import Analytics from '../models/Analytics';
import File from '../models/File';
import BlogPost from '../models/BlogPost';
import { AuthRequest } from '../middleware/auth';

// @desc    Get analytics dashboard data
// @route   GET /api/analytics/dashboard
// @access  Private (Admin)
export const getDashboardAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;
    
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.$gte = new Date(startDate as string);
    }
    if (endDate) {
      dateFilter.$lte = new Date(endDate as string);
    }
    
    const query = Object.keys(dateFilter).length > 0 ? { timestamp: dateFilter } : {};
    
    // Get event counts
    const [
      totalDownloads,
      totalUploads,
      totalBlogViews,
      totalFiles,
      totalBlogPosts,
      recentDownloads,
      topFiles,
      topBlogPosts,
    ] = await Promise.all([
      Analytics.countDocuments({ ...query, eventType: 'file_download' }),
      Analytics.countDocuments({ ...query, eventType: 'file_upload' }),
      Analytics.countDocuments({ ...query, eventType: 'blog_view' }),
      File.countDocuments({ isActive: true }),
      BlogPost.countDocuments({ status: 'published' }),
      Analytics.find({ ...query, eventType: 'file_download' })
        .sort({ timestamp: -1 })
        .limit(10)
        .populate('fileId', 'fileName originalName fileType')
        .lean(),
      File.find({ isActive: true })
        .sort({ downloads: -1 })
        .limit(10)
        .select('fileName originalName fileType downloads tier')
        .lean(),
      BlogPost.find({ status: 'published' })
        .sort({ views: -1 })
        .limit(10)
        .select('title views publishedAt')
        .lean(),
    ]);
    
    // Get downloads by tier
    const downloadsByTier = await Analytics.aggregate([
      {
        $match: {
          eventType: 'file_download',
          ...(Object.keys(dateFilter).length > 0 ? { timestamp: dateFilter } : {}),
        },
      },
      {
        $lookup: {
          from: 'files',
          localField: 'fileId',
          foreignField: '_id',
          as: 'file',
        },
      },
      { $unwind: '$file' },
      {
        $group: {
          _id: '$file.tier',
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    
    // Get downloads by file type
    const downloadsByFileType = await Analytics.aggregate([
      {
        $match: {
          eventType: 'file_download',
          ...(Object.keys(dateFilter).length > 0 ? { timestamp: dateFilter } : {}),
        },
      },
      {
        $lookup: {
          from: 'files',
          localField: 'fileId',
          foreignField: '_id',
          as: 'file',
        },
      },
      { $unwind: '$file' },
      {
        $group: {
          _id: '$file.fileType',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);
    
    // Get activity timeline (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const activityTimeline = await Analytics.aggregate([
      {
        $match: {
          timestamp: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            eventType: '$eventType',
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.date': 1 } },
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalDownloads,
          totalUploads,
          totalBlogViews,
          totalFiles,
          totalBlogPosts,
        },
        downloadsByTier,
        downloadsByFileType,
        recentDownloads,
        topFiles,
        topBlogPosts,
        activityTimeline,
      },
    });
  } catch (error: any) {
    console.error('Get dashboard analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics',
      error: error.message,
    });
  }
};

// @desc    Get file analytics
// @route   GET /api/analytics/files
// @access  Private (Admin)
export const getFileAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { fileId, startDate, endDate } = req.query;
    
    const query: any = { eventType: 'file_download' };
    
    if (fileId) {
      query.fileId = fileId;
    }
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate as string);
      if (endDate) query.timestamp.$lte = new Date(endDate as string);
    }
    
    const analytics = await Analytics.find(query)
      .populate('fileId', 'fileName originalName fileType tier')
      .sort({ timestamp: -1 })
      .limit(100)
      .lean();
    
    res.status(200).json({
      success: true,
      data: analytics,
    });
  } catch (error: any) {
    console.error('Get file analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch file analytics',
      error: error.message,
    });
  }
};

// @desc    Get blog analytics
// @route   GET /api/analytics/blog
// @access  Private (Admin)
export const getBlogAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { blogPostId, startDate, endDate } = req.query;
    
    const query: any = { eventType: 'blog_view' };
    
    if (blogPostId) {
      query.blogPostId = blogPostId;
    }
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate as string);
      if (endDate) query.timestamp.$lte = new Date(endDate as string);
    }
    
    const analytics = await Analytics.find(query)
      .populate('blogPostId', 'title slug')
      .sort({ timestamp: -1 })
      .limit(100)
      .lean();
    
    res.status(200).json({
      success: true,
      data: analytics,
    });
  } catch (error: any) {
    console.error('Get blog analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch blog analytics',
      error: error.message,
    });
  }
};


