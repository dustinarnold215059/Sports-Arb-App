#!/usr/bin/env node

/**
 * Database Setup Script
 * Sets up PostgreSQL database for development and production
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function log(message) {
  console.log(`🔧 ${message}`);
}

function error(message) {
  console.error(`❌ ${message}`);
}

function success(message) {
  console.log(`✅ ${message}`);
}

async function setupDatabase() {
  log('Setting up Sports-Arb database...');

  try {
    // Check if .env.local exists
    const envPath = path.join(process.cwd(), '.env.local');
    if (!fs.existsSync(envPath)) {
      error('.env.local file not found!');
      log('Please create .env.local with DATABASE_URL');
      process.exit(1);
    }

    // Read .env.local to check if DATABASE_URL exists
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    if (!envContent.includes('DATABASE_URL')) {
      log('Adding DATABASE_URL to .env.local...');
      
      const databaseUrl = process.env.DATABASE_URL || 'postgresql://username:password@localhost:5432/sportsarb_dev';
      
      fs.appendFileSync(envPath, `\n# Database Configuration\nDATABASE_URL="${databaseUrl}"\n`);
      success('DATABASE_URL added to .env.local');
    }

    // Generate Prisma client
    log('Generating Prisma client...');
    execSync('npx prisma generate', { stdio: 'inherit' });
    success('Prisma client generated');

    // Check if we can connect to database
    log('Testing database connection...');
    
    try {
      execSync('npx prisma db push --skip-generate', { stdio: 'pipe' });
      success('Database connection successful');
      
      // Run initial migration
      log('Creating database schema...');
      execSync('npx prisma db push --skip-generate', { stdio: 'inherit' });
      success('Database schema created');
      
    } catch (dbError) {
      error('Database connection failed!');
      log('');
      log('📋 Database Setup Instructions:');
      log('');
      log('1. Install PostgreSQL:');
      log('   - Windows: Download from https://www.postgresql.org/download/');
      log('   - macOS: brew install postgresql');
      log('   - Linux: sudo apt-get install postgresql');
      log('');
      log('2. Create database:');
      log('   createdb sportsarb_dev');
      log('');
      log('3. Update DATABASE_URL in .env.local:');
      log('   DATABASE_URL="postgresql://username:password@localhost:5432/sportsarb_dev"');
      log('');
      log('4. Re-run this setup script');
      log('');
      
      // For development, offer to use SQLite as fallback
      if (process.env.NODE_ENV !== 'production') {
        log('💡 Alternative: Use SQLite for development');
        log('   1. Change datasource in prisma/schema.prisma:');
        log('      provider = "sqlite"');
        log('      url = "file:./dev.db"');
        log('   2. Update DATABASE_URL in .env.local:');
        log('      DATABASE_URL="file:./dev.db"');
      }
      
      process.exit(1);
    }

    success('Database setup completed successfully!');
    log('');
    log('🎯 Next steps:');
    log('1. Run: npm run db:seed (to add default data)');
    log('2. Run: npm run dev (to start development server)');
    
  } catch (err) {
    error(`Setup failed: ${err.message}`);
    process.exit(1);
  }
}

// Handle different environments
const args = process.argv.slice(2);
const isProduction = args.includes('--production');
const isDevelopment = args.includes('--development') || process.env.NODE_ENV === 'development';

if (isProduction) {
  log('Production database setup');
  log('Make sure DATABASE_URL is set in your production environment');
} else {
  log('Development database setup');
}

setupDatabase().catch(console.error);