# Netlify Deployment Guide

## Quick Setup

1. **Connect your GitHub repository to Netlify**
   - Go to https://app.netlify.com
   - Click "Add new site" → "Import an existing project"
   - Select your GitHub repository

2. **Configure Build Settings**

   Netlify should auto-detect the settings from `netlify.toml`, but verify:
   
   - **Base directory**: Leave empty (defaults to repo root) ⚠️ **IMPORTANT: Do NOT set to `"."` or empty string**
   - **Build command**: `cd frontend && npm ci && npm run build`
   - **Publish directory**: `frontend/build`
   - **Node version**: `18.20.4` (set in `.nvmrc`)
   - **⚠️ IMPORTANT**: Python dependencies are disabled
     - `requirements.txt` has been moved to `contracts/` directory (where it belongs for smart contract development)
     - Netlify will no longer auto-detect and try to install Python dependencies
     - If you still see Python errors, manually disable Python in Build & Deploy → Environment

3. **Environment Variables**

   Add these in Netlify Dashboard → Site Settings → Environment Variables:
   
   - `REACT_APP_API_URL`: Your backend API URL (e.g., `https://dr-birdy-books-protocol-main.onrender.com/api`)
   - `REACT_APP_GA_TRACKING_ID`: Your Google Analytics ID (optional)

4. **Deploy**

   - Netlify will automatically deploy on every push to `main` branch
   - Or click "Deploy site" to trigger a manual deployment

## Troubleshooting

### Build Fails with npm Peer Dependency Errors (Hardhat)

**Error**: `npm error ERESOLVE could not resolve` or `Conflicting peer dependency: @nomicfoundation/hardhat-verify`

**Solution**: 
- ✅ **FIXED**: Added `NPM_FLAGS = "--legacy-peer-deps"` to `netlify.toml` and `legacy-peer-deps=true` to `.npmrc`
- Netlify auto-detects root `package.json` (which has Hardhat dependencies) and tries to install them
- The `--legacy-peer-deps` flag allows the root install to proceed without peer dependency conflicts
- Our build command then installs only frontend dependencies: `cd frontend && npm ci && npm run build`
- This is a workaround - we don't actually need root dependencies for the frontend build, but Netlify installs them automatically

### Build Fails with Python/Rust Errors

**Error**: `error: rustup could not choose a version of cargo to run` or `Error installing pip dependencies`

**Solution**: 
- ✅ **FIXED**: `requirements.txt` has been moved to `contracts/` directory
- Netlify should no longer auto-detect Python dependencies
- If you still see this error:
  1. Go to Site Settings → Build & Deploy → Environment
  2. Set `PYTHON_VERSION` to empty/unset, or disable Python entirely
  3. Clear Netlify build cache and redeploy

### Build Fails with "Cannot find module"

**Solution**: Ensure `npm ci` is used (not `npm install`) to get exact dependency versions.

### Build Output Not Found

**Solution**: Verify publish directory is set to `frontend/build` (not just `build` or `frontend`).

### Node Version Errors

**Solution**: 
- Ensure `.nvmrc` file exists with Node 18.20.4
- In Netlify, go to Site Settings → Build & Deploy → Environment
- Set Node version to `18.20.4` or use `.nvmrc`

### React Router 404 Errors

**Solution**: The `netlify.toml` includes a redirect rule that should handle this. If not working:
- Go to Netlify Dashboard → Site Settings → Build & Deploy → Post processing
- Add a redirect: `/* /index.html 200`

### CORS Errors

**Solution**: Update your backend `CORS_ORIGIN` environment variable to include your Netlify URL:
```
https://your-site.netlify.app,https://your-custom-domain.com
```

## File Structure

```
dr-birdy-books-protocol-main/
├── netlify.toml          # Netlify configuration
├── .nvmrc                # Node version pin
├── frontend/
│   ├── package.json      # Frontend dependencies
│   ├── build/            # Build output (created by npm run build)
│   └── ...
└── backend/              # Backend (deployed separately to Render)
```

## Build Process

1. Netlify clones your repository
2. Runs `cd frontend && npm ci` (installs dependencies)
3. Runs `npm run build` (creates `frontend/build/`)
4. Publishes `frontend/build/` as static site
5. Serves files with React Router redirects

## Custom Domain

After deployment:
1. Go to Site Settings → Domain management
2. Add your custom domain
3. Update `REACT_APP_API_URL` if needed
4. Update backend `CORS_ORIGIN` to include custom domain

