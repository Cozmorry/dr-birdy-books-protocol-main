# Deploying to Render - Complete Guide

## Do You Need to Separate Backend and Frontend in GitHub?

**Short Answer: NO** - You can deploy both from the same repository (monorepo).

Render supports deploying multiple services from a single GitHub repository. You can keep your current structure and deploy both frontend and backend as separate services.

---

## Two Deployment Approaches

### Option 1: Monorepo (Recommended) ✅
**Keep everything in one repository**

**Pros:**
- ✅ Simpler to manage
- ✅ Single source of truth
- ✅ Easier to keep versions in sync
- ✅ No need to split your codebase

**Cons:**
- ⚠️ Both services deploy from the same repo (but can have different settings)

### Option 2: Separate Repositories
**Split frontend and backend into separate repos**

**Pros:**
- ✅ Independent deployments
- ✅ Separate version control
- ✅ Different access permissions

**Cons:**
- ❌ More complex to manage
- ❌ Harder to keep in sync
- ❌ Requires splitting your codebase

---

## Recommended: Monorepo Deployment

### Step 1: Prepare Your Repository

Your current structure is perfect:
```
dr-birdy-books-protocol-main/
├── frontend/
│   ├── package.json
│   ├── src/
│   └── public/
├── backend/
│   ├── package.json
│   ├── src/
│   └── .env
└── contracts/
```

**No changes needed!** ✅

### Step 2: Create Render Services

#### A. Deploy Backend Service

1. **Go to Render Dashboard**: https://dashboard.render.com
2. **Click "New +" → "Web Service"**
3. **Connect your GitHub repository**
4. **Configure Backend Service:**

   **Basic Settings:**
   - **Name**: `dr-birdy-books-backend`
   - **Region**: Choose closest to your users
   - **Branch**: `main` (or your default branch)
   - **Root Directory**: `backend` ⚠️ **CRITICAL: Must be set to `backend`**
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   
   **⚠️ IMPORTANT:** 
   - **Root Directory MUST be `backend`** - This tells Render to run commands from the backend folder
   - If Root Directory is not set, Render will try to build from the root and fail
   - The build command will install all dependencies (including devDependencies) from `backend/package.json`

   **Environment Variables:**
   ```env
   NODE_ENV=production
   PORT=5001
   MONGODB_URI=your_mongodb_atlas_uri
   JWT_SECRET=your_jwt_secret
   JWT_EXPIRES_IN=7d
   ADMIN_USERNAME=your_admin_username
   ADMIN_PASSWORD=your_admin_password
   ADMIN_EMAIL=your_admin_email
   STORAGE_TYPE=mongodb
   CORS_ORIGIN=https://dr-birdy-books-frontend.onrender.com
   # Note: You can add multiple origins separated by commas:
   # CORS_ORIGIN=https://dr-birdy-books-frontend.onrender.com,https://www.yourdomain.com,https://yourdomain.com
   BLOCKCHAIN_RPC_URL=https://mainnet.base.org
   STAKING_CONTRACT_ADDRESS=your_mainnet_staking_address
   TOKEN_CONTRACT_ADDRESS=your_mainnet_token_address
   ```
   
   **⚠️ IMPORTANT: CORS_ORIGIN must be your Render frontend URL!**
   - Format: `https://your-frontend-service-name.onrender.com`
   - No trailing slash
   - Include `https://` protocol
   - You can add multiple origins separated by commas

   **Advanced Settings:**
   - **Auto-Deploy**: `Yes` (deploys on every push)
   - **Health Check Path**: `/api/health` (if you have one)

#### B. Deploy Frontend Service

1. **Click "New +" → "Static Site"** (for React apps)
   - OR **"Web Service"** if you need server-side rendering

2. **Configure Frontend Service:**

   **For Static Site (Recommended for React):**
   - **Name**: `dr-birdy-books-frontend`
   - **Branch**: `main`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `frontend/build`

   **Environment Variables:**
   ```env
   REACT_APP_API_URL=https://dr-birdy-books-backend.onrender.com/api
   REACT_APP_GA_TRACKING_ID=G-XXXXXXXXXX
   ```

   **For Web Service (If needed):**
   - **Name**: `dr-birdy-books-frontend`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npx serve -s build -l 3000`

---

## Step-by-Step Deployment Instructions

### 1. Prepare Your Code

#### Backend Preparation

**File: `backend/package.json`**

Ensure you have these scripts:
```json
{
  "scripts": {
    "start": "node dist/server.js",
    "build": "tsc",
    "dev": "nodemon src/server.ts"
  }
}
```

**File: `backend/src/server.ts`**

Ensure the server listens on the correct port:
```typescript
const PORT = process.env.PORT || 5001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
```

#### Frontend Preparation

**File: `frontend/package.json`**

Ensure you have:
```json
{
  "scripts": {
    "build": "react-scripts build",
    "start": "react-scripts start"
  }
}
```

**Update API URL in Frontend:**

Create `frontend/.env.production`:
```env
REACT_APP_API_URL=https://dr-birdy-books-backend.onrender.com/api
REACT_APP_GA_TRACKING_ID=G-XXXXXXXXXX
```

### 2. Deploy Backend First

1. Go to Render Dashboard
2. Create new Web Service
3. Connect GitHub repo
4. Set Root Directory to `backend`
5. Add all environment variables
6. Deploy

**Wait for backend to be live** - Note the URL (e.g., `https://dr-birdy-books-backend.onrender.com`)

