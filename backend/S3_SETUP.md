# AWS S3 Setup Guide

This guide will help you configure AWS S3 for file storage in the Dr. Birdy Books backend.

## Prerequisites

1. An AWS account
2. An S3 bucket created in your AWS account
3. AWS Access Key ID and Secret Access Key with S3 permissions

## Step 1: Create an S3 Bucket

1. Log in to the AWS Console
2. Navigate to S3 service
3. Click "Create bucket"
4. Choose a unique bucket name (e.g., `dr-birdy-books-files`)
5. Select your preferred region (e.g., `us-east-1`)
6. Configure bucket settings:
   - **Block Public Access**: Keep default settings (all public access blocked)
   - **Bucket Versioning**: Optional
   - **Encryption**: Recommended (SSE-S3 or SSE-KMS)
7. Click "Create bucket"

## Step 2: Create IAM User with S3 Permissions

1. Navigate to IAM service in AWS Console
2. Click "Users" → "Add users"
3. Create a new user (e.g., `dr-birdy-books-s3-user`)
4. Select "Programmatic access"
5. Attach policy: `AmazonS3FullAccess` (or create a custom policy with minimal permissions)
6. Save the **Access Key ID** and **Secret Access Key**

### Custom IAM Policy (Recommended - More Secure)

If you want to use a custom policy with minimal permissions, use this JSON:

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
        "s3:ListBucket",
        "s3:HeadObject"
      ],
      "Resource": [
        "arn:aws:s3:::YOUR-BUCKET-NAME",
        "arn:aws:s3:::YOUR-BUCKET-NAME/*"
      ]
    }
  ]
}
```

Replace `YOUR-BUCKET-NAME` with your actual bucket name.

## Step 3: Update Environment Variables

Add the following variables to your `backend/.env` file:

```env
# Storage Configuration
STORAGE_TYPE=s3

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your-access-key-id-here
AWS_SECRET_ACCESS_KEY=your-secret-access-key-here
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=dr-birdy-books-files
```

### Environment Variables Explained

- `STORAGE_TYPE`: Set to `s3` to use AWS S3, or `mongodb` to use GridFS
- `AWS_ACCESS_KEY_ID`: Your AWS Access Key ID from Step 2
- `AWS_SECRET_ACCESS_KEY`: Your AWS Secret Access Key from Step 2
- `AWS_REGION`: The AWS region where your S3 bucket is located (e.g., `us-east-1`, `us-west-2`, `eu-west-1`)
- `AWS_S3_BUCKET_NAME`: The name of your S3 bucket

## Step 4: Test the Configuration

1. Start your backend server: `npm run dev`
2. Upload a file through the admin dashboard
3. Check your S3 bucket in the AWS Console to verify the file was uploaded
4. Try downloading the file to ensure it works correctly

## Troubleshooting

### Error: "Access Denied"
- Verify your AWS credentials are correct
- Check that your IAM user has the necessary S3 permissions
- Ensure the bucket name matches exactly (case-sensitive)

### Error: "Bucket does not exist"
- Verify the bucket name in `AWS_S3_BUCKET_NAME` matches your actual bucket name
- Check that the bucket exists in the region specified in `AWS_REGION`

### Error: "Invalid credentials"
- Regenerate your AWS Access Keys
- Ensure there are no extra spaces or quotes in your `.env` file

## Security Best Practices

1. **Never commit `.env` files** to version control
2. **Use IAM roles** instead of access keys when deploying to AWS (EC2, Lambda, etc.)
3. **Rotate access keys** regularly
4. **Use least privilege** - only grant the minimum permissions needed
5. **Enable S3 bucket encryption** for sensitive files
6. **Enable S3 bucket versioning** for important files
7. **Set up S3 bucket policies** to restrict access if needed

## Switching Between Storage Types

You can switch between S3 and MongoDB GridFS by changing the `STORAGE_TYPE` environment variable:

- `STORAGE_TYPE=s3` - Uses AWS S3
- `STORAGE_TYPE=mongodb` - Uses MongoDB GridFS (default)

**Note**: Files uploaded with one storage type cannot be accessed when using the other storage type. Make sure all files are migrated if you switch storage types.

