import mongoose, { Schema, Document } from 'mongoose';

export interface IFeedback extends Document {
  type: 'general' | 'bug' | 'feature' | 'suggestion';
  rating?: number;
  message: string;
  email?: string;
  userAgent?: string;
  walletAddress?: string;
  status: 'new' | 'reviewed' | 'resolved' | 'archived';
  adminNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const FeedbackSchema: Schema = new Schema(
  {
    type: {
      type: String,
      enum: ['general', 'bug', 'feature', 'suggestion'],
      required: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    message: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    userAgent: {
      type: String,
    },
    walletAddress: {
      type: String,
      lowercase: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['new', 'reviewed', 'resolved', 'archived'],
      default: 'new',
    },
    adminNotes: {
      type: String,
    },
  },
  {
    timestamps: true,
    collection: 'feedback',
  }
);

// Indexes for better query performance
FeedbackSchema.index({ status: 1, createdAt: -1 });
FeedbackSchema.index({ type: 1 });
FeedbackSchema.index({ walletAddress: 1 });

const Feedback = mongoose.model<IFeedback>('Feedback', FeedbackSchema);

export default Feedback;

