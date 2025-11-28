import { Request, Response } from 'express';
import Feedback from '../models/Feedback';

interface FeedbackRequest extends Request {
  body: {
    type: 'general' | 'bug' | 'feature' | 'suggestion';
    rating?: number;
    message: string;
    email?: string;
    userAgent?: string;
    walletAddress?: string;
  };
}

// @desc    Submit feedback
// @route   POST /api/feedback
// @access  Public
export const submitFeedback = async (req: FeedbackRequest, res: Response): Promise<void> => {
  try {
    const { type, rating, message, email, userAgent, walletAddress } = req.body;

    // Validation
    if (!message || message.trim().length === 0) {
      res.status(400).json({
        success: false,
        message: 'Feedback message is required',
      });
      return;
    }

    if (message.length > 1000) {
      res.status(400).json({
        success: false,
        message: 'Feedback message must be 1000 characters or less',
      });
      return;
    }

    if (rating && (rating < 1 || rating > 5)) {
      res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5',
      });
      return;
    }

    // Create feedback
    const feedback = await Feedback.create({
      type: type || 'general',
      rating,
      message: message.trim(),
      email: email?.trim() || undefined,
      userAgent: userAgent || req.headers['user-agent'],
      walletAddress: walletAddress?.toLowerCase() || undefined,
      status: 'new',
    });

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      data: {
        id: feedback._id,
        type: feedback.type,
        createdAt: feedback.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Submit feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit feedback',
      error: error.message,
    });
  }
};

// @desc    Get all feedback (Admin only)
// @route   GET /api/feedback
// @access  Private (Admin)
export const getFeedback = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, type, page = 1, limit = 20 } = req.query;

    const query: any = {};
    if (status) query.status = status;
    if (type) query.type = type;

    const skip = (Number(page) - 1) * Number(limit);

    const [feedback, total] = await Promise.all([
      Feedback.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .select('-__v')
        .lean(),
      Feedback.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        feedback,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error: any) {
    console.error('Get feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch feedback',
      error: error.message,
    });
  }
};

// @desc    Update feedback status (Admin only)
// @route   PATCH /api/feedback/:id
// @access  Private (Admin)
export const updateFeedbackStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    if (status && !['new', 'reviewed', 'resolved', 'archived'].includes(status)) {
      res.status(400).json({
        success: false,
        message: 'Invalid status',
      });
      return;
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (adminNotes !== undefined) updateData.adminNotes = adminNotes;

    const feedback = await Feedback.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select('-__v');

    if (!feedback) {
      res.status(404).json({
        success: false,
        message: 'Feedback not found',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Feedback updated successfully',
      data: feedback,
    });
  } catch (error: any) {
    console.error('Update feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update feedback',
      error: error.message,
    });
  }
};

// @desc    Get feedback statistics (Admin only)
// @route   GET /api/feedback/stats
// @access  Private (Admin)
export const getFeedbackStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const [total, byType, byStatus, averageRating] = await Promise.all([
      Feedback.countDocuments(),
      Feedback.aggregate([
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
          },
        },
      ]),
      Feedback.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
      Feedback.aggregate([
        {
          $match: { rating: { $exists: true, $ne: null } },
        },
        {
          $group: {
            _id: null,
            average: { $avg: '$rating' },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        total,
        byType: byType.reduce((acc: any, item: any) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        byStatus: byStatus.reduce((acc: any, item: any) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        averageRating: averageRating[0]?.average || 0,
        ratedCount: averageRating[0]?.count || 0,
      },
    });
  } catch (error: any) {
    console.error('Get feedback stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch feedback statistics',
      error: error.message,
    });
  }
};

