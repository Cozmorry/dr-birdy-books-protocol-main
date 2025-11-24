# Deployment Guide - Dr. Birdy Books Protocol

## Current Setup (Development)

- **Frontend**: Port 3000 (main user-facing app)
- **Admin Dashboard**: Port 3001 (admin interface, loaded in iframe)
- **Backend API**: Port 5001 (Node.js/Express)

## Production Deployment Options

### Option 1: Integrated Single Build (Recommended) ✅

**Best for:** Most production scenarios

**How it works:**
- Copy admin dashboard components into the frontend
- Build a single React app with routes for both user and admin sections
- Deploy as one application

**Benefits:**
- Single deployment
- No iframe issues
- Better performance
- Simpler hosting
- Shared dependencies

**Deployment:**
```bash
# Build frontend (includes admin)
cd frontend
npm run build

# Deploy the 'build' folder to:
# - Vercel
# - Netlify
# - AWS S3 + CloudFront
# - Any static hosting
```

**Routes:**
- `/` → Main user app
- `/admin/*` → Admin dashboard

---

### Option 2: Separate Deployments (Current Setup)

**Best for:** When you want to completely separate admin from user app

**How it works:**
- Deploy frontend separately
- Deploy admin dashboard separately
- Frontend loads admin in iframe

**Benefits:**
- Complete separation
- Can use different domains
- Independent scaling

**Deployment:**
```bash
# Deploy frontend
cd frontend
npm run build
# Deploy build/ to hosting service

# Deploy admin dashboard
cd admin-dashboard
npm run build
# Deploy dist/ to hosting service (different URL)
```

**Requirements:**
- Frontend: `https://yourdomain.com`
- Admin Dashboard: `https://admin.yourdomain.com` (or different port)
- Update iframe URL in `AdminRoute.tsx` to point to admin URL

---

### Option 3: Backend-Served Admin (Alternative)

**Best for:** When you want admin served from backend

**How it works:**
- Build admin dashboard
- Serve admin static files from Express backend
- Access at `/admin` route on backend

**Benefits:**
- Single backend deployment
- Admin protected by backend authentication

---

## Recommended: Option 1 (Integrated)

For production, I recommend **integrating the admin dashboard into the frontend** so you have:

1. **One build** → One deployment
2. **One domain** → `yourdomain.com` and `yourdomain.com/admin`
3. **Simpler hosting** → Just deploy the frontend build
4. **Better performance** → No iframe overhead

## Backend Deployment

The backend can be deployed separately to:
- **Heroku**
- **AWS EC2/Elastic Beanstalk**
- **DigitalOcean**
- **Railway**
- **Render**
- **Any Node.js hosting**

**Environment Variables Needed:**
- `MONGODB_URI` (MongoDB Atlas connection string)
- `JWT_SECRET`
- `PORT` (usually set by hosting provider)
- `CORS_ORIGIN` (your frontend domain)
- `STORAGE_TYPE` (local or mongodb)

## Quick Start for Production

### 1. Build Frontend (with integrated admin)
```bash
cd frontend
npm run build
```

### 2. Deploy Frontend
- Upload `build/` folder to your hosting service
- Configure routing to serve `index.html` for all routes (SPA)

### 3. Deploy Backend
- Push to hosting service
- Set environment variables
- Start with `npm start`

### 4. Update CORS
In backend `.env`:
```env
CORS_ORIGIN=https://yourdomain.com
```

---

## Next Steps

Would you like me to:
1. ✅ **Integrate admin into frontend** (recommended) - Copy admin components into frontend
2. Keep separate and update deployment config
3. Set up backend-served admin

Let me know which approach you prefer!

