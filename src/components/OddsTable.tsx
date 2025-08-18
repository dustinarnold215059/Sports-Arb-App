'use client';

import { formatAmericanOdds } from '@/lib/utils';

interface Outcome {
  name: string;
  price: number;
  point?: number;
}

interface Market {
  key: string;
  outcomes: Outcome[];
}

interface Bookmaker {
  key: string;
  title: string;
  lastUpdate: string;
  markets: Market[];
}

interface GameOdds {
  id: string;
  sportKey: string;
  sportTitle: string;
  commenceTime: string;
  homeTeam: string;
  awayTeam: string;
  bookmakers: Bookmaker[];
}

interface OddsTableProps {
  sportTitle: string;
  gameOdds: GameOdds[];
}

const MARKET_NAMES: Record<string, string> = {
  h2h: 'Moneyline',
  spreads: 'Point Spread',
  totals: 'Over/Under'
};

function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

export function OddsTable({ sportTitle, gameOdds }: OddsTableProps) {
  if (!sportTitle || gameOdds.length === 0) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700/50 p-8 text-center">
        <h2 className="text-xl font-bold text-white mb-2">{sportTitle || 'Sport'}</h2>
        <p className="text-gray-300">Odds not available. Sport may be out of season.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/30 backdrop-blur-xl rounded-lg border border-gray-700/50 overflow-hidden">
      {/* Table Header */}
      <div className="bg-gradient-to-r from-blue-600/80 to-purple-600/80 backdrop-blur-sm text-white p-4 border-b border-gray-700/50">
        <h2 className="text-xl font-bold text-center">{sportTitle}</h2>
      </div>

      {/* Games */}
      <div className="divide-y divide-gray-700/50">
        {gameOdds.map((game) => (
          <div key={game.id} className="p-4">
            {/* Game Header */}
            <div className="bg-gradient-to-r from-gray-800/80 to-gray-700/80 backdrop-blur-sm text-white p-3 rounded-lg mb-4 flex justify-between items-center border border-gray-600/30">
              <div className="flex-1 text-center">
                <div className="font-semibold">{game.awayTeam}</div>
                <div className="text-sm text-gray-300">Away</div>
              </div>
              <div className="px-4 text-lg font-bold text-blue-400">VS</div>
              <div className="flex-1 text-center">
                <div className="font-semibold">{game.homeTeam}</div>
                <div className="text-sm text-gray-300">Home</div>
              </div>
              <div className="ml-4 text-sm text-gray-300">
                {formatTimestamp(game.commenceTime)}
              </div>
            </div>

            {/* Bookmaker Odds */}
            <div className="space-y-3">
              {game.bookmakers.length === 0 ? (
                <p className="text-gray-400 text-center py-4">No odds available</p>
              ) : (
                game.bookmakers.map((bookmaker) => (
                  <div 
                    key={bookmaker.key}
                    className="bg-gray-800/40 backdrop-blur-sm border border-gray-600/30 rounded-lg p-3 hover:bg-gray-700/50 transition-all"
                  >
                    <div className="flex flex-wrap items-start gap-4">
                      {/* Bookmaker Name */}
                      <div className="w-24 flex-shrink-0">
                        <div className="font-medium text-sm text-white">
                          {bookmaker.title}
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(bookmaker.lastUpdate).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>

                      {/* Markets */}
                      <div className="flex-1 flex flex-wrap gap-6">
                        {bookmaker.markets.map((market) => (
                          <div key={market.key} className="min-w-0">
                            <div className="text-sm font-medium text-blue-400 mb-1 underline">
                              {MARKET_NAMES[market.key] || market.key}
                            </div>
                            <div className="flex gap-2">
                              {market.outcomes.map((outcome) => (
                                <div 
                                  key={outcome.name}
                                  className="bg-gray-700/50 backdrop-blur-sm border border-gray-600/30 px-3 py-2 rounded text-center min-w-16 hover:bg-gray-600/50 transition-all"
                                >
                                  <div className="text-xs font-medium text-gray-300">
                                    {outcome.name}
                                  </div>
                                  <div className="text-sm font-bold text-white">
                                    {formatAmericanOdds(outcome.price)}
                                  </div>
                                  {outcome.point && (
                                    <div className="text-xs text-gray-400">
                                      {outcome.point >= 0 ? `+${outcome.point}` : outcome.point}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Real data now provided from The Odds API via useRealGameData hook