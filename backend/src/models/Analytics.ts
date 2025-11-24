import mongoose, { Document, Schema } from 'mongoose';

export interface IAnalytics extends Document {
  eventType: 'file_download' | 'file_upload' | 'blog_view' | 'user_stake' | 'user_unstake';
  userId?: string; // Wallet address
  fileId?: mongoose.Types.ObjectId;
  blogPostId?: mongoose.Types.ObjectId;
  metadata?: {
    tier?: number;
    amount?: string;
    [key: string]: any;
  };
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

const AnalyticsSchema = new Schema<IAnalytics>(
  {
    eventType: {
      type: String,
      enum: ['file_download', 'file_upload', 'blog_view', 'user_stake', 'user_unstake'],
      required: true,
    },
    userId: {
      type: String,
      lowercase: true,
    },
    fileId: {
      type: Schema.Types.ObjectId,
      ref: 'File',
    },
    blogPostId: {
      type: Schema.Types.ObjectId,
      ref: 'BlogPost',
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    timestamps: false,
  }
);

// Index for efficient analytics queries
AnalyticsSchema.index({ eventType: 1, timestamp: -1 });
AnalyticsSchema.index({ userId: 1, timestamp: -1 });
AnalyticsSchema.index({ fileId: 1 });
AnalyticsSchema.index({ blogPostId: 1 });

export default mongoose.model<IAnalytics>('Analytics', AnalyticsSchema);

