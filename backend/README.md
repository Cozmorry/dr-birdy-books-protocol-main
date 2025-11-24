# Dr. Birdy Books Backend API

Backend API server for the Dr. Birdy Books Protocol - Token-Stake Access Platform for Digital Content.

## 🚀 Features

- **Authentication System**: JWT-based admin authentication with role-based access control
- **File Management**: Upload, store, and serve digital content (JPEG, PDF, and more)
- **Blog System**: Full CRUD operations for blog posts
- **Analytics**: Track downloads, views, and user activity
- **Blockchain Integration**: Verify user staking status and tier access
- **Security**: Rate limiting, helmet protection, CORS configuration
- **Storage Options**: Local storage, AWS S3, or IPFS support

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB (v5 or higher)
- npm or yarn

## 🛠️ Installation

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` and update the following:
   - `MONGODB_URI`: Your MongoDB connection string
   - `JWT_SECRET`: A strong random secret key
   - `ADMIN_USERNAME` & `ADMIN_PASSWORD`: Default admin credentials
   - `BLOCKCHAIN_RPC_URL`: Your blockchain RPC endpoint
   - Other configuration as needed

4. **Create uploads directory:**
   ```bash
   mkdir -p uploads
   ```

## 🏃 Running the Server

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```
The server will start on `http://localhost:5000` (or your configured PORT).

## 📡 API Endpoints

### Authentication
- `POST /api/auth/login` - Admin login
- `GET /api/auth/me` - Get current admin profile
- `PUT /api/auth/change-password` - Change password
- `POST /api/auth/create-admin` - Create new admin (super admin only)

### Blog Posts
- `GET /api/blog` - Get all blog posts (with filters)
- `GET /api/blog/:id` - Get single blog post
- `POST /api/blog` - Create blog post (admin)
- `PUT /api/blog/:id` - Update blog post (admin)
- `DELETE /api/blog/:id` - Delete blog post (admin)

### Files
- `GET /api/files` - Get all files (with access control)
- `GET /api/files/:id` - Get single file
- `GET /api/files/:id/download` - Download file (with wallet verification)
- `POST /api/files/upload` - Upload file (admin)
- `PUT /api/files/:id` - Update file metadata (admin)
- `DELETE /api/files/:id` - Delete file (admin)

### Analytics
- `GET /api/analytics/dashboard` - Get dashboard analytics (admin)
- `GET /api/analytics/files` - Get file analytics (admin)
- `GET /api/analytics/blog` - Get blog analytics (admin)

### Health Check
- `GET /api/health` - Server health check

## 🔐 Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Login Example
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "your-password"}'
```

## 📤 File Upload Example

```bash
curl -X POST http://localhost:5000/api/files/upload \
  -H "Authorization: Bearer <your-jwt-token>" \
  -F "file=@/path/to/file.pdf" \
  -F "description=Sample PDF file" \
  -F "tier=0"
```

## 🗂️ Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── database.ts       # MongoDB configuration
│   │   └── blockchain.ts     # Blockchain integration
│   ├── controllers/
│   │   ├── authController.ts
│   │   ├── blogController.ts
│   │   ├── fileController.ts
│   │   └── analyticsController.ts
│   ├── middleware/
│   │   ├── auth.ts           # Authentication middleware
│   │   └── upload.ts         # File upload middleware
│   ├── models/
│   │   ├── Admin.ts
│   │   ├── BlogPost.ts
│   │   ├── File.ts
│   │   └── Analytics.ts
│   ├── routes/
│   │   ├── authRoutes.ts
│   │   ├── blogRoutes.ts
│   │   ├── fileRoutes.ts
│   │   └── analyticsRoutes.ts
│   └── server.ts             # Main server file
├── uploads/                  # File storage directory
├── .env.example             # Environment variables template
├── package.json
├── tsconfig.json
└── README.md
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 5000 |
| `NODE_ENV` | Environment | development |
| `MONGODB_URI` | MongoDB connection string | mongodb://localhost:27017/dr-birdy-books |
| `JWT_SECRET` | JWT secret key | - |
| `JWT_EXPIRES_IN` | JWT expiration time | 7d |
| `ADMIN_USERNAME` | Default admin username | admin |
| `ADMIN_PASSWORD` | Default admin password | changeme123 |
| `CORS_ORIGIN` | Allowed CORS origin | http://localhost:3000 |
| `MAX_FILE_SIZE` | Max upload file size (bytes) | 52428800 (50MB) |
| `BLOCKCHAIN_RPC_URL` | Blockchain RPC endpoint | https://sepolia.base.org |
| `STAKING_CONTRACT_ADDRESS` | Staking contract address | - |

### Admin Roles

- **super_admin**: Full access to all features including creating new admins
- **admin**: Access to all content management features
- **content_manager**: Limited access to file and blog management

## 📊 Database Models

### Admin
- Username, email, password (hashed)
- Role-based access control
- Last login tracking

### BlogPost
- Title, content, excerpt
- Author information
- Status (draft/published/archived)
- Tags and views tracking

### File
- File metadata (name, type, size)
- Tier-based access control
- Storage information
- Download tracking

### Analytics
- Event tracking (downloads, views, uploads)
- User activity monitoring
- Timestamp and metadata

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt with salt rounds
- **Rate Limiting**: Prevent abuse and DDoS attacks
- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing control
- **File Validation**: Type and size restrictions
- **Blockchain Verification**: On-chain access control

## 🚨 Default Admin

On first run, a default admin account is created:
- **Username**: admin (or from .env)
- **Password**: changeme123 (or from .env)

⚠️ **IMPORTANT**: Change the default password immediately after first login!

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Test API health
curl http://localhost:5000/api/health
```

## 📝 API Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

## 🐛 Troubleshooting

### MongoDB Connection Error
- Ensure MongoDB is running
- Check MONGODB_URI in .env
- Verify network connectivity

### File Upload Fails
- Check uploads directory permissions
- Verify MAX_FILE_SIZE setting
- Ensure file type is allowed

### Authentication Issues
- Verify JWT_SECRET is set
- Check token expiration
- Ensure admin account is active

## 📚 Additional Resources

- [Express.js Documentation](https://expressjs.com/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [JWT Documentation](https://jwt.io/)
- [Ethers.js Documentation](https://docs.ethers.org/)

## 📄 License

MIT License - See LICENSE file for details

## 🤝 Support

For issues and questions:
- GitHub Issues: [Project Issues](https://github.com/domambia/dr-birdy-books-protocol/issues)
- Documentation: [Full Documentation](../docs/)

---

Built with ❤️ for the Dr. Birdy Books Protocol

