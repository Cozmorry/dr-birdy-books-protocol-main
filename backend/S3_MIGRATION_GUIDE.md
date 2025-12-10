# S3 Storage Migration Guide

Complete guide to switch from MongoDB GridFS to AWS S3 storage for the Dr. Birdy Books Protocol.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [AWS Setup](#aws-setup)
4. [Backend Configuration](#backend-configuration)
5. [Migration Steps](#migration-steps)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)
8. [Rollback Plan](#rollback-plan)

## Overview

This guide will help you migrate from MongoDB GridFS storage to AWS S3 storage. The system supports both storage types and can switch between them via environment variables.

### Benefits of S3 Storage

- ✅ **Scalability**: Handle unlimited file storage
- ✅ **Performance**: Fast CDN-backed downloads
- ✅ **Cost-Effective**: Pay only for what you use
- ✅ **Reliability**: 99.999999999% (11 9's) durability
- ✅ **Backup**: Automatic versioning and lifecycle policies
- ✅ **Security**: Fine-grained access control

### Current vs. S3 Storage

| Feature | MongoDB GridFS | AWS S3 |
|---------|---------------|--------|
| Storage Limit | Database size limit | Unlimited |
| Performance | Good | Excellent (CDN) |
| Cost | Included in DB | Pay per GB |
| Backup | Manual | Automatic |
| Scalability | Limited | Unlimited |

## Prerequisites

Before starting, ensure you have:

1. ✅ AWS Account with billing enabled
2. ✅ AWS CLI installed (optional, for testing)
3. ✅ Backend code updated (already done)
4. ✅ Access to your backend `.env` file

## AWS Setup

### Step 1: Create S3 Bucket

1. Log in to [AWS Console](https://console.aws.amazon.com/)
2. Navigate to **S3** service
3. Click **"Create bucket"**
4. Configure bucket:
   - **Bucket name**: `dr-birdy-books-files` (or your preferred name)
   - **Region**: Choose closest to your users (e.g., `us-east-1`, `eu-west-1`)
   - **Block Public Access**: ✅ Keep all settings enabled (we'll use pre-signed URLs)
   - **Bucket Versioning**: ✅ Enable (recommended for backup)
   - **Encryption**: ✅ Enable (SSE-S3 or SSE-KMS)
   - **Object Lock**: Optional (for compliance)
5. Click **"Create bucket"**

### Step 2: Create IAM User

1. Navigate to **IAM** service
2. Click **"Users"** → **"Add users"**
3. **Step 1: Specify user details**
   - **Username**: `dr-birdy-books-s3-user`
   - **Access type**: ✅ **Programmatic access** (for API keys)
   - Click **"Next"**
4. **Step 2: Set permissions** (⚠️ Important: Choose "Attach policies directly" NOT "Add user to groups")
   - Select **"Attach policies directly"** (not "Add user to groups")
   - You have two options:
     
     **Option A: Use Existing Policy (Quick Setup)**
     - In the search box, type: `AmazonS3FullAccess`
     - Check the box next to **`AmazonS3FullAccess`**
     - Click **"Next"** → Skip to Step 5 below
     
     **Option B: Create Custom Policy (Recommended - More Secure)**
     - ⚠️ **Don't select anything yet!** First, create the custom policy:
     - Click **"Cancel"** or navigate away (you'll come back)
     - Follow **Step 3** below to create the custom policy
     - Then return here and search for your custom policy name
     - Check the box next to your custom policy
     - Click **"Next"**
     
5. **Step 3: Review and add user**
   - Review the user details and permissions
   - Click **"Create user"**
6. ⚠️ **IMPORTANT**: Save the **Access Key ID** and **Secret Access Key** immediately!
   - You can download them as a CSV file
   - ⚠️ **You cannot view the secret key again after this step!**

### Step 3: Create Custom IAM Policy (If Using Option B)

**Only do this if you chose Option B (Custom Policy) in Step 2:**

1. In IAM console, click **"Policies"** in the left sidebar (not "Users")
2. Click **"Create policy"** button (top right)
3. Click the **"JSON"** tab
4. Delete any existing content and paste the following policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::dr-birdy-books-files",
        "arn:aws:s3:::dr-birdy-books-files/*"
      ]
    }
  ]
}
```

**Note**: `s3:HeadObject` is not a valid IAM action. The HeadObject API is authorized by `s3:GetObject`, so we don't need to include it separately.

5. Replace `dr-birdy-books-files` with your actual bucket name (in both places)
6. Click **"Next"** button
7. **Policy name**: Enter `DrBirdyBooksS3Access` (or any name you prefer)
8. **Description**: "Custom policy for S3 file storage access"
9. Click **"Create policy"**
10. ✅ Policy created! Now go back to **Step 2** above and search for your policy name to attach it

**Note**: If you're already in the user creation wizard, you can:
- Open IAM in a new tab to create the policy
- Then return to the user creation tab and refresh the policy list
- Your new custom policy will appear in the search results

### Step 4: Configure CORS (Optional)

If you need direct browser access to S3 files, configure CORS:

1. Go to your S3 bucket → **Permissions** → **CORS**
2. Add this configuration:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedOrigins": ["https://yourdomain.com"],
    "ExposeHeaders": ["Content-Length", "Content-Type"],
    "MaxAgeSeconds": 3000
  }
]
```

Replace `https://yourdomain.com` with your frontend domain.

## Backend Configuration

### Step 1: Update Environment Variables

Edit your `backend/.env` file:

```env
# Storage Configuration
STORAGE_TYPE=s3

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your-access-key-id-here
AWS_SECRET_ACCESS_KEY=your-secret-access-key-here
AWS_REGION=us-east-2
AWS_S3_BUCKET_NAME=dr-birdy-books-files
```

**Important Notes:**
- `STORAGE_TYPE=s3` enables S3 storage
- `STORAGE_TYPE=mongodb` uses GridFS (default)
- `AWS_S3_BUCKET_NAME` must match your bucket name exactly (case-sensitive)
- `AWS_REGION` must match your **S3 bucket's region**, not the IAM user's region
  - ✅ **IAM is global** - IAM users can access resources in any region
  - ✅ **S3 buckets are region-specific** - `AWS_REGION` tells the SDK which region your bucket is in
  - Example: If your bucket is in `us-east-2`, set `AWS_REGION=us-east-2`
- Never commit `.env` files to version control!

### Step 2: Verify AWS SDK Installation

The `aws-sdk` package should already be installed. Verify:

```bash
cd backend
npm list aws-sdk
```

If not installed:

```bash
npm install aws-sdk
```

### Step 3: Test S3 Connection

Create a test script to verify S3 access:

```bash
# Create test file
cat > backend/test-s3-connection.js << 'EOF'
require('dotenv').config();
const AWS = require('aws-sdk');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const bucketName = process.env.AWS_S3_BUCKET_NAME || process.env.AWS_S3_BUCKET;

s3.headBucket({ Bucket: bucketName }, (err, data) => {
  if (err) {
    console.error('❌ S3 Connection Failed:', err.message);
    process.exit(1);
  } else {
    console.log('✅ S3 Connection Successful!');
    console.log('Bucket:', bucketName);
    console.log('Region:', process.env.AWS_REGION);
  }
});
EOF

# Run test
node backend/test-s3-connection.js
```

## Migration Steps

### Option A: Fresh Start (New Deployments)

If you're starting fresh or don't need to migrate existing files:

1. ✅ Set `STORAGE_TYPE=s3` in `.env`
2. ✅ Configure AWS credentials
3. ✅ Restart backend server
4. ✅ New uploads will go to S3 automatically

### Option B: Migrate Existing Files

If you have existing files in MongoDB GridFS that need to be migrated:

#### Step 1: Create Migration Script

```bash
# Create migration script
cat > backend/scripts/migrate-to-s3.ts << 'EOF'
import mongoose from 'mongoose';
import File from '../src/models/File';
import { downloadFromGridFS } from '../src/services/gridfsService';
import { uploadToS3 } from '../src/services/s3Service';
import dotenv from 'dotenv';

dotenv.config();

async function migrateFiles() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Connected to MongoDB');

    // Find all files stored in MongoDB
    const files = await File.find({ storageType: 'mongodb', isActive: true });
    console.log(`📦 Found ${files.length} files to migrate`);

    let migrated = 0;
    let failed = 0;

    for (const file of files) {
      try {
        console.log(`\n📤 Migrating: ${file.fileName} (${file._id})`);
        
        // Download from GridFS
        const fileBuffer = await downloadFromGridFS(file.storagePath);
        console.log(`  ✅ Downloaded from GridFS (${fileBuffer.length} bytes)`);

        // Generate S3 key
        const s3Key = `files/${file._id}-${file.fileName}`;

        // Upload to S3
        const s3Path = await uploadToS3(
          fileBuffer,
          s3Key,
          file.mimeType,
          {
            originalName: file.originalName,
            uploadedBy: file.uploadedBy?.toString() || 'migration',
            uploadedByName: file.uploadedByName || 'Migration',
          }
        );
        console.log(`  ✅ Uploaded to S3: ${s3Path}`);

        // Update file record
        file.storageType = 's3';
        file.storagePath = s3Path;
        await file.save();
        console.log(`  ✅ Updated file record`);

        migrated++;
        console.log(`  ✅ Migration complete (${migrated}/${files.length})`);
      } catch (error: any) {
        console.error(`  ❌ Failed to migrate ${file.fileName}:`, error.message);
        failed++;
      }
    }

    console.log(`\n✅ Migration complete!`);
    console.log(`   Migrated: ${migrated}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Total: ${files.length}`);

    await mongoose.disconnect();
  } catch (error: any) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
}

migrateFiles();
EOF
```

#### Step 2: Run Migration

```bash
# Make sure STORAGE_TYPE is still 'mongodb' during migration
# The script will download from GridFS and upload to S3

# Run migration
npx ts-node backend/scripts/migrate-to-s3.ts
```

#### Step 3: Switch to S3

After migration completes:

1. Update `.env`: `STORAGE_TYPE=s3`
2. Restart backend server
3. Verify files are accessible

## Testing

### Test 1: Upload File

1. Start backend: `npm run dev`
2. Log in to admin dashboard
3. Upload a test file
4. Check S3 bucket in AWS Console
5. Verify file appears in database with `storageType: 's3'`

### Test 2: Download File

1. Request download via API or frontend
2. Verify file downloads correctly
3. Check download stats are recorded

### Test 3: Delete File

1. Delete a file via admin dashboard
2. Verify file is removed from S3
3. Verify database record is deleted

## Troubleshooting

### Error: "Access Denied"

**Cause**: IAM user doesn't have proper permissions.

**Solution**:
1. Check IAM user has S3 permissions
2. Verify bucket name matches exactly
3. Ensure access keys are correct

### Error: "Bucket does not exist"

**Cause**: Bucket name mismatch or wrong region.

**Solution**:
1. Verify `AWS_S3_BUCKET_NAME` matches bucket name exactly (case-sensitive)
2. **Check `AWS_REGION` matches your S3 bucket's region** (not IAM user region)
   - ✅ **IAM is global** - IAM users can access resources in any region
   - ✅ **S3 buckets are region-specific** - `AWS_REGION` must match bucket region
   - Find your bucket's region: AWS Console → S3 → Your bucket → Properties → Region
3. Ensure bucket exists in AWS Console
4. Verify your IAM user has permissions for that bucket (IAM permissions work across all regions)

### Error: "Invalid credentials"

**Cause**: Wrong access keys or keys expired.

**Solution**:
1. Regenerate AWS access keys
2. Update `.env` file
3. Restart backend server

### Files Not Uploading

**Cause**: Storage type not set correctly.

**Solution**:
1. Verify `STORAGE_TYPE=s3` in `.env`
2. Check AWS credentials are valid
3. Restart backend after changes

### Downloads Failing

**Cause**: File path mismatch or permissions issue.

**Solution**:
1. Check file `storagePath` in database
2. Verify file exists in S3 bucket
3. Check IAM user has `s3:GetObject` permission

## Rollback Plan

If you need to switch back to MongoDB GridFS:

1. **Update `.env`**:
   ```env
   STORAGE_TYPE=mongodb
   ```

2. **Restart backend server**

3. **Note**: Files uploaded to S3 will not be accessible when using MongoDB storage. You'll need to:
   - Keep S3 files for reference
   - Re-upload files to MongoDB if needed
   - Or run a reverse migration script

## Best Practices

1. **Backup First**: Always backup your database before migration
2. **Test in Staging**: Test S3 setup in staging environment first
3. **Monitor Costs**: Set up AWS billing alerts
4. **Use Lifecycle Policies**: Automatically move old files to cheaper storage (Glacier)
5. **Enable Versioning**: Protect against accidental deletions
6. **Rotate Keys**: Regularly rotate AWS access keys
7. **Use IAM Roles**: For production, use IAM roles instead of access keys when possible

## Cost Optimization

### S3 Storage Classes

- **Standard**: Fast access, higher cost
- **Intelligent-Tiering**: Automatically moves files based on access patterns
- **Glacier**: Long-term storage, lower cost

### Lifecycle Policy Example

Automatically move files older than 90 days to cheaper storage:

```json
{
  "Rules": [
    {
      "Id": "MoveOldFilesToGlacier",
      "Status": "Enabled",
      "Transitions": [
        {
          "Days": 90,
          "StorageClass": "GLACIER"
        }
      ]
    }
  ]
}
```

## Support

If you encounter issues:

1. Check AWS CloudWatch logs
2. Review backend console logs
3. Verify environment variables
4. Test S3 connection with test script

## Next Steps

After successful migration:

1. ✅ Monitor S3 usage and costs
2. ✅ Set up CloudWatch alarms
3. ✅ Configure lifecycle policies
4. ✅ Enable S3 access logging
5. ✅ Review and optimize storage costs monthly

---

**Migration Complete!** 🎉

Your files are now stored in AWS S3 with all the benefits of cloud storage.

