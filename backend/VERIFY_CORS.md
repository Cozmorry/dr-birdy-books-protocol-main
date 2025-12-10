# Quick CORS Verification Guide

## The Problem

Your images are failing because:
1. **CORS is not configured** - No `Access-Control-Allow-Origin` header in responses
2. **URL encoding issue** - Pre-signed URLs are being double-encoded

## Immediate Fix: Configure CORS in S3

### Step 1: Go to AWS Console
1. Open [AWS S3 Console](https://s3.console.aws.amazon.com/)
2. Click on your bucket: `dr-birdy-books-files`

### Step 2: Configure CORS
1. Click **Permissions** tab
2. Scroll to **Cross-origin resource sharing (CORS)**
3. Click **Edit**
4. **Delete any existing configuration**
5. Paste this EXACT configuration:

```json
[
    {
        "AllowedHeaders": [
            "*"
        ],
        "AllowedMethods": [
            "GET",
            "HEAD"
        ],
        "AllowedOrigins": [
            "http://localhost:3000",
            "http://localhost:5001",
            "*"
        ],
        "ExposeHeaders": [
            "ETag",
            "Content-Length",
            "Content-Type"
        ],
        "MaxAgeSeconds": 3000
    }
]
```

**Note**: I've added `"*"` temporarily to test. Once it works, replace `"*"` with your actual production domains.

### Step 3: Save and Wait
1. Click **Save changes**
2. **Wait 2-5 minutes** for AWS to propagate the changes
3. Clear your browser cache
4. Hard refresh (Ctrl+Shift+R)

## Verify CORS is Working

### Method 1: Browser DevTools
1. Open DevTools (F12)
2. Go to **Network** tab
3. Refresh the page
4. Click on an image request
5. Check **Response Headers**
6. You should see: `Access-Control-Allow-Origin: *` (or your domain)

### Method 2: curl Command
```bash
curl -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS \
     -v \
     "https://dr-birdy-books-files.s3.us-east-2.amazonaws.com/blog-images/test.jpg"
```

Look for `Access-Control-Allow-Origin` in the response.

## Fix URL Encoding Issue

The backend code has been updated to properly extract S3 keys from pre-signed URLs. However, you may need to:

1. **Re-upload the blog post images** - This will generate fresh, properly formatted pre-signed URLs
2. OR wait for the next time the blog posts are fetched (they'll get fresh URLs automatically)

## After CORS is Configured

Once CORS is working:
1. Replace `"*"` in AllowedOrigins with your actual domains:
   ```json
   "AllowedOrigins": [
       "http://localhost:3000",
       "https://yourdomain.com",
       "https://www.yourdomain.com"
   ]
   ```
2. Save changes
3. Test again

## Still Not Working?

If images still don't load after configuring CORS:

1. **Check the exact error in browser console** - Look for CORS-specific errors
2. **Verify the bucket name** - Make sure it matches `dr-birdy-books-files`
3. **Check the region** - Make sure your `AWS_REGION` env variable matches the bucket region
4. **Test with a direct URL** - Try accessing the image URL directly in a new tab
5. **Check IAM permissions** - Ensure your IAM user has `s3:GetObject` permission

