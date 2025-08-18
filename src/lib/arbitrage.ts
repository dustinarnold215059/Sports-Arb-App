// Supported sportsbooks
export const SPORTSBOOKS = {
  DRAFTKINGS: 'DraftKings',
  BETMGM: 'BetMGM',
  FANDUEL: 'FanDuel',
  CAESARS: 'Caesars',
  POINTSBET: 'PointsBet', // Legacy - now Fanatics
  BETRIVERS: 'BetRivers',
  FOURWINDS: 'Four Winds Casino',
  ESPNBET: 'ESPN BET',
  FANATICS: 'Fanatics Sportsbook',
  EAGLE: 'Eagle Casino',
  FIREKEEPERS: 'FireKeepers',
  BETPARX: 'BetPARX',
  GOLDENNUGGET: 'Golden Nugget'
} as const;

export type SportsbookKey = keyof typeof SPORTSBOOKS;

// Types for arbitrage calculations
export interface BookmakerOdds {
  bookmaker: string;
  team: string;
  odds: number; // American odds (e.g., +150, -180)
  impliedProbability: number;
}

export interface MultiBookmakerOdds {
  [key: string]: { // bookmaker name
    team1: number;
    team2: number;
  };
}

export interface ArbitrageOpportunity {
  game: string;
  team1?: string;
  team2?: string;
  totalStake: number;
  guaranteedProfit: number;
  profitMargin: number;
  isArbitrage: boolean;
  totalBookmakers: number;
  betType?: string; // 'moneyline', 'spread', 'total', 'outright'
  hasDrawRisk?: boolean;
  riskWarning?: string | null;
  bets: {
    bookmaker: string;
    team: string;
    odds: number;
    stake: number;
    potentialPayout: number;
  }[];
}

// Convert American odds to decimal odds
export function americanToDecimal(americanOdds: number): number {
  if (americanOdds > 0) {
    return (americanOdds / 100) + 1;
  } else {
    return (100 / Math.abs(americanOdds)) + 1;
  }
}

// Convert American odds to implied probability
export function americanToImpliedProbability(americanOdds: number): number {
  if (americanOdds > 0) {
    return 100 / (americanOdds + 100);
  } else {
    return Math.abs(americanOdds) / (Math.abs(americanOdds) + 100);
  }
}

// Calculate optimal stake distribution for arbitrage
export function calculateOptimalStakes(
  odds1: number, // American odds
  odds2: number, // American odds
  totalStake: number
): { stake1: number; stake2: number } {
  const decimal1 = americanToDecimal(odds1);
  const decimal2 = americanToDecimal(odds2);
  
  const stake1 = totalStake / (1 + (decimal1 / decimal2));
  const stake2 = totalStake - stake1;
  
  return { stake1, stake2 };
}

// Find arbitrage opportunities between two bookmakers
export function findArbitrageOpportunity(
  draftKingsOdds: { team1: number; team2: number },
  betMGMOdds: { team1: number; team2: number },
  team1Name: string,
  team2Name: string,
  gameName: string,
  totalStake: number = 1000
): ArbitrageOpportunity {
  // Calculate implied probabilities
  const dkTeam1Prob = americanToImpliedProbability(draftKingsOdds.team1);
  const dkTeam2Prob = americanToImpliedProbability(draftKingsOdds.team2);
  const mgmTeam1Prob = americanToImpliedProbability(betMGMOdds.team1);
  const mgmTeam2Prob = americanToImpliedProbability(betMGMOdds.team2);

  // Find the best odds for each outcome
  const bestTeam1 = draftKingsOdds.team1 > betMGMOdds.team1 
    ? { odds: draftKingsOdds.team1, bookmaker: 'DraftKings' }
    : { odds: betMGMOdds.team1, bookmaker: 'BetMGM' };
    
  const bestTeam2 = draftKingsOdds.team2 > betMGMOdds.team2
    ? { odds: draftKingsOdds.team2, bookmaker: 'DraftKings' }
    : { odds: betMGMOdds.team2, bookmaker: 'BetMGM' };

  // Calculate total implied probability using best odds
  const bestTeam1Prob = americanToImpliedProbability(bestTeam1.odds);
  const bestTeam2Prob = americanToImpliedProbability(bestTeam2.odds);
  const totalImpliedProb = bestTeam1Prob + bestTeam2Prob;

  // Check if arbitrage exists (total implied probability < 1)
  const isArbitrage = totalImpliedProb < 1;
  const profitMargin = isArbitrage ? (1 - totalImpliedProb) * 100 : 0;

  // Calculate optimal stakes
  const stakes = calculateOptimalStakes(bestTeam1.odds, bestTeam2.odds, totalStake);
  
  // Calculate payouts
  const team1Payout = stakes.stake1 * americanToDecimal(bestTeam1.odds);
  const team2Payout = stakes.stake2 * americanToDecimal(bestTeam2.odds);
  
  // Calculate guaranteed profit
  const guaranteedProfit = Math.min(team1Payout, team2Payout) - totalStake;

  return {
    game: gameName,
    team1: team1Name,
    team2: team2Name,
    totalStake,
    guaranteedProfit: isArbitrage ? guaranteedProfit : 0,
    profitMargin,
    isArbitrage,
    totalBookmakers: 2,
    bets: [
      {
        bookmaker: bestTeam1.bookmaker,
        team: team1Name,
        odds: bestTeam1.odds,
        stake: stakes.stake1,
        potentialPayout: team1Payout
      },
      {
        bookmaker: bestTeam2.bookmaker,
        team: team2Name,
        odds: bestTeam2.odds,
        stake: stakes.stake2,
        potentialPayout: team2Payout
      }
    ]
  };
}

