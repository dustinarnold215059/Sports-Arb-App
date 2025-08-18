'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface DemoContextType {
  isDemoMode: boolean;
  setDemoMode: (demo: boolean) => void;
  fakeBets: any[];
  fakeArbitrageOpportunities: any[];
  fakePortfolioStats: any;
  fakePlatformStats: any;
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

// Fake betting data for demo mode
const FAKE_BETS = [
  {
    id: 'demo_1',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    game: "Lakers vs Warriors",
    sport: "Basketball",
    team1: "Lakers",
    team2: "Warriors", 
    betType: "arbitrage",
    bookmaker: "DraftKings",
    selection: "Lakers +5.5",
    odds: -110,
    stake: 100,
    potentialPayout: 190.91,
    status: "won",
    actualPayout: 190.91,
    profit: 90.91,
    isArbitrage: true,
    arbitragePartner: "FanDuel"
  },
  {
    id: 'demo_2', 
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
    game: "Chiefs vs Bills",
    sport: "Football",
    team1: "Chiefs",
    team2: "Bills",
    betType: "normal",
    bookmaker: "FanDuel", 
    selection: "Over 47.5",
    odds: -105,
    stake: 75,
    potentialPayout: 146.43,
    status: "lost",
    actualPayout: 0,
    profit: -75,
    isArbitrage: false
  },
  {
    id: 'demo_3',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    game: "Celtics vs Heat", 
    sport: "Basketball",
    team1: "Celtics",
    team2: "Heat",
    betType: "arbitrage",
    bookmaker: "BetMGM",
    selection: "Celtics -3",
    odds: +110,
    stake: 50,
    potentialPayout: 105,
    status: "won", 
    actualPayout: 105,
    profit: 55,
    isArbitrage: true,
    arbitragePartner: "Caesars"
  },
  {
    id: 'demo_4',
    timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000), // 2 days ago
    game: "Yankees vs Red Sox",
    sport: "Baseball", 
    team1: "Yankees",
    team2: "Red Sox",
    betType: "plus_ev",
    bookmaker: "Caesars",
    selection: "Yankees ML",
    odds: +150,
    stake: 25,
    potentialPayout: 62.5,
    status: "pending",
    isArbitrage: false
  },
  {
    id: 'demo_5',
    timestamp: new Date(Date.now() - 72 * 60 * 60 * 1000), // 3 days ago
    game: "Dodgers vs Padres",
    sport: "Baseball",
    team1: "Dodgers", 
    team2: "Padres",
    betType: "arbitrage",
    bookmaker: "PointsBet",
    selection: "Under 8.5",
    odds: -115,
    stake: 60,
    potentialPayout: 112.17,
    status: "won",
    actualPayout: 112.17,
    profit: 52.17,
    isArbitrage: true,
    arbitragePartner: "DraftKings"
  }
];

const FAKE_ARBITRAGE_OPPORTUNITIES = [
  {
    id: 'arb_1',
    game: "Cowboys vs Eagles",
    sport: "Football",
    team1: "Cowboys",
    team2: "Eagles",
    betType: "moneyline",
    profitMargin: 4.2,
    guaranteedProfit: 42.50,
    totalStake: 1000,
    bets: [
      {
        bookmaker: "DraftKings",
        selection: "Cowboys ML",
        odds: +165,
        stake: 380,
        potentialPayout: 1007
      },
      {
        bookmaker: "FanDuel", 
        selection: "Eagles ML",
        odds: -145,
        stake: 620,
        potentialPayout: 1048.28
      }
    ],
    gameTime: new Date(Date.now() + 3 * 60 * 60 * 1000), // 3 hours from now
    timeRemaining: "2h 47m",
    confidence: "High"
  },
  {
    id: 'arb_2',
    game: "Nets vs Knicks", 
    sport: "Basketball",
    team1: "Nets",
    team2: "Knicks",
    betType: "spread",
    profitMargin: 3.8,
    guaranteedProfit: 38.20,
    totalStake: 1000,
    bets: [
      {
        bookmaker: "BetMGM",
        selection: "Nets +7.5",
        odds: -108,
        stake: 520,
        potentialPayout: 1001.85
      },
      {
        bookmaker: "Caesars",
        selection: "Knicks -7.5", 
        odds: +102,
        stake: 480,
        potentialPayout: 1009.60
      }
    ],
    gameTime: new Date(Date.now() + 5 * 60 * 60 * 1000), // 5 hours from now
    timeRemaining: "4h 23m",
    confidence: "Medium"
  },
  {
    id: 'arb_3',
    game: "Rangers vs Islanders",
    sport: "Hockey", 
    team1: "Rangers",
    team2: "Islanders",
    betType: "total",
    profitMargin: 2.9,
    guaranteedProfit: 29.10,
    totalStake: 1000,
    bets: [
      {
        bookmaker: "PointsBet",
        selection: "Over 6.5",
        odds: +105,
        stake: 488,
        potentialPayout: 1000.40
      },
      {
        bookmaker: "WynnBET",
        selection: "Under 6.5",
        odds: -102,
        stake: 512,
        potentialPayout: 1014.12
      }
    ],
    gameTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
    timeRemaining: "1h 34m", 
    confidence: "High"
  }
];

