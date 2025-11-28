/**
 * Script to update admin password in MongoDB
 * Usage: node scripts/update-admin-password.js <username> <newPassword>
 * 
 * Example: node scripts/update-admin-password.js admin newpassword123
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('../dist/models/Admin').default || require('../src/models/Admin').default;

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dr-birdy-books';

async function updateAdminPassword() {
  try {
    const username = process.argv[2];
    const newPassword = process.argv[3];

    if (!username || !newPassword) {
      console.error('❌ Usage: node scripts/update-admin-password.js <username> <newPassword>');
      process.exit(1);
    }

    if (newPassword.length < 6) {
      console.error('❌ Password must be at least 6 characters long');
      process.exit(1);
    }

    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find admin
    const admin = await Admin.findOne({ username });
    
    if (!admin) {
      console.error(`❌ Admin with username "${username}" not found`);
      await mongoose.disconnect();
      process.exit(1);
    }

    // Update password (will be hashed automatically by the pre-save hook)
    admin.password = newPassword;
    await admin.save();

    console.log('✅ Password updated successfully!');
    console.log(`   Username: ${admin.username}`);
    console.log(`   Email: ${admin.email}`);
    
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

updateAdminPassword();

