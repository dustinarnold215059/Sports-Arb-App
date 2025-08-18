import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create admin user
  const adminHash = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@test.com',
      passwordHash: adminHash,
      role: 'admin',
      subscriptionStatus: 'active',
      subscriptionExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      emailVerified: true,
      isActive: true,
      apiRequestsLimit: 10000
    }
  });

  // Create sample users
  const userHash = await bcrypt.hash('user123', 10);
  
  const premiumUser = await prisma.user.upsert({
    where: { email: 'john@example.com' },
    update: {},
    create: {
      username: 'john_trader',
      email: 'john@example.com',
      passwordHash: userHash,
      role: 'premium',
      subscriptionStatus: 'active',
      subscriptionExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      emailVerified: true,
      isActive: true,
      apiRequestsLimit: 1000
    }
  });

  const basicUser = await prisma.user.upsert({
    where: { email: 'sarah@example.com' },
    update: {},
    create: {
      username: 'sarah_sports',
      email: 'sarah@example.com',
      passwordHash: userHash,
      role: 'basic',
      subscriptionStatus: 'active',
      subscriptionExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      emailVerified: true,
      isActive: true,
      apiRequestsLimit: 100
    }
  });

  const proUser = await prisma.user.upsert({
    where: { email: 'mike@example.com' },
    update: {},
    create: {
      username: 'mike_pro',
      email: 'mike@example.com',
      passwordHash: userHash,
      role: 'pro',
      subscriptionStatus: 'active',
      subscriptionExpiry: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      emailVerified: true,
      isActive: true,
      apiRequestsLimit: 5000
    }
  });

  // Create sample bets for premium user
  const sampleBets = [
    {
      userId: premiumUser.id,
      game: 'Chiefs vs Bills',
      bookmaker: 'DraftKings',
      betType: 'moneyline',
      odds: '-110',
      stake: 100.00,
      potentialWin: 190.91,
      status: 'won',
      profit: 90.91,
      sport: 'NFL',
      homeTeam: 'Kansas City Chiefs',
      awayTeam: 'Buffalo Bills',
      arbitrageGroup: 'arb_001'
    },
    {
      userId: premiumUser.id,
      game: 'Lakers vs Warriors',
      bookmaker: 'BetMGM',
      betType: 'moneyline',
      odds: '+120',
      stake: 50.00,
      potentialWin: 110.00,
      status: 'lost',
      profit: -50.00,
      sport: 'NBA',
      homeTeam: 'Los Angeles Lakers',
      awayTeam: 'Golden State Warriors'
    },
    {
      userId: premiumUser.id,
      game: 'Cowboys vs Eagles',
      bookmaker: 'FanDuel',
      betType: 'spread',
      odds: '-105',
      stake: 75.00,
      potentialWin: 146.43,
      status: 'won',
      profit: 71.43,
      sport: 'NFL',
      homeTeam: 'Dallas Cowboys',
      awayTeam: 'Philadelphia Eagles',
      arbitrageGroup: 'arb_002'
    }
  ];

  for (const betData of sampleBets) {
    await prisma.bet.create({
      data: betData
    });
  }

  // Create sample bets for basic user
  await prisma.bet.create({
    data: {
      userId: basicUser.id,
      game: 'Heat vs Celtics',
      bookmaker: 'Caesars',
      betType: 'moneyline',
      odds: '-150',
      stake: 25.00,
      potentialWin: 41.67,
      status: 'lost',
      profit: -25.00,
      sport: 'NBA',
      homeTeam: 'Miami Heat',
      awayTeam: 'Boston Celtics'
    }
  });

  // Create portfolios
  await prisma.portfolio.create({
    data: {
      userId: premiumUser.id,
      netProfit: 111.34, // 90.91 + 71.43 - 50.00
      totalStaked: 225.00,
      totalBets: 3,
      winningBets: 2,
      losingBets: 1,
      pendingBets: 0,
      winRate: 0.6667,
      profitRate: 0.4948, // 111.34 / 225.00
      arbitrageGroups: 2,
      arbitrageSuccessRate: 1.0000
    }
  });

  await prisma.portfolio.create({
    data: {
      userId: basicUser.id,
      netProfit: -25.00,
      totalStaked: 25.00,
      totalBets: 1,
      winningBets: 0,
      losingBets: 1,
      pendingBets: 0,
      winRate: 0.0000,
      profitRate: -1.0000,
      arbitrageGroups: 0,
      arbitrageSuccessRate: 0.0000
    }
  });

  await prisma.portfolio.create({
    data: {
      userId: proUser.id,
      netProfit: 0.00,
      totalStaked: 0.00,
      totalBets: 0,
      winningBets: 0,
      losingBets: 0,
      pendingBets: 0,
      winRate: 0.0000,
      profitRate: 0.0000,
      arbitrageGroups: 0,
      arbitrageSuccessRate: 0.0000
    }
  });

  console.log('✅ Database seeded successfully!');
  console.log('📊 Created:');
  console.log(`  - Admin user: admin@test.com (password: admin123)`);
  console.log(`  - Premium user: john@example.com (password: user123)`);
  console.log(`  - Basic user: sarah@example.com (password: user123)`);
  console.log(`  - Pro user: mike@example.com (password: user123)`);
  console.log(`  - ${sampleBets.length + 1} sample bets`);
  console.log(`  - 3 portfolios with real statistics`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seeding failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });