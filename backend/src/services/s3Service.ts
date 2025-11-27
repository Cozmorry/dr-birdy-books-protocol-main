import AWS from 'aws-sdk';
import { Readable } from 'stream';

// Initialize S3 client
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1',
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || 'dr-birdy-books-files';

/**
 * Upload file to S3
 * @param fileBuffer - File buffer to upload
 * @param key - S3 object key (path/filename)
 * @param contentType - MIME type of the file
 * @param metadata - Additional metadata to store
 * @returns Promise<string> - S3 object key
 */
export const uploadToS3 = async (
  fileBuffer: Buffer,
  key: string,
  contentType: string,
  metadata?: { [key: string]: string }
): Promise<string> => {
  try {
    const params: AWS.S3.PutObjectRequest = {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
      Metadata: metadata || {},
    };

    const result = await s3.upload(params).promise();
    console.log('✅ File uploaded to S3:', result.Key, 'Location:', result.Location);
    return result.Key;
  } catch (error: any) {
    console.error('❌ S3 upload error:', error);
    throw new Error(`Failed to upload file to S3: ${error.message}`);
  }
};

/**
 * Download file from S3
 * @param key - S3 object key
 * @returns Promise<Buffer> - File buffer
 */
export const downloadFromS3 = async (key: string): Promise<Buffer> => {
  try {
    const params: AWS.S3.GetObjectRequest = {
      Bucket: BUCKET_NAME,
      Key: key,
    };

    const result = await s3.getObject(params).promise();
    
    if (!result.Body) {
      throw new Error('File body is empty');
    }

    // Convert to Buffer if it's not already
    if (Buffer.isBuffer(result.Body)) {
      return result.Body;
    } else if (result.Body instanceof Uint8Array) {
      return Buffer.from(result.Body);
    } else {
      // If it's a stream, convert to buffer
      const chunks: Buffer[] = [];
      const stream = result.Body as Readable;
      
      return new Promise((resolve, reject) => {
        stream.on('data', (chunk: Buffer) => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks)));
      });
    }
  } catch (error: any) {
    console.error('❌ S3 download error:', error);
    if (error.code === 'NoSuchKey') {
      throw new Error('File not found in S3');
    }
    throw new Error(`Failed to download file from S3: ${error.message}`);
  }
};

/**
 * Get file metadata from S3
 * @param key - S3 object key
 * @returns Promise<AWS.S3.HeadObjectOutput> - File metadata
 */
export const getFileMetadata = async (key: string): Promise<AWS.S3.HeadObjectOutput> => {
  try {
    const params: AWS.S3.HeadObjectRequest = {
      Bucket: BUCKET_NAME,
      Key: key,
    };

    const result = await s3.headObject(params).promise();
    return result;
  } catch (error: any) {
    console.error('❌ S3 metadata error:', error);
    if (error.code === 'NotFound' || error.code === 'NoSuchKey') {
      throw new Error('File not found in S3');
    }
    throw new Error(`Failed to get file metadata from S3: ${error.message}`);
  }
};

/**
 * Delete file from S3
 * @param key - S3 object key
 * @returns Promise<void>
 */
export const deleteFromS3 = async (key: string): Promise<void> => {
  try {
    const params: AWS.S3.DeleteObjectRequest = {
      Bucket: BUCKET_NAME,
      Key: key,
    };

    await s3.deleteObject(params).promise();
    console.log('✅ File deleted from S3:', key);
  } catch (error: any) {
    console.error('❌ S3 delete error:', error);
    throw new Error(`Failed to delete file from S3: ${error.message}`);
  }
};

/**
 * Check if file exists in S3
 * @param key - S3 object key
 * @returns Promise<boolean>
 */
export const fileExistsInS3 = async (key: string): Promise<boolean> => {
  try {
    const params: AWS.S3.HeadObjectRequest = {
      Bucket: BUCKET_NAME,
      Key: key,
    };

    await s3.headObject(params).promise();
    return true;
  } catch (error: any) {
    if (error.code === 'NotFound' || error.code === 'NoSuchKey') {
      return false;
    }
    // Re-throw other errors
    throw error;
  }
};

/**
 * Generate a pre-signed URL for downloading a file
 * @param key - S3 object key
 * @param expiresIn - Expiration time in seconds (default: 15 minutes)
 * @returns Promise<string> - Pre-signed URL
 */
export const generatePresignedDownloadUrl = async (
  key: string,
  expiresIn: number = 900
): Promise<string> => {
  try {
    const params: AWS.S3.GetObjectRequest = {
      Bucket: BUCKET_NAME,
      Key: key,
    };

    const url = await s3.getSignedUrlPromise('getObject', {
      ...params,
      Expires: expiresIn,
    });

    return url;
  } catch (error: any) {
    console.error('❌ S3 presigned URL error:', error);
    throw new Error(`Failed to generate presigned URL: ${error.message}`);
  }
};

/**
 * Generate a pre-signed URL for uploading a file
 * @param key - S3 object key
 * @param contentType - MIME type of the file
 * @param expiresIn - Expiration time in seconds (default: 15 minutes)
 * @returns Promise<string> - Pre-signed URL
 */
export const generatePresignedUploadUrl = async (
  key: string,
  contentType: string,
  expiresIn: number = 900
): Promise<string> => {
  try {
    const params: AWS.S3.PutObjectRequest = {
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    };

    const url = await s3.getSignedUrlPromise('putObject', {
      ...params,
      Expires: expiresIn,
    });

    return url;
  } catch (error: any) {
    console.error('❌ S3 presigned upload URL error:', error);
    throw new Error(`Failed to generate presigned upload URL: ${error.message}`);
  }
};

