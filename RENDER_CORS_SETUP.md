# CORS Configuration for Render Deployment

## ⚠️ Important: CORS Origin Changes on Render

**No, the CORS origin does NOT remain the same!** You must update it to your Render frontend URL.

---

## Current Configuration

Your backend currently uses:
- **Development**: `http://localhost:3000` (default)
- **Render Production**: Must be `https://your-frontend.onrender.com`

---

## How CORS Works in Your Code

Looking at `backend/src/server.ts`:

```typescript
const allowedOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : ['http://localhost:3000', 'http://localhost:3001'];
```

**Key Points:**
- Reads from `CORS_ORIGIN` environment variable
- Supports **multiple origins** (comma-separated)
- Defaults to localhost if not set

---

## Render Deployment Setup

### Step 1: Deploy Backend First

When creating your backend service, set:

```env
CORS_ORIGIN=https://dr-birdy-books-frontend.onrender.com
```

**Or if you don't know the frontend URL yet:**
- Deploy backend first
- Note the backend URL
- Deploy frontend
- **Then update backend CORS_ORIGIN** to the frontend URL

### Step 2: Deploy Frontend

After frontend is deployed, you'll get a URL like:
- `https://dr-birdy-books-frontend.onrender.com`

### Step 3: Update Backend CORS

**Go to Render Dashboard → Backend Service → Environment:**

Update `CORS_ORIGIN` to:
```env
CORS_ORIGIN=https://dr-birdy-books-frontend.onrender.com
```

**Save** - This will trigger a redeploy.

---

## Multiple Origins (Recommended)

You can allow multiple origins for flexibility:

```env
CORS_ORIGIN=https://dr-birdy-books-frontend.onrender.com,https://www.yourdomain.com,https://yourdomain.com,http://localhost:3000
```

This allows:
- ✅ Render frontend
- ✅ Production domain (if you have one)
- ✅ Local development

---

## Common CORS Issues on Render

### Issue 1: "Not allowed by CORS" Error

**Cause:** CORS_ORIGIN doesn't match the frontend URL

**Solution:**
1. Check your frontend URL in Render
2. Ensure CORS_ORIGIN matches exactly (including `https://`)
3. No trailing slash
4. Case-sensitive

### Issue 2: Works Locally but Not on Render

**Cause:** Still using localhost CORS_ORIGIN

**Solution:**
- Update CORS_ORIGIN in Render environment variables
- Redeploy backend

### Issue 3: Multiple Frontend Deployments

**Solution:** Use comma-separated origins:
```env
CORS_ORIGIN=https://frontend-1.onrender.com,https://frontend-2.onrender.com
```

---

## Step-by-Step: Setting CORS in Render

1. **Go to Render Dashboard**
2. **Click on your Backend Service**
3. **Go to "Environment" tab**
4. **Find or Add `CORS_ORIGIN`**
5. **Set value to your frontend URL:**
   ```
   https://dr-birdy-books-frontend.onrender.com
   ```
6. **Click "Save Changes"**
7. **Wait for redeploy** (automatic)

---

## Verification

After updating CORS, test:

1. Open your frontend in browser
2. Open browser console (F12)
3. Try to make an API request
4. Check for CORS errors

**If you see CORS errors:**
- Double-check the URL matches exactly
- Ensure no trailing slash
- Check for typos
- Verify backend redeployed after change

---

## Example: Complete Environment Variables for Render Backend

```env
NODE_ENV=production
PORT=5001
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dr-birdy-books
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-password
ADMIN_EMAIL=admin@drbirdybooks.com
STORAGE_TYPE=mongodb
CORS_ORIGIN=https://dr-birdy-books-frontend.onrender.com
BLOCKCHAIN_RPC_URL=https://mainnet.base.org
STAKING_CONTRACT_ADDRESS=0xYourMainnetAddress
TOKEN_CONTRACT_ADDRESS=0xYourMainnetAddress
```

---

## Summary

✅ **CORS origin MUST change** - It's different on Render
✅ **Set to your Render frontend URL** - Format: `https://service-name.onrender.com`
✅ **Supports multiple origins** - Comma-separated list
✅ **Update in Render dashboard** - Environment variables section
✅ **Redeploys automatically** - After saving changes

**The CORS origin is NOT the same - update it to your Render frontend URL!**