### 3. Update Frontend Environment

Update `frontend/.env.production` with the actual backend URL:
```env
REACT_APP_API_URL=https://dr-birdy-books-backend.onrender.com/api
```

Commit and push this change.

### 4. Deploy Frontend

1. Create new Static Site (or Web Service)
2. Set Root Directory to `frontend`
3. Add environment variables
4. Deploy

### 5. Update Backend CORS

**⚠️ CRITICAL STEP:** After frontend is deployed, you MUST update the backend CORS_ORIGIN environment variable:

1. Go to your **Backend Service** in Render dashboard
2. Go to **Environment** tab
3. Find `CORS_ORIGIN` variable
4. Update it to your frontend URL: `https://dr-birdy-books-frontend.onrender.com`
5. **Save Changes** (this will trigger a redeploy)

**Or set it initially when creating the backend service** (recommended):
```env
CORS_ORIGIN=https://dr-birdy-books-frontend.onrender.com
```

**For multiple origins (dev + production):**
```env
CORS_ORIGIN=https://dr-birdy-books-frontend.onrender.com,https://www.yourdomain.com,https://yourdomain.com
```

**Note:** The CORS origin is DIFFERENT from localhost. It must match your Render frontend URL exactly!

---

## Render Configuration Files (Optional)

You can create Render-specific config files for easier setup:

### `render.yaml` (in root directory)

```yaml
services:
  # Backend Service
  - type: web
    name: dr-birdy-books-backend
    env: node
    region: oregon
    plan: free
    buildCommand: cd backend && npm install && npm run build
    startCommand: cd backend && npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 5001
      - key: MONGODB_URI
        sync: false  # Set in dashboard
      - key: JWT_SECRET
        sync: false
      - key: CORS_ORIGIN
        sync: false

  # Frontend Service
  - type: web
    name: dr-birdy-books-frontend
    env: node
    region: oregon
    plan: free
    buildCommand: cd frontend && npm install && npm run build
    startCommand: cd frontend && npx serve -s build -l 3000
    envVars:
      - key: REACT_APP_API_URL
        value: https://dr-birdy-books-backend.onrender.com/api
```

**Note:** You can import this YAML in Render dashboard for easier setup.

---

## Important Considerations

### 1. Free Tier Limitations

Render's free tier has some limitations:
- **Spins down after 15 minutes of inactivity**
- **Limited build time**
- **Slower cold starts**

**Solutions:**
- Use a paid plan for production
- Or use a service like UptimeRobot to ping your backend every 5 minutes

### 2. Environment Variables

**Never commit sensitive data!**

- Use Render's environment variable settings
- Keep `.env` files in `.gitignore`
- Use Render's "Secret Files" for sensitive configs

### 3. Database

**MongoDB Atlas is recommended:**
- Free tier available
- Works great with Render
- No need to manage database server

### 4. CORS Configuration

Update backend CORS to allow your frontend domain:
```typescript
// backend/src/server.ts
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'https://your-frontend.onrender.com',
  credentials: true,
};
```

### 5. Build Optimization

**Backend:**
- Ensure TypeScript compiles correctly
- Check that `dist/` folder is created
- Verify `dist/server.js` exists after build

**Frontend:**
- Ensure build completes successfully
- Check `build/` folder is created
- Verify all assets are included

---

## Troubleshooting

### Backend Won't Start

**Check:**
1. Build command completes successfully
2. `dist/server.js` exists
3. All environment variables are set
4. MongoDB connection string is correct
5. Port is set correctly (Render provides PORT env var)

### Frontend Can't Connect to Backend

**Check:**
1. Backend URL in frontend env vars is correct
2. CORS is configured in backend
3. Backend is actually running (check Render logs)
4. No typos in API URLs

### Build Fails

**Common Issues:**
- Missing dependencies in `package.json`
- TypeScript errors
- Missing environment variables
- Incorrect root directory path

**Solutions:**
- Check build logs in Render dashboard
- Test build locally first: `npm run build`
- Fix any TypeScript/linting errors

---

## Alternative: Separate Repositories

If you prefer separate repos:

### Steps:

1. **Create New Repository for Backend:**
   ```bash
   # Create new repo
   git clone your-main-repo backend-repo
   cd backend-repo
   
   # Remove frontend and contracts
   rm -rf frontend contracts
   
   # Update .gitignore if needed
   # Push to new repo
   ```

2. **Create New Repository for Frontend:**
   ```bash
   # Similar process for frontend
   ```

3. **Deploy Each Separately:**
   - Connect backend repo to Render backend service
   - Connect frontend repo to Render frontend service

**This is more work and not necessary!** The monorepo approach is simpler.

---

## Summary

✅ **You DON'T need to separate them** - Render supports monorepos perfectly!

**Recommended Setup:**
1. Keep current repository structure
2. Deploy backend as Web Service (root: `backend`)
3. Deploy frontend as Static Site (root: `frontend`)
4. Use environment variables for configuration
5. Update CORS after both are deployed

**Your current structure is perfect for Render!** 🚀

