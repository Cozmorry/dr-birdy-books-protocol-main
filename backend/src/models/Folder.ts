import mongoose, { Document, Schema } from 'mongoose';

export interface IFolder extends Document {
  name: string;
  description?: string;
  parentFolder?: mongoose.Types.ObjectId; // For nested folders
  tier: number; // -1 for admin folders, 0-2 for tier-based folders
  color?: string; // Optional color for UI display
  icon?: string; // Optional icon name
  order: number; // For custom sorting
  createdBy: mongoose.Types.ObjectId;
  createdByName: string;
  isActive: boolean;
  fileCount?: number; // Virtual field for file count
  createdAt: Date;
  updatedAt: Date;
}

const FolderSchema = new Schema<IFolder>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      maxlength: 500,
    },
    parentFolder: {
      type: Schema.Types.ObjectId,
      ref: 'Folder',
      default: null,
    },
    tier: {
      type: Number,
      required: true,
      min: -1,
      max: 2,
      default: -1,
    },
    color: {
      type: String,
      default: '#3B82F6', // Default blue color
    },
    icon: {
      type: String,
    },
    order: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
    },
    createdByName: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
FolderSchema.index({ tier: 1, isActive: 1 });
FolderSchema.index({ parentFolder: 1 });
FolderSchema.index({ order: 1 });

// Virtual for file count (will be populated when needed)
FolderSchema.virtual('fileCount', {
  ref: 'File',
  localField: '_id',
  foreignField: 'folder',
  count: true,
});

// Ensure virtuals are included in JSON output
FolderSchema.set('toJSON', { virtuals: true });
FolderSchema.set('toObject', { virtuals: true });

// Explicitly set collection name
const FolderModel = mongoose.model<IFolder>('Folder', FolderSchema, 'folders');

export default FolderModel;

