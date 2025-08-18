#!/usr/bin/env node

/**
 * Database Seeding Script
 * Seeds the database with initial data including admin user and demo data
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

function log(message) {
  console.log(`🌱 ${message}`);
}

function error(message) {
  console.error(`❌ ${message}`);
}

function success(message) {
  console.log(`✅ ${message}`);
}

async function seedDatabase() {
  try {
    log('Starting database seeding...');

    // Seed admin user
    await seedAdminUser();
    
    // Seed demo users (development only)
    if (process.env.NODE_ENV === 'development') {
      await seedDemoUsers();
    }
    
    // Seed app settings
    await seedAppSettings();
    
    // Seed sample data if requested
    const args = process.argv.slice(2);
    if (args.includes('--sample-data')) {
      await seedSampleData();
    }

    success('Database seeding completed successfully!');

  } catch (err) {
    error(`Seeding failed: ${err.message}`);
    console.error(err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function seedAdminUser() {
  try {
    // Check if admin user already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { username: 'admin' }
    });

    if (existingAdmin) {
      log('Admin user already exists, skipping...');
      return;
    }

    // Create admin user
    const passwordHash = await bcrypt.hash('Admin123!', 12);
    
    const adminUser = await prisma.user.create({
      data: {
        username: 'admin',
        email: 'admin@sportsarb.com',
        passwordHash,
        role: 'admin',
        isActive: true,
        emailVerified: true
      }
    });

    // Create admin portfolio
    await prisma.portfolio.create({
      data: {
        userId: adminUser.id
      }
    });

    success('Admin user created (username: admin, password: Admin123!)');

  } catch (err) {
    error(`Failed to seed admin user: ${err.message}`);
    throw err;
  }
}

async function seedDemoUsers() {
  try {
    log('Creating demo users...');

    const demoUsers = [
      {
        username: 'demo_basic',
        email: 'demo.basic@example.com',
        password: 'Demo123!',
        role: 'basic'
      },
      {
        username: 'demo_premium',
        email: 'demo.premium@example.com',
        password: 'Demo123!',
        role: 'premium'
      },
      {
        username: 'demo_pro',
        email: 'demo.pro@example.com',
        password: 'Demo123!',
        role: 'pro'
      }
    ];

    for (const demoUser of demoUsers) {
      try {
        // Check if user already exists
        const exists = await prisma.user.findUnique({
          where: { username: demoUser.username }
        });

        if (exists) {
          log(`Demo user ${demoUser.username} already exists, skipping...`);
          continue;
        }

        const passwordHash = await bcrypt.hash(demoUser.password, 12);
        
        const user = await prisma.user.create({
          data: {
            username: demoUser.username,
            email: demoUser.email,
            passwordHash,
            role: demoUser.role,
            isActive: true,
            emailVerified: true
          }
        });

        // Create portfolio
        await prisma.portfolio.create({
          data: {
            userId: user.id
          }
        });

        success(`Demo user created: ${demoUser.username}`);

      } catch (userErr) {
        error(`Failed to create demo user ${demoUser.username}: ${userErr.message}`);
      }
    }

  } catch (err) {
    error(`Failed to seed demo users: ${err.message}`);
    throw err;
  }
}

async function seedAppSettings() {
  try {
    log('Seeding app settings...');

    const settings = [
      {
        key: 'app_name',
        value: 'Sports Arbitrage Pro',
        description: 'Application name displayed in UI',
        isPublic: true
      },
      {
        key: 'app_version',
        value: '2.0.0',
        description: 'Current application version',
        isPublic: true
      },
      {
        key: 'maintenance_mode',
        value: 'false',
        description: 'Enable maintenance mode to block user access',
        isPublic: false
      },
      {
        key: 'max_api_requests_per_hour',
        value: '1000',
        description: 'Maximum API requests per hour per user',
        isPublic: false
      },
      {
        key: 'default_odds_refresh_interval',
        value: '300',
        description: 'Default odds refresh interval in seconds',
        isPublic: true
      },
      {
        key: 'enable_registration',
        value: 'true',
        description: 'Allow new user registrations',
        isPublic: true
      },
      {
        key: 'min_arbitrage_percentage',
        value: '1.0',
        description: 'Minimum arbitrage percentage to display',
        isPublic: true
      },
      {
        key: 'max_bet_amount',
        value: '10000.00',
        description: 'Maximum bet amount allowed',
        isPublic: false
      }
    ];

    for (const setting of settings) {
      await prisma.appSettings.upsert({
        where: { key: setting.key },
        update: {
          value: setting.value,
          description: setting.description,
          isPublic: setting.isPublic,
          updatedAt: new Date()
        },
        create: setting
      });
    }

    success(`${settings.length} app settings seeded`);

  } catch (err) {
    error(`Failed to seed app settings: ${err.message}`);
    throw err;
  }
}

async function seedSampleData() {
  try {
    log('Seeding sample data...');

    // Get demo users
    const demoUsers = await prisma.user.findMany({
      where: {
        username: { startsWith: 'demo_' }
      }
    });

    if (demoUsers.length === 0) {
      log('No demo users found, skipping sample data...');
      return;
    }

    // Create sample bets for demo users
    for (const user of demoUsers) {
      await createSampleBets(user);
    }

    success('Sample data seeded');

  } catch (err) {
    error(`Failed to seed sample data: ${err.message}`);
    throw err;
  }
}

async function createSampleBets(user) {
  const sampleBets = [
    {
      game: 'Lakers vs Warriors',
      bookmaker: 'DraftKings',
      betType: 'Moneyline',
      odds: '+150',
      stake: 100.00,
      potentialWin: 250.00,
      status: 'won',
      profit: 150.00,
      sport: 'basketball',
      league: 'NBA',
      homeTeam: 'Lakers',
      awayTeam: 'Warriors',
      arbitrageGroup: 'ARB001'
    },
    {
      game: 'Chiefs vs Bills',
      bookmaker: 'FanDuel',
      betType: 'Spread',
      odds: '-110',
      stake: 50.00,
      potentialWin: 95.45,
      status: 'pending',
      sport: 'americanfootball',
      league: 'NFL',
      homeTeam: 'Chiefs',
      awayTeam: 'Bills',
      arbitrageGroup: 'ARB002'
    }
  ];

  for (const betData of sampleBets) {
    try {
      await prisma.bet.create({
        data: {
          ...betData,
          userId: user.id,
          timestamp: new Date(),
          commenceTime: new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow
        }
      });
    } catch (betErr) {
      error(`Failed to create sample bet for ${user.username}: ${betErr.message}`);
    }
  }

  // Update portfolio stats
  const totalStaked = sampleBets.reduce((sum, bet) => sum + bet.stake, 0);
  const totalProfit = sampleBets.reduce((sum, bet) => sum + (bet.profit || 0), 0);
  const totalBets = sampleBets.length;
  const winningBets = sampleBets.filter(bet => bet.status === 'won').length;
  const pendingBets = sampleBets.filter(bet => bet.status === 'pending').length;

  await prisma.portfolio.update({
    where: { userId: user.id },
    data: {
      totalStaked,
      netProfit: totalProfit,
      totalBets,
      winningBets,
      pendingBets,
      winRate: totalBets > 0 ? (winningBets / totalBets) * 100 : 0,
      profitRate: totalStaked > 0 ? (totalProfit / totalStaked) * 100 : 0,
      lastUpdated: new Date()
    }
  });

  log(`Sample bets created for ${user.username}`);
}

// Run the seeding
seedDatabase().catch(console.error);