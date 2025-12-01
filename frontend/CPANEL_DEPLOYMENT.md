# cPanel Deployment Guide

## Static Files Ready for Deployment

Your production build is located in: `frontend/build/`

## Deployment Steps

### 1. Upload Files to cPanel

1. **Log into cPanel**
2. **Open File Manager** (or use FTP/SFTP)
3. **Navigate to your domain's public_html folder** (or subdomain folder)
   - For main domain: `public_html/`
   - For subdomain: `public_html/subdomain/`

### 2. Upload All Build Files

Upload **ALL contents** from the `frontend/build/` folder to your web root:
- `index.html`
- `.htaccess` (important for React Router!)
- `favicon.ico`
- `logo192.png`
- `logo512.png`
- `manifest.json`
- `og-image.png`
- `robots.txt`
- `sitemap.xml`
- `static/` folder (with all CSS and JS files)

### 3. Important Notes

- **Make sure `.htaccess` is uploaded** - This file enables React Router to work correctly on Apache servers
- **Upload the entire `static/` folder** - Contains all your CSS and JavaScript files
- **Set correct file permissions** (if needed):
  - Folders: `755`
  - Files: `644`

### 4. Environment Variables

Since this is a static build, make sure your backend API URL is set correctly:
- The frontend uses `REACT_APP_API_URL` from your `.env` file
- This was baked into the build during compilation
- If you need to change it, rebuild with the new value

### 5. Verify Deployment

1. Visit your domain
2. Check browser console for any errors
3. Test wallet connection
4. Test navigation (React Router should work)

## Troubleshooting

### React Router Not Working (404 on refresh)
- Ensure `.htaccess` file is uploaded
- Check that mod_rewrite is enabled on your server
- Verify `.htaccess` file permissions

### API Connection Issues
- Check that `REACT_APP_API_URL` in your build matches your backend
- Verify CORS settings on your backend
- Check browser console for specific error messages

### Assets Not Loading
- Ensure `static/` folder and all its contents are uploaded
- Check file permissions
- Verify paths in browser Network tab

## File Structure After Upload

```
public_html/
├── index.html
├── .htaccess
├── favicon.ico
├── logo192.png
├── logo512.png
├── manifest.json
├── og-image.png
├── robots.txt
├── sitemap.xml
└── static/
    ├── css/
    │   └── main.[hash].css
    └── js/
        └── main.[hash].js
```

## Rebuilding

To rebuild with updated code:
```bash
cd frontend
npx craco build
```

Then re-upload the `build/` folder contents.

