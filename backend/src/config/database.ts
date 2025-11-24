import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { initGridFS } from '../services/gridfsService';

// Try multiple paths for .env file (works from both root and backend directory)
const envPaths = [
  path.join(process.cwd(), '.env'), // From project root when running from root
  path.join(process.cwd(), 'backend', '.env'), // From backend directory when running from backend
  path.join(__dirname, '../../.env'), // Relative to this file (backend/src/config -> backend/.env)
];

let envLoaded = false;
for (const envPath of envPaths) {
  try {
    const result = dotenv.config({ path: envPath });
    if (!result.error && process.env.MONGODB_URI) {
      console.log(`✅ Loaded .env from: ${envPath}`);
      envLoaded = true;
      break;
    }
  } catch (error) {
    // Continue to next path
  }
}

if (!envLoaded) {
  // Try default location as fallback
  dotenv.config();
  if (!process.env.MONGODB_URI) {
    console.warn('⚠️  Could not find .env file with MONGODB_URI');
    console.warn(`   Tried paths: ${envPaths.join(', ')}`);
  }
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dr-birdy-books';

// Log the connection URI (without password) for debugging
const uriForLogging = MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
console.log(`🔌 Connecting to MongoDB: ${uriForLogging}`);

export const connectDatabase = async (): Promise<void> => {
  try {
    if (!process.env.MONGODB_URI) {
      console.warn('⚠️  WARNING: MONGODB_URI not found in environment variables, using default localhost');
    }
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected successfully');
    console.log(`📊 Database: ${mongoose.connection.name}`);
    console.log(`🌐 Host: ${mongoose.connection.host}:${mongoose.connection.port}`);
    
    // Initialize GridFS after connection
    initGridFS();
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Handle connection events
mongoose.connection.on('connected', () => {
  console.log('🔗 Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('🔌 Mongoose disconnected from MongoDB');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('🛑 MongoDB connection closed due to app termination');
  process.exit(0);
});