const FAKE_PORTFOLIO_STATS = {
  totalStaked: 310,
  totalReturned: 408.08,
  netProfit: 123.08,
  totalBets: 5,
  wonBets: 3,
  lostBets: 1,
  pendingBets: 1,
  pushedBets: 0,
  winRate: 75.0,
  profitRate: 39.7,
  arbitrageGroups: 3,
  successfulArbitrages: 3,
  failedArbitrages: 0,
  arbitrageSuccessRate: 100.0,
  averageArbitrageProfit: 66.03,
  drawRiskBets: 0,
  highRiskBets: 0,
  lastBetDate: new Date(Date.now() - 2 * 60 * 60 * 1000),
  firstBetDate: new Date(Date.now() - 72 * 60 * 60 * 1000),
  activeDays: 3,
  averageBetsPerDay: 1.7,
  bookmakerStats: {
    "DraftKings": { bets: 2, staked: 160, returned: 190.91, profit: 90.91, winRate: 50.0 },
    "FanDuel": { bets: 1, staked: 75, returned: 0, profit: -75, winRate: 0.0 },
    "BetMGM": { bets: 1, staked: 50, returned: 105, profit: 55, winRate: 100.0 },
    "Caesars": { bets: 1, staked: 25, returned: 0, profit: 0, winRate: 0.0 }
  },
  betTypeStats: {
    "arbitrage": { bets: 3, staked: 210, returned: 408.08, profit: 198.08, winRate: 100.0 },
    "normal": { bets: 1, staked: 75, returned: 0, profit: -75, winRate: 0.0 },
    "plus_ev": { bets: 1, staked: 25, returned: 0, profit: 0, winRate: 0.0 },
    "middle": { bets: 0, staked: 0, returned: 0, profit: 0, winRate: 0.0 }
  },
  sportStats: {
    "Basketball": { bets: 2, staked: 150, returned: 295.91, profit: 145.91, winRate: 100.0 },
    "Football": { bets: 1, staked: 75, returned: 0, profit: -75, winRate: 0.0 },
    "Baseball": { bets: 2, staked: 85, returned: 112.17, profit: 52.17, winRate: 50.0 }
  }
};

const FAKE_PLATFORM_STATS = {
  activeUsers: 1247,
  totalUsers: 2839,
  premiumUsers: 892,
  totalProfit: 127598.32,
  totalBets: 8931,
  totalApiRequests: 134570,
  avgSuccessRate: 71.4
};

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [isDemoMode, setIsDemoMode] = useState(false);

  const setDemoMode = (demo: boolean) => {
    setIsDemoMode(demo);
    if (typeof window !== 'undefined') {
      localStorage.setItem('demoMode', demo.toString());
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedDemoMode = localStorage.getItem('demoMode');
      if (savedDemoMode) {
        setIsDemoMode(savedDemoMode === 'true');
      }
    }
  }, []);

  const value = {
    isDemoMode,
    setDemoMode,
    fakeBets: FAKE_BETS,
    fakeArbitrageOpportunities: FAKE_ARBITRAGE_OPPORTUNITIES,
    fakePortfolioStats: FAKE_PORTFOLIO_STATS,
    fakePlatformStats: FAKE_PLATFORM_STATS
  };

  return (
    <DemoContext.Provider value={value}>
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo() {
  const context = useContext(DemoContext);
  if (context === undefined) {
    throw new Error('useDemo must be used within a DemoProvider');
  }
  return context;
}