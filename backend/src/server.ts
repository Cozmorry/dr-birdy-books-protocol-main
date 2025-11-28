import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { connectDatabase } from './config/database';
import { initializeBlockchain } from './config/blockchain';
import Admin from './models/Admin';

// Load environment variables from backend directory
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import routes
import authRoutes from './routes/authRoutes';
import blogRoutes from './routes/blogRoutes';
import fileRoutes from './routes/fileRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import feedbackRoutes from './routes/feedbackRoutes';

const app: Application = express();
const PORT = parseInt(process.env.PORT || '5001', 10);

// Security middleware
app.use(helmet());

// CORS configuration
const allowedOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : ['http://localhost:3000', 'http://localhost:3001'];

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Rate limiting - General API routes
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later.',
});

// More lenient rate limiter for feedback routes (admin dashboard needs frequent updates)
const feedbackLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: 'Too many feedback requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// More lenient rate limiter for files and blog routes (user-facing content)
const contentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120, // 120 requests per minute (more lenient for content browsing)
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiters based on route
app.use('/api/', (req, res, next) => {
  const path = req.path;
  
  if (path.startsWith('/feedback')) {
    return feedbackLimiter(req, res, next);
  }
  
  // Files and blog routes get more lenient rate limiting
  if (path.startsWith('/files') || path.startsWith('/blog')) {
    return contentLimiter(req, res, next);
  }
  
  // All other routes use general limiter
  return limiter(req, res, next);
});

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware (but skip for file downloads to enable streaming)
app.use(compression({
  filter: (req: express.Request, res: express.Response) => {
    // Don't compress file downloads - they need to stream
    if (req.path?.includes('/files/') && req.path?.includes('/download')) {
      return false;
    }
    // Use default compression filter for other requests
    return compression.filter(req, res);
  }
}));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Files are stored in MongoDB GridFS, no static file serving needed

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/blog', blogRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/feedback', feedbackRoutes);

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Dr. Birdy Books API is running',
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Initialize default admin if none exists
const initializeDefaultAdmin = async () => {
  try {
    const adminCount = await Admin.countDocuments();
    
    if (adminCount === 0) {
      const defaultAdmin = await Admin.create({
        username: process.env.ADMIN_USERNAME || 'admin',
        email: process.env.ADMIN_EMAIL || 'admin@drbirdybooks.com',
        password: process.env.ADMIN_PASSWORD || 'changeme123',
        role: 'super_admin',
      });
      
      console.log('✅ Default admin created');
      console.log(`   Username: ${defaultAdmin.username}`);
      console.log(`   Email: ${defaultAdmin.email}`);
      console.log('   ⚠️  IMPORTANT: Change the default password immediately!');
    }
  } catch (error) {
    console.error('❌ Failed to create default admin:', error);
  }
};

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDatabase();
    
    // Initialize blockchain provider
    initializeBlockchain();
    
    // Initialize default admin
    await initializeDefaultAdmin();
    
    // Start listening
    app.listen(PORT, 'localhost', () => {
      console.log('');
      console.log('🚀 ═══════════════════════════════════════════════════════');
      console.log(`   Dr. Birdy Books Backend API`);
      console.log('   ═══════════════════════════════════════════════════════');
      console.log(`   🌐 Server running on port ${PORT}`);
      console.log(`   📡 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`   🔗 API URL: http://localhost:${PORT}/api`);
      console.log(`   💚 Health check: http://localhost:${PORT}/api/health`);
      console.log('   ═══════════════════════════════════════════════════════');
      console.log('');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  console.error('❌ Unhandled Promise Rejection:', err);
  process.exit(1);
});

// Start the server
startServer();

export default app;


