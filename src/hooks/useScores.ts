import { useEffect, useState } from 'react';
import { useRealGameData } from './useRealGameData';

interface ScoreOptions {
  updateIntervalSeconds?: number;
}

export type Sport = 'nba' | 'nfl' | 'mlb';

interface GameScore {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  status: 'upcoming' | 'live' | 'final';
  quarter?: string;
  time?: string;
  date: string;
}

export const useScores = (sport: Sport, options?: ScoreOptions) => {
  const updateIntervalSeconds = options?.updateIntervalSeconds || 30;
  const [scores, setScores] = useState<GameScore[]>([]);
  
  // Use the same real game data as the Live Sports Center
  const { games, loading, error } = useRealGameData();

  useEffect(() => {
    // Filter games by sport and transform to GameScore format
    const filteredGames = games.filter(game => game.sport === sport);
    
    const transformedScores: GameScore[] = filteredGames.map(game => ({
      id: game.id,
      homeTeam: game.home,
      awayTeam: game.away,
      homeScore: game.score?.home || 0,
      awayScore: game.score?.away || 0,
      status: game.status as 'upcoming' | 'live' | 'final',
      quarter: game.quarter,
      time: game.time,
      date: game.commence_time
    }));

    setScores(transformedScores);
  }, [games, sport]);

  return {
    scores,
    loading,
    error,
    refetch: () => {
      // Refetch will be handled by the useRealGameData hook
      console.log('Refetch triggered for scores');
    }
  };
};