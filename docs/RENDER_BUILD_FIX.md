# Fix for Render Build: Missing @types Packages

## Problem

Render build fails with errors like:
```
error TS7016: Could not find a declaration file for module 'express'.
error TS7016: Could not find a declaration file for module 'jsonwebtoken'.
```

## Root Cause

Render is **NOT installing devDependencies** during the build. All `@types/*` packages are in `devDependencies`, but they're not being installed.

## Solution: Update Build Command in Render

### In Render Dashboard:

1. Go to your **Backend Service**
2. Click **Settings**
3. Find **Build Command**
4. **Change it to:**

```bash
npm install --include=dev && npm run build
```

**OR** (if using npm 9+):

```bash
NODE_ENV=development npm install && npm run build
```

**OR** (alternative):

```bash
npm ci --include=dev && npm run build
```

## Why This Works

- `--include=dev` flag explicitly tells npm to install devDependencies
- Without this, Render may skip devDependencies in production builds
- TypeScript and all `@types/*` packages are in devDependencies and are needed for compilation

## Current Render Settings

**Must Have:**
- ✅ **Root Directory**: `backend`
- ✅ **Build Command**: `npm install --include=dev && npm run build`
- ✅ **Start Command**: `npm start`

## Verify

After updating the build command, the build should:
1. Install all dependencies including devDependencies
2. Find all `@types/*` packages
3. Compile TypeScript successfully
4. Create `dist/` folder with compiled JavaScript

## If Still Failing

If `--include=dev` doesn't work, try:

1. **Set NODE_ENV during build:**
   ```bash
   NODE_ENV=development npm install && npm run build
   ```

2. **Use npm ci:**
   ```bash
   npm ci --include=dev && npm run build
   ```

3. **Check npm version:**
   - Render uses Node 25.2.1 (npm 10+)
   - `--include=dev` should work
   - If not, use `NODE_ENV=development`

## Quick Fix

**Just update the Build Command in Render to:**
```
npm install --include=dev && npm run build
```

This will fix all the TypeScript errors! ✅
