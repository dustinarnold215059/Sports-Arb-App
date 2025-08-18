'use client';

import { SPORTSBOOKS, getBookmakerColor } from '@/lib/arbitrage';

export function SupportedSportsbooks() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-gray-300 text-lg leading-relaxed">
          Our arbitrage tools compare odds across these <span className="text-white font-semibold">{Object.keys(SPORTSBOOKS).length} major sportsbooks</span> to find you the best opportunities:
        </p>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Object.values(SPORTSBOOKS).map((bookmaker) => {
          return (
            <div
              key={bookmaker}
              className="p-4 rounded-xl border border-gray-600/50 bg-gray-800/50 backdrop-blur-sm hover:bg-gray-700/50 hover:border-gray-500/70 transition-all text-center group"
            >
              <div className="font-semibold text-white group-hover:text-blue-300 transition-colors">
                {bookmaker}
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="p-6 bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-xl border border-blue-500/30 rounded-xl">
        <div className="flex items-start gap-4">
          <div className="text-3xl">📊</div>
          <div>
            <p className="text-blue-300 font-semibold text-lg mb-2">
              More Coverage = Better Opportunities
            </p>
            <p className="text-gray-200 leading-relaxed">
              With <span className="text-white font-semibold">{Object.keys(SPORTSBOOKS).length} sportsbooks</span>, 
              you have <span className="text-green-300 font-semibold">{Object.keys(SPORTSBOOKS).length * (Object.keys(SPORTSBOOKS).length - 1) / 2} possible 
              pairwise comparisons</span> for finding arbitrage opportunities!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}