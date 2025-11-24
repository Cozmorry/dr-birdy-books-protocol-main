import mongoose from 'mongoose';
import { GridFSBucket, ObjectId } from 'mongodb';
import { Readable } from 'stream';

let gridFSBucket: GridFSBucket | null = null;

// Initialize GridFS bucket
export const initGridFS = () => {
  const db = mongoose.connection.db;
  if (db) {
    gridFSBucket = new GridFSBucket(db, { bucketName: 'files' });
  }
};

// Get GridFS bucket instance
export const getGridFSBucket = (): GridFSBucket => {
  if (!gridFSBucket) {
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database not connected');
    }
    gridFSBucket = new GridFSBucket(db, { bucketName: 'files' });
  }
  return gridFSBucket;
};

// Upload file to GridFS
export const uploadToGridFS = (
  fileBuffer: Buffer,
  filename: string,
  metadata?: any
): Promise<ObjectId> => {
  return new Promise((resolve, reject) => {
    const bucket = getGridFSBucket();
    const uploadStream = bucket.openUploadStream(filename, {
      metadata: metadata || {},
    });

    const readable = new Readable();
    readable.push(fileBuffer);
    readable.push(null);

    readable
      .pipe(uploadStream)
      .on('error', (error) => {
        reject(error);
      })
      .on('finish', () => {
        resolve(uploadStream.id);
      });
  });
};

// Download file from GridFS
export const downloadFromGridFS = (fileId: string): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const bucket = getGridFSBucket();
    const objectId = new mongoose.Types.ObjectId(fileId);
    
    const chunks: Buffer[] = [];
    const downloadStream = bucket.openDownloadStream(objectId);

    downloadStream.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    downloadStream.on('error', (error) => {
      reject(error);
    });

    downloadStream.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
  });
};

// Get file metadata from GridFS
export const getFileMetadata = async (fileId: string): Promise<any> => {
  const bucket = getGridFSBucket();
  const objectId = new mongoose.Types.ObjectId(fileId);
  
  const files = await bucket.find({ _id: objectId }).toArray();
  if (files.length === 0) {
    throw new Error('File not found in GridFS');
  }
  
  return files[0];
};

// Delete file from GridFS
export const deleteFromGridFS = (fileId: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const bucket = getGridFSBucket();
    const objectId = new mongoose.Types.ObjectId(fileId);
    
    bucket.delete(objectId, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
};

// Check if file exists in GridFS
export const fileExistsInGridFS = async (fileId: string): Promise<boolean> => {
  try {
    const bucket = getGridFSBucket();
    const objectId = new mongoose.Types.ObjectId(fileId);
    const files = await bucket.find({ _id: objectId }).toArray();
    return files.length > 0;
  } catch (error) {
    return false;
  }
};

