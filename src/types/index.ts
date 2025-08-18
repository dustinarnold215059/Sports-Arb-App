export interface Game {
  id: string;
  home: string;
  away: string;
  league: string;
  time: string;
  date: string;
  status: 'upcoming' | 'live' | 'finished';
  odds?: {
    home: string;
    away: string;
  };
  score?: {
    home: number;
    away: number;
  };
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  stats: {
    totalWins: number;
    totalEarnings: number;
    winRate: number;
    gamesPlayed: number;
  };
}

export interface Bet {
  id: string;
  gameId: string;
  userId: string;
  team: string;
  amount: number;
  odds: string;
  status: 'pending' | 'won' | 'lost';
  placedAt: Date;
}