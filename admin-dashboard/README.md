# Dr. Birdy Books - Admin Dashboard

Modern, responsive admin dashboard for managing the Dr. Birdy Books Protocol content platform.

## 🚀 Features

- **Dashboard Overview**: Real-time statistics and quick actions
- **File Management**: Upload, manage, and track content files
- **Blog Management**: Create, edit, and publish blog posts
- **Analytics**: Detailed insights into downloads, views, and user activity
- **Settings**: Account management and system configuration
- **Responsive Design**: Works seamlessly on desktop and mobile
- **Secure Authentication**: JWT-based authentication with role-based access

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Backend API running (see `../backend/README.md`)

## 🛠️ Installation

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env if needed (defaults work for local development)
nano .env
```

## 🏃 Running the Dashboard

### Development Mode
```bash
npm run dev
```

Dashboard will be available at http://localhost:3001

### Production Build
```bash
npm run build
npm run preview
```

## 🔐 Default Login

- **Username**: `admin`
- **Password**: `changeme123`

⚠️ **IMPORTANT**: Change the default password immediately after first login!

## 📱 Features Overview

### Dashboard Page
- Overview statistics (files, downloads, blog posts, views)
- Top downloaded files
- Top viewed blog posts
- Quick action buttons

### Files Page
- Upload new files with drag-and-drop
- Set file descriptions and tier access
- View all uploaded files in a table
- Delete files
- Track download counts

### Blog Page
- Create new blog posts
- View all posts with status (draft/published/archived)
- Edit existing posts
- Delete posts
- Track view counts

### Analytics Page
- Dashboard overview with key metrics
- Downloads by tier
- Downloads by file type
- Activity timeline

### Settings Page
- View profile information
- Change password
- System information
- (Super admin: Create new admins)

## 🎨 Customization

### Change Theme Colors

Edit `tailwind.config.js`:

```javascript
theme: {
  extend: {
    colors: {
      primary: {
        500: '#YOUR_COLOR',
        600: '#YOUR_COLOR',
        700: '#YOUR_COLOR',
      },
    },
  },
}
```

### Change Logo

Replace the `BookOpen` icon in `src/components/DashboardLayout.tsx` with your custom logo.

## 🔧 Configuration

### Environment Variables

Create a `.env` file:

```env
VITE_API_URL=http://localhost:5000/api
```

For production:

```env
VITE_API_URL=https://api.yourdomain.com/api
```

## 📦 Project Structure

```
admin-dashboard/
├── src/
│   ├── components/
│   │   └── DashboardLayout.tsx    # Main layout with sidebar
│   ├── lib/
│   │   └── api.ts                 # API client
│   ├── pages/
│   │   ├── LoginPage.tsx          # Login page
│   │   ├── DashboardPage.tsx      # Dashboard overview
│   │   ├── FilesPage.tsx          # File management
│   │   ├── BlogPage.tsx           # Blog management
│   │   ├── AnalyticsPage.tsx      # Analytics
│   │   └── SettingsPage.tsx       # Settings
│   ├── store/
│   │   └── useAuthStore.ts        # Authentication state
│   ├── App.tsx                    # Main app component
│   ├── main.tsx                   # Entry point
│   └── index.css                  # Global styles
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── README.md
```

## 🚀 Deployment

### Vercel

```bash
npm run build
vercel deploy
```

### Netlify

```bash
npm run build
netlify deploy --prod --dir=dist
```

### AWS S3 + CloudFront

```bash
npm run build
aws s3 sync dist/ s3://your-bucket-name
```

## 🔒 Security

- JWT authentication with automatic token refresh
- Secure password hashing (bcrypt)
- Protected routes
- CORS configuration
- Rate limiting on API
- Input validation

## 🐛 Troubleshooting

### Can't login
- Ensure backend is running
- Check API_URL in .env
- Verify admin credentials in backend/.env

### API calls failing
- Check CORS settings in backend
- Verify backend is accessible
- Check browser console for errors

### Build fails
- Clear node_modules: `rm -rf node_modules && npm install`
- Clear cache: `rm -rf .vite && npm run dev`

## 📚 Technologies Used

- **React 18**: UI framework
- **TypeScript**: Type safety
- **Vite**: Build tool
- **Tailwind CSS**: Styling
- **Zustand**: State management
- **Axios**: HTTP client
- **React Router**: Routing
- **Lucide React**: Icons

## 📄 License

MIT License - See LICENSE file for details

## 🤝 Support

For issues and questions:
- GitHub Issues: [Project Issues](https://github.com/domambia/dr-birdy-books-protocol/issues)
- Documentation: [Full Documentation](../IMPLEMENTATION_GUIDE.md)

---

Built with ❤️ for the Dr. Birdy Books Protocol



















