'use client';

import { SimpleCalculator } from '@/components/SimpleCalculator';
import { Navigation } from '@/components/Navigation';
import { ModernCard, ModernCardHeader, ModernCardBody } from "../../shared/components/ui/ModernCard";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export default function CalculatorPage() {
  return (
    <ProtectedRoute requireProOrAdmin={true}>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        {/* Navigation */}
        <Navigation />

      {/* Page Header */}
      <div className="bg-gray-800/30 backdrop-blur-sm border-b border-gray-700/30">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Betting Calculator</h1>
              <p className="text-gray-400 text-sm">
                Simple calculator for any two-bet scenario
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="status-indicator status-active">
                <span>Calculator Ready</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Main Calculator */}
        <ModernCard variant="default">
          <ModernCardHeader>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold text-white">
                  🎯 Betting Calculator
                </h2>
                <div className="status-indicator status-active">
                  <span>Active</span>
                </div>
              </div>
            </div>
          </ModernCardHeader>
          <ModernCardBody>
            <SimpleCalculator />
          </ModernCardBody>
        </ModernCard>

        {/* How To Use Guide */}
        <ModernCard variant="glass">
          <ModernCardHeader>
            <h3 className="text-xl font-semibold text-white flex items-center gap-2">
              📚 <span>How To Use Our Betting Arbitrage Calculator</span>
            </h3>
          </ModernCardHeader>
          <ModernCardBody>
            <div className="space-y-6">
              <div className="prose prose-invert max-w-none">
                <p className="text-gray-300 text-lg leading-relaxed mb-6">
                  Our betting arbitrage calculator helps you determine if you can guarantee a profit by placing opposing bets on the same event across different sportsbooks. Follow these simple steps:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="data-card border-l-4 border-l-blue-500">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">1️⃣</span>
                      <div>
                        <h4 className="font-semibold text-blue-400 mb-2">Enter Your Odds</h4>
                        <p className="text-sm text-gray-300 leading-relaxed">
                          Input the American odds for each bet. Use negative numbers for favorites (e.g., -150) and positive numbers for underdogs (e.g., +200). You can find different odds on each outcome across various sportsbooks.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="data-card border-l-4 border-l-green-500">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">2️⃣</span>
                      <div>
                        <h4 className="font-semibold text-green-400 mb-2">Set Your Stakes</h4>
                        <p className="text-sm text-gray-300 leading-relaxed">
                          Enter how much you want to bet on each outcome. The stakes don't have to be equal - adjust them based on the odds to maximize your guaranteed profit. The calculator shows you the profit for each individual bet.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="data-card border-l-4 border-l-purple-500">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">3️⃣</span>
                      <div>
                        <h4 className="font-semibold text-purple-400 mb-2">Check the Results</h4>
                        <p className="text-sm text-gray-300 leading-relaxed">
                          Look at the totals section at the bottom. If your "Total Profit" is positive, you have found an arbitrage opportunity! This means you're guaranteed to make money regardless of which outcome wins.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="data-card border-l-4 border-l-yellow-500">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">4️⃣</span>
                      <div>
                        <h4 className="font-semibold text-yellow-400 mb-2">Place Your Bets</h4>
                        <p className="text-sm text-gray-300 leading-relaxed">
                          If you found an arbitrage opportunity, quickly place both bets at their respective sportsbooks. Remember that odds change frequently, so speed is important once you've identified a profitable opportunity.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 p-4 bg-gradient-to-r from-green-500/20 to-blue-500/20 backdrop-blur-xl border border-green-500/30 rounded-xl">
                  <div className="flex items-start gap-4">
                    <span className="text-3xl">💡</span>
                    <div>
                      <h4 className="text-green-300 font-semibold text-lg mb-2">Pro Tips for Success</h4>
                      <ul className="text-gray-200 space-y-2 text-sm">
                        <li>• <strong>Shop around:</strong> Compare odds across multiple sportsbooks to find the best prices</li>
                        <li>• <strong>Act quickly:</strong> Arbitrage opportunities disappear fast as odds change</li>
                        <li>• <strong>Check limits:</strong> Make sure both sportsbooks allow your desired bet amounts</li>
                        <li>• <strong>Account for fees:</strong> Consider withdrawal fees and deposit bonuses in your calculations</li>
                        <li>• <strong>Start small:</strong> Test the process with smaller amounts before making large bets</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ModernCardBody>
        </ModernCard>
        </div>
      </div>
    </ProtectedRoute>
  );
}