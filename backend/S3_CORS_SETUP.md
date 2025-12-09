# S3 CORS Configuration Guide

## Why CORS is Needed

When your frontend (running on a domain like `https://yourdomain.com` or `http://localhost:3000`) tries to load images directly from S3, the browser enforces CORS (Cross-Origin Resource Sharing) policies. Without proper CORS configuration, the browser will block the image requests, resulting in broken images.

## How to Configure CORS in S3

### Step 1: Go to Your S3 Bucket

1. Log into [AWS Console](https://console.aws.amazon.com/)
2. Navigate to **S3** service
3. Click on your bucket name (e.g., `dr-birdy-books-files`)

### Step 2: Open Permissions Tab

1. Click on the **Permissions** tab
2. Scroll down to **Cross-origin resource sharing (CORS)**
3. Click **Edit**

### Step 3: Add CORS Configuration

Paste the following JSON configuration:

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
            "https://yourdomain.com",
            "https://www.yourdomain.com"
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

### Step 4: Customize for Your Domains

**Important**: CORS uses **origins** (protocol + domain + port), NOT paths. So `http://localhost:3000` covers ALL routes including `/admin`, `/blog`, etc.

**Replace the `AllowedOrigins` with your actual frontend domains:**

- **For local development**: Keep `http://localhost:3000` and `http://localhost:5001`
- **For production**: Replace `https://yourdomain.com` with your actual frontend domain(s)
- **For multiple domains**: Add each domain as a separate entry in the array
- **You do NOT need to add routes like `/admin`** - the origin covers all paths

**Example for production:**
```json
"AllowedOrigins": [
    "https://dr-birdy-books-protocol.vercel.app",
    "https://www.drbirdybooks.com",
    "https://drbirdybooks.com"
]
```

### Step 5: Save Changes

1. Click **Save changes**
2. Wait a few seconds for the changes to propagate

## Important Notes

### Wildcard Origins (Not Recommended for Production)

If you want to allow all origins (⚠️ **NOT recommended for production**):
```json
"AllowedOrigins": [
    "*"
]
```

**Warning**: Using `"*"` allows any website to load your images, which could lead to:
- Increased bandwidth costs
- Potential abuse
- Security concerns

### For Pre-signed URLs

Even with pre-signed URLs, CORS is still required because:
- The browser still makes a cross-origin request to S3
- CORS headers must be present for the browser to allow the image to load
- Pre-signed URLs only handle authentication, not CORS

### Testing CORS

After configuring CORS:

1. **Clear your browser cache** (important!)
2. **Hard refresh** the page (Ctrl+Shift+R or Cmd+Shift+R)
3. **Check browser console** for CORS errors
4. **Test in Network tab**:
   - Open DevTools → Network tab
   - Look for image requests
   - Check the Response Headers for `Access-Control-Allow-Origin`

### Common CORS Errors

**Error**: `Access to image at '...' from origin '...' has been blocked by CORS policy`

**Solution**: 
- Verify your frontend domain is in the `AllowedOrigins` list
- Make sure you saved the CORS configuration
- Wait a few minutes for changes to propagate
- Clear browser cache

**Error**: `No 'Access-Control-Allow-Origin' header is present`

**Solution**:
- Double-check the CORS configuration is saved
- Verify the bucket name matches
- Check that the request is going to the correct S3 endpoint

## Alternative: Using CloudFront

If you're using CloudFront in front of S3:

1. Configure CORS on S3 (as above)
2. Configure CloudFront to forward CORS headers:
   - Go to CloudFront distribution
   - Edit behaviors
   - Under "Cache key and origin requests"
   - Enable "CORS" in cache policy
   - Or create a custom cache policy that includes CORS headers

## Verification

After setting up CORS, you should see these headers in the image response:

```
Access-Control-Allow-Origin: https://yourdomain.com
Access-Control-Allow-Methods: GET, HEAD
Access-Control-Expose-Headers: ETag, Content-Length, Content-Type
```

You can verify this in:
- Browser DevTools → Network tab → Click on an image → Headers tab
- Or use curl: `curl -I "https://your-bucket.s3.region.amazonaws.com/image.jpg"`

## Troubleshooting: Images Still Broken

If images are still broken after setting up CORS, follow these steps:

### 1. Check Browser Console

Open DevTools (F12) → Console tab and look for:
- CORS errors (red text)
- Image load errors
- Network errors

The frontend now logs image load status:
- `✅ Image loaded successfully:` - Image is working
- `❌ Image failed to load:` - Image failed (check the URL)

### 2. Verify CORS Configuration

**In AWS Console:**
1. Go to S3 → Your bucket → Permissions → CORS
2. Verify the configuration is saved
3. Check that your origin is in the `AllowedOrigins` list
4. Make sure there are no JSON syntax errors

**Test CORS with curl:**
```bash
curl -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS \
     -v \
     "https://your-bucket.s3.region.amazonaws.com/blog-images/test.jpg"
```

You should see `Access-Control-Allow-Origin` in the response headers.

### 3. Check Pre-signed URLs

Pre-signed URLs should look like:
```
https://your-bucket.s3.region.amazonaws.com/blog-images/image.jpg?X-Amz-Algorithm=...&X-Amz-Credential=...&X-Amz-Date=...&X-Amz-Expires=604800&X-Amz-SignedHeaders=host&X-Amz-Signature=...
```

**Verify the URL:**
1. Copy the image URL from browser console
2. Paste it directly in a new browser tab
3. If it loads there, it's a CORS issue
4. If it doesn't load, the pre-signed URL might be expired or invalid

### 4. Clear Browser Cache

CORS changes can be cached:
1. **Hard refresh**: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
2. **Clear cache**: DevTools → Application → Clear storage → Clear site data
3. **Incognito mode**: Test in a private/incognito window

### 5. Check Network Tab

In DevTools → Network tab:
1. Find the image request
2. Check the **Status** code:
   - `200` = Success (but might still be blocked by CORS)
   - `403` = Access denied (check IAM permissions)
   - `404` = Image not found (check S3 key)
3. Check **Response Headers**:
   - Should include `Access-Control-Allow-Origin`
   - Should match your frontend origin

### 6. Verify S3 Bucket Policy

Your bucket might have a policy blocking access. Check:
1. S3 → Your bucket → Permissions → Bucket policy
2. Ensure it allows `s3:GetObject` for your IAM user/role
3. If using public access, ensure it's enabled

### 7. Test with Direct S3 URL

Temporarily test with a direct S3 URL (if bucket is public):
```
https://your-bucket.s3.region.amazonaws.com/blog-images/image.jpg
```

If this works but pre-signed URLs don't, the issue is with pre-signed URL generation.

### 8. Check Backend Logs

Look for these log messages:
- `✅ Generated pre-signed URL for blog image:` - URL generation succeeded
- `❌ Failed to generate pre-signed URL:` - URL generation failed
- `🔗 Generated pre-signed URL for key:` - S3 service generated URL

### 9. Common Issues

**Issue**: CORS configured but still getting errors
- **Solution**: Wait 2-5 minutes for AWS to propagate changes
- **Solution**: Make sure you're testing from the exact origin in `AllowedOrigins` (including `http://` vs `https://`)

**Issue**: Pre-signed URLs work in new tab but not in `<img>` tag
- **Solution**: This is definitely CORS - verify CORS configuration again

**Issue**: Images work sometimes but not always
- **Solution**: Pre-signed URLs expire after 7 days - they're being regenerated on each request
- **Solution**: Check if URLs are being cached incorrectly

### 10. Still Not Working?

If none of the above works:
1. Check the exact error message in browser console
2. Verify the S3 bucket region matches your `AWS_REGION` env variable
3. Try using a wildcard origin temporarily to test: `"AllowedOrigins": ["*"]`
4. Check if you're behind a proxy or VPN that might interfere

