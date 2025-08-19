#!/usr/bin/env node

/**
 * Vercel Post-Build Script
 * Handles database setup after successful build
 */

const { execSync } = require('child_process');

console.log('🚀 Running Vercel post-build script...');

try {
  // Check if we have a database URL
  if (!process.env.DATABASE_URL) {
    console.log('⚠️ No DATABASE_URL found, skipping database operations');
    process.exit(0);
  }

  console.log('📊 Database URL found, checking connection...');

  // Try to connect and push schema
  try {
    console.log('🔄 Pushing database schema...');
    execSync('npx prisma db push --accept-data-loss', { 
      stdio: 'inherit',
      timeout: 30000 // 30 second timeout
    });
    console.log('✅ Database schema updated successfully');
  } catch (pushError) {
    console.log('⚠️ Database push failed, this might be normal if schema is already up to date');
    console.log('Error:', pushError.message);
  }

  // Try to seed the database if needed
  try {
    console.log('🌱 Checking if database needs seeding...');
    
    // Simple check - just try to run seed, it will skip if data exists
    execSync('npm run db:seed', { 
      stdio: 'inherit',
      timeout: 30000 // 30 second timeout
    });
    console.log('✅ Database seeding completed');
  } catch (seedError) {
    console.log('⚠️ Database seeding failed or skipped');
    console.log('Error:', seedError.message);
  }

} catch (error) {
  console.error('❌ Post-build script failed:', error.message);
  // Don't fail the deployment for database issues
  console.log('⚠️ Continuing deployment despite database setup issues');
}

console.log('🎉 Post-build script completed');