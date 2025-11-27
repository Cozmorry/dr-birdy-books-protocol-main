import mongoose, { Document, Schema } from 'mongoose';

export interface IDownloadLimit extends Document {
  walletAddress: string; // User's wallet address
  dailyDownloads: number; // Count of downloads today
  monthlyBytesDownloaded: number; // Total bytes downloaded this month
  lastDownloadDate: Date; // Last download date (for daily reset)
  lastResetMonth: number; // Last month when quota was reset (1-12)
  lastResetYear: number; // Last year when quota was reset
  quotaWarningSent: boolean; // Whether 80% quota warning has been sent
  createdAt: Date;
  updatedAt: Date;
}

const DownloadLimitSchema = new Schema<IDownloadLimit>(
  {
    walletAddress: {
      type: String,
      required: true,
      lowercase: true,
      unique: true,
      index: true,
    },
    dailyDownloads: {
      type: Number,
      default: 0,
      min: 0,
    },
    monthlyBytesDownloaded: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastDownloadDate: {
      type: Date,
      default: Date.now,
    },
    lastResetMonth: {
      type: Number,
      default: () => new Date().getMonth() + 1, // 1-12
    },
    lastResetYear: {
      type: Number,
      default: () => new Date().getFullYear(),
    },
    quotaWarningSent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
DownloadLimitSchema.index({ walletAddress: 1 });
DownloadLimitSchema.index({ lastDownloadDate: 1 });

export default mongoose.model<IDownloadLimit>('DownloadLimit', DownloadLimitSchema);