// Format American odds display
export function formatAmericanOdds(odds: number): string {
  return odds > 0 ? `+${odds}` : `${odds}`;
}

// Calculate potential profit from a bet
export function calculateProfit(stake: number, americanOdds: number): number {
  if (americanOdds > 0) {
    return stake * (americanOdds / 100);
  } else {
    return stake * (100 / Math.abs(americanOdds));
  }
}

// Find the best arbitrage opportunity across multiple sportsbooks
export function findBestArbitrageOpportunity(
  allBookmakerOdds: MultiBookmakerOdds,
  team1Name: string,
  team2Name: string,
  gameName: string,
  totalStake: number = 1000
): ArbitrageOpportunity {
  const bookmakers = Object.keys(allBookmakerOdds);
  
  if (bookmakers.length < 2) {
    throw new Error('Need at least 2 bookmakers to find arbitrage opportunities');
  }

  let bestOpportunity: ArbitrageOpportunity | null = null;
  let bestProfit = -Infinity;

  // Find the best odds for each outcome across all bookmakers
  let bestTeam1Odds = -Infinity;
  let bestTeam1Book = '';
  let bestTeam2Odds = -Infinity;
  let bestTeam2Book = '';

  bookmakers.forEach(bookmaker => {
    const odds = allBookmakerOdds[bookmaker];
    
    // Check team1 odds
    if (odds.team1 > bestTeam1Odds) {
      bestTeam1Odds = odds.team1;
      bestTeam1Book = bookmaker;
    }
    
    // Check team2 odds
    if (odds.team2 > bestTeam2Odds) {
      bestTeam2Odds = odds.team2;
      bestTeam2Book = bookmaker;
    }
  });

  // Calculate arbitrage opportunity with best odds
  const team1ImpliedProb = americanToImpliedProbability(bestTeam1Odds);
  const team2ImpliedProb = americanToImpliedProbability(bestTeam2Odds);
  const totalImpliedProb = team1ImpliedProb + team2ImpliedProb;

  const isArbitrage = totalImpliedProb < 1;
  const profitMargin = isArbitrage ? (1 - totalImpliedProb) * 100 : 0;

  if (isArbitrage) {
    // Calculate optimal stakes
    const stakes = calculateOptimalStakes(bestTeam1Odds, bestTeam2Odds, totalStake);
    
    // Calculate payouts
    const team1Payout = stakes.stake1 * americanToDecimal(bestTeam1Odds);
    const team2Payout = stakes.stake2 * americanToDecimal(bestTeam2Odds);
    
    // Calculate guaranteed profit
    const guaranteedProfit = Math.min(team1Payout, team2Payout) - totalStake;

    bestOpportunity = {
      game: gameName,
      totalStake,
      guaranteedProfit,
      profitMargin,
      isArbitrage: true,
      totalBookmakers: bookmakers.length,
      bets: [
        {
          bookmaker: bestTeam1Book,
          team: team1Name,
          odds: bestTeam1Odds,
          stake: stakes.stake1,
          potentialPayout: team1Payout
        },
        {
          bookmaker: bestTeam2Book,
          team: team2Name,
          odds: bestTeam2Odds,
          stake: stakes.stake2,
          potentialPayout: team2Payout
        }
      ]
    };
  }

  return bestOpportunity || {
    game: gameName,
    team1: team1Name,
    team2: team2Name,
    totalStake,
    guaranteedProfit: 0,
    profitMargin: 0,
    isArbitrage: false,
    totalBookmakers: bookmakers.length,
    bets: []
  };
}

// Get bookmaker color for UI styling
export function getBookmakerColor(bookmaker: string): { bg: string; text: string; border: string } {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    'DraftKings': { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-800 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-700' },
    'BetMGM': { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-800 dark:text-green-300', border: 'border-green-200 dark:border-green-700' },
    'FanDuel': { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-800 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-700' },
    'Caesars': { bg: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-800 dark:text-yellow-300', border: 'border-yellow-200 dark:border-yellow-700' },
    'PointsBet': { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-800 dark:text-red-300', border: 'border-red-200 dark:border-red-700' },
    'BetRivers': { bg: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-800 dark:text-indigo-300', border: 'border-indigo-200 dark:border-indigo-700' },
    'Four Winds Casino': { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-800 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-700' },
    'ESPN BET': { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-800 dark:text-red-300', border: 'border-red-200 dark:border-red-700' },
    'Fanatics Sportsbook': { bg: 'bg-cyan-50 dark:bg-cyan-900/20', text: 'text-cyan-800 dark:text-cyan-300', border: 'border-cyan-200 dark:border-cyan-700' },
    'Eagle Casino': { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-800 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-700' },
    'FireKeepers': { bg: 'bg-rose-50 dark:bg-rose-900/20', text: 'text-rose-800 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-700' },
    'BetPARX': { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-800 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-700' },
    'Golden Nugget': { bg: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-800 dark:text-yellow-300', border: 'border-yellow-200 dark:border-yellow-700' }
  };
  
  return colors[bookmaker] || { bg: 'bg-gray-50 dark:bg-gray-900/20', text: 'text-gray-800 dark:text-gray-300', border: 'border-gray-200 dark:border-gray-700' };
}

// Utility functions for test compatibility and general use
export function decimalToAmerican(decimalOdds: number): number {
  if (decimalOdds >= 2.0) {
    return Math.round((decimalOdds - 1) * 100);
  } else {
    return Math.round(-100 / (decimalOdds - 1));
  }
}

export function calculateImpliedProbability(americanOdds: number): number {
  if (americanOdds > 0) {
    return 100 / (americanOdds + 100);
  } else {
    return Math.abs(americanOdds) / (Math.abs(americanOdds) + 100);
  }
}