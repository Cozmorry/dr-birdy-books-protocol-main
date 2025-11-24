import mongoose, { Document, Schema } from 'mongoose';

export interface IFile extends Document {
  fileName: string;
  originalName: string;
  fileType: string;
  mimeType: string;
  fileSize: number;
  description: string;
  tier: number; // -1 for admin files, 0-2 for tier-based files
  storageType: 'local' | 's3' | 'ipfs' | 'arweave' | 'mongodb';
  storagePath: string; // Local path, S3 key, IPFS hash, Arweave txId, or GridFS file ID
  arweaveTxId?: string;
  uploadedBy: mongoose.Types.ObjectId;
  uploadedByName: string;
  downloads: number;
  isActive: boolean;
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

const FileSchema = new Schema<IFile>(
  {
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      required: true,
      lowercase: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    tier: {
      type: Number,
      required: true,
      min: -1,
      max: 2,
      default: -1,
    },
    storageType: {
      type: String,
      enum: ['local', 's3', 'ipfs', 'arweave', 'mongodb'],
      required: true,
    },
    storagePath: {
      type: String,
      required: true,
    },
    arweaveTxId: {
      type: String,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
    },
    uploadedByName: {
      type: String,
      required: true,
    },
    downloads: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
FileSchema.index({ tier: 1, isActive: 1 });
FileSchema.index({ fileType: 1 });
FileSchema.index({ uploadedBy: 1 });

// Explicitly set collection name
const FileModel = mongoose.model<IFile>('File', FileSchema, 'files');

export default FileModel;

