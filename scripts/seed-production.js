const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function seedProduction() {
  try {
    console.log('🌱 Starting production database seeding...');

    // Check if admin user already exists
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'admin' }
    });

    if (existingAdmin) {
      console.log('✅ Admin user already exists, skipping seeding');
      return;
    }

    // Create default admin user
    const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'admin123!@#';
    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    const adminUser = await prisma.user.create({
      data: {
        email: process.env.ADMIN_EMAIL || 'admin@sportsarb.com',
        username: 'admin',
        passwordHash: hashedPassword,
        role: 'admin',
        isActive: true,
        isLocked: false,
        failedLoginAttempts: 0
      }
    });

    console.log(`✅ Created admin user: ${adminUser.email}`);

    // Create default application settings
    const defaultSettings = [
      {
        key: 'site_name',
        value: 'Sports Arbitrage Platform',
        description: 'Name of the website'
      },
      {
        key: 'maintenance_mode',
        value: 'false',
        description: 'Enable/disable maintenance mode'
      },
      {
        key: 'max_users',
        value: '10000',
        description: 'Maximum number of registered users'
      },
      {
        key: 'api_rate_limit',
        value: '100',
        description: 'API requests per minute per user'
      },
      {
        key: 'backup_retention_days',
        value: '30',
        description: 'Number of days to keep database backups'
      }
    ];

    for (const setting of defaultSettings) {
      await prisma.appSettings.upsert({
        where: { key: setting.key },
        update: {},
        create: setting
      });
    }

    console.log('✅ Created default application settings');

    // Create initial system metrics entry
    await prisma.systemMetrics.create({
      data: {
        metricName: 'system_initialized',
        metricValue: 1,
        metadata: {
          version: '1.0.0',
          environment: process.env.NODE_ENV || 'production',
          timestamp: new Date().toISOString()
        }
      }
    });

    console.log('✅ Created initial system metrics');

    console.log('🎉 Production seeding completed successfully');

  } catch (error) {
    console.error('❌ Production seeding failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run seeding if called directly
if (require.main === module) {
  seedProduction()
    .then(() => {
      console.log('Database seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Database seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedProduction };