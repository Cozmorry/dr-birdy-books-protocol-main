/**
 * Script to verify migration from GridFS to S3
 * 
 * Usage: node scripts/verify-migration.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const AWS = require('aws-sdk');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dr-birdy-books';

// Initialize S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1',
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || process.env.AWS_S3_BUCKET || 'dr-birdy-books-files';

async function verifyMigration() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const File = mongoose.connection.collection('files');
    const chunksCollection = db.collection('files.chunks');
    const filesCollection = db.collection('files.files');

    // Get all file records
    const files = await File.find({}).toArray();
    console.log(`📊 Total file records: ${files.length}\n`);

    // Count by storage type
    const storageStats = {};
    let totalGridFSSize = 0;
    let totalS3Size = 0;

    for (const file of files) {
      const storageType = file.storageType || 'mongodb';
      storageStats[storageType] = (storageStats[storageType] || 0) + 1;

      if (storageType === 'mongodb') {
        totalGridFSSize += file.fileSize || 0;
      } else if (storageType === 's3') {
        totalS3Size += file.fileSize || 0;
      }
    }

    console.log('📦 Storage Type Distribution:');
    Object.entries(storageStats).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} files`);
    });

    console.log('\n💾 Storage Size Breakdown:');
    console.log(`   GridFS: ${(totalGridFSSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   S3: ${(totalS3Size / 1024 / 1024).toFixed(2)} MB`);

    // Check GridFS collections
    const chunkCount = await chunksCollection.countDocuments();
    const gridFSFileCount = await filesCollection.countDocuments();

    // Get collection stats for actual storage size
    let actualGridFSSize = 0;
    try {
      const chunksStats = await chunksCollection.stats();
      actualGridFSSize = chunksStats.size || 0;
    } catch (error) {
      console.log('   ⚠️  Could not get GridFS size stats');
    }

    console.log('\n🗄️  GridFS Collections:');
    console.log(`   files.chunks: ${chunkCount} chunks`);
    console.log(`   files.files: ${gridFSFileCount} file metadata records`);
    if (actualGridFSSize > 0) {
      console.log(`   Actual GridFS storage: ${(actualGridFSSize / 1024 / 1024).toFixed(2)} MB`);
    }

    // Check MongoDB database size
    const dbStats = await db.stats();
    const dbSizeMB = (dbStats.dataSize || 0) / 1024 / 1024;
    console.log(`\n💾 MongoDB Database Size: ${dbSizeMB.toFixed(2)} MB`);

    // Verify S3 files
    if (storageStats['s3'] > 0) {
      console.log(`\n☁️  Verifying S3 files...`);
      const s3Files = files.filter(f => f.storageType === 's3');
      let verifiedCount = 0;
      let missingCount = 0;

      for (const file of s3Files.slice(0, 10)) {
        try {
          await s3.headObject({ Bucket: BUCKET_NAME, Key: file.storagePath }).promise();
          verifiedCount++;
        } catch (error) {
          if (error.code === 'NotFound') {
            missingCount++;
            console.log(`   ❌ Missing in S3: ${file.originalName || file.fileName} (${file.storagePath})`);
          }
        }
      }

      if (s3Files.length > 10) {
        console.log(`   ... checking ${s3Files.length - 10} more files`);
      }

      console.log(`\n   ✅ Verified: ${verifiedCount} files exist in S3`);
      if (missingCount > 0) {
        console.log(`   ❌ Missing: ${missingCount} files not found in S3`);
      }
    }

    // List files still using GridFS
    const gridFSFiles = files.filter(f => f.storageType === 'mongodb');
    if (gridFSFiles.length > 0) {
      console.log(`\n⚠️  Files still using GridFS (${gridFSFiles.length}):`);
      gridFSFiles.slice(0, 10).forEach(file => {
        console.log(`   - ${file.originalName || file.fileName} (${((file.fileSize || 0) / 1024 / 1024).toFixed(2)} MB)`);
      });
      if (gridFSFiles.length > 10) {
        console.log(`   ... and ${gridFSFiles.length - 10} more`);
      }
    } else {
      console.log(`\n✅ All files have been migrated to S3!`);
    }

    // Check current STORAGE_TYPE setting
    console.log(`\n⚙️  Current STORAGE_TYPE: ${process.env.STORAGE_TYPE || 'mongodb (default)'}`);

    if (process.env.STORAGE_TYPE === 's3' && chunkCount > 0 && gridFSFiles.length === 0) {
      console.log(`\n💡 Tip: All files are in S3. You can clean up GridFS chunks to free space.`);
      console.log(`   Run: node scripts/cleanup-gridfs-after-migration.js --dry-run`);
    }

    if (dbSizeMB > 512) {
      console.log(`\n⚠️  WARNING: MongoDB database is still over 512 MB limit!`);
      console.log(`   Current size: ${dbSizeMB.toFixed(2)} MB`);
      if (chunkCount > 0) {
        console.log(`   Consider cleaning up GridFS chunks to free space.`);
      }
    } else {
      console.log(`\n✅ MongoDB database is under 512 MB limit!`);
    }

    await mongoose.connection.close();
    console.log('\n✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

verifyMigration();
