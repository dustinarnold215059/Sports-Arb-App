/**
 * Web Worker for Arbitrage Calculations
 * Handles computationally intensive arbitrage opportunity detection
 * Runs in background thread to keep UI responsive
 */

// Worker state
let isCalculating = false;
let calculationId = null;

// Arbitrage calculation functions
function calculateArbitrageOpportunity(oddsData) {
  const { game, outcomes } = oddsData;
  const opportunities = [];

  // Get all bookmakers for this game
  const bookmakers = Object.keys(outcomes);
  
  if (bookmakers.length < 2) {
    return { opportunities: [], calculationTime: 0 };
  }

  const startTime = performance.now();

  // For each possible outcome combination
  const outcomeKeys = Object.keys(outcomes[bookmakers[0]] || {});
  
  for (let i = 0; i < outcomeKeys.length; i++) {
    const outcome1 = outcomeKeys[i];
    
    for (let j = i + 1; j < outcomeKeys.length; j++) {
      const outcome2 = outcomeKeys[j];
      
      // Find best odds for each outcome across all bookmakers
      let bestOdds1 = { odds: -Infinity, bookmaker: null };
      let bestOdds2 = { odds: -Infinity, bookmaker: null };
      
      for (const bookmaker of bookmakers) {
        const bmOutcomes = outcomes[bookmaker];
        if (!bmOutcomes) continue;
        
        if (bmOutcomes[outcome1] && bmOutcomes[outcome1] > bestOdds1.odds) {
          bestOdds1 = { odds: bmOutcomes[outcome1], bookmaker };
        }
        
        if (bmOutcomes[outcome2] && bmOutcomes[outcome2] > bestOdds2.odds) {
          bestOdds2 = { odds: bmOutcomes[outcome2], bookmaker };
        }
      }

      // Check if we have valid odds from different bookmakers
      if (bestOdds1.bookmaker && bestOdds2.bookmaker && 
          bestOdds1.bookmaker !== bestOdds2.bookmaker) {
        
        const opportunity = calculateTwoWayArbitrage(
          game,
          outcome1,
          outcome2,
          bestOdds1.odds,
          bestOdds2.odds,
          bestOdds1.bookmaker,
          bestOdds2.bookmaker
        );
        
        if (opportunity.isArbitrage) {
          opportunities.push(opportunity);
        }
      }
    }
  }

  // Check three-way arbitrage (if applicable)
  if (outcomeKeys.length >= 3) {
    const threeWayOpportunities = calculateThreeWayArbitrage(game, outcomes, bookmakers);
    opportunities.push(...threeWayOpportunities);
  }

  const calculationTime = performance.now() - startTime;

  return {
    opportunities: opportunities.sort((a, b) => b.profitMargin - a.profitMargin),
    calculationTime
  };
}

function calculateTwoWayArbitrage(game, outcome1, outcome2, odds1, odds2, bookmaker1, bookmaker2, totalStake = 1000) {
  // Convert American odds to decimal
  const decimal1 = americanToDecimal(odds1);
  const decimal2 = americanToDecimal(odds2);
  
  // Calculate implied probabilities
  const impliedProb1 = 1 / decimal1;
  const impliedProb2 = 1 / decimal2;
  const totalImpliedProb = impliedProb1 + impliedProb2;
  
  // Check if arbitrage exists
  const isArbitrage = totalImpliedProb < 1;
  
  if (!isArbitrage) {
    return {
      game,
      team1: outcome1,
      team2: outcome2,
      totalStake: 0,
      guaranteedProfit: 0,
      profitMargin: 0,
      isArbitrage: false,
      totalBookmakers: 2,
      bets: []
    };
  }
  
  // Calculate optimal stakes
  const stake1 = totalStake * impliedProb1 / totalImpliedProb;
  const stake2 = totalStake * impliedProb2 / totalImpliedProb;
  
  // Calculate payouts
  const payout1 = stake1 * decimal1;
  const payout2 = stake2 * decimal2;
  
  // Guaranteed profit is the minimum payout minus total stake
  const guaranteedProfit = Math.min(payout1, payout2) - totalStake;
  const profitMargin = (guaranteedProfit / totalStake) * 100;
  
  return {
    game,
    team1: outcome1,
    team2: outcome2,
    totalStake,
    guaranteedProfit,
    profitMargin,
    isArbitrage: true,
    totalBookmakers: 2,
    bets: [
      {
        bookmaker: bookmaker1,
        team: outcome1,
        odds: odds1,
        stake: stake1,
        potentialPayout: payout1
      },
      {
        bookmaker: bookmaker2,
        team: outcome2,
        odds: odds2,
        stake: stake2,
        potentialPayout: payout2
      }
    ]
  };
}

function calculateThreeWayArbitrage(game, outcomes, bookmakers, totalStake = 1000) {
  const opportunities = [];
  const outcomeKeys = Object.keys(outcomes[bookmakers[0]] || {});
  
  if (outcomeKeys.length < 3) return opportunities;
  
  // For three-way arbitrage, we need at least 3 outcomes
  for (let i = 0; i < outcomeKeys.length - 2; i++) {
    for (let j = i + 1; j < outcomeKeys.length - 1; j++) {
      for (let k = j + 1; k < outcomeKeys.length; k++) {
        const outcome1 = outcomeKeys[i];
        const outcome2 = outcomeKeys[j];
        const outcome3 = outcomeKeys[k];
        
        // Find best odds for each outcome
        let bestOdds1 = { odds: -Infinity, bookmaker: null };
        let bestOdds2 = { odds: -Infinity, bookmaker: null };
        let bestOdds3 = { odds: -Infinity, bookmaker: null };
        
        for (const bookmaker of bookmakers) {
          const bmOutcomes = outcomes[bookmaker];
          if (!bmOutcomes) continue;
          
          if (bmOutcomes[outcome1] && bmOutcomes[outcome1] > bestOdds1.odds) {
            bestOdds1 = { odds: bmOutcomes[outcome1], bookmaker };
          }
          if (bmOutcomes[outcome2] && bmOutcomes[outcome2] > bestOdds2.odds) {
            bestOdds2 = { odds: bmOutcomes[outcome2], bookmaker };
          }
          if (bmOutcomes[outcome3] && bmOutcomes[outcome3] > bestOdds3.odds) {
            bestOdds3 = { odds: bmOutcomes[outcome3], bookmaker };
          }
        }
        
        // Ensure we have odds from at least 2 different bookmakers
        const bookmakerSet = new Set([bestOdds1.bookmaker, bestOdds2.bookmaker, bestOdds3.bookmaker].filter(Boolean));
        
        if (bookmakerSet.size >= 2 && bestOdds1.bookmaker && bestOdds2.bookmaker && bestOdds3.bookmaker) {
          const opportunity = calculateThreeWayArbitrageOpportunity(
            game,
            [outcome1, outcome2, outcome3],
            [bestOdds1.odds, bestOdds2.odds, bestOdds3.odds],
            [bestOdds1.bookmaker, bestOdds2.bookmaker, bestOdds3.bookmaker],
            totalStake
          );
          
          if (opportunity.isArbitrage) {
            opportunities.push(opportunity);
          }
        }
      }
    }
  }
  
  return opportunities;
}

function calculateThreeWayArbitrageOpportunity(game, outcomes, odds, bookmakers, totalStake) {
  // Convert to decimal odds
  const decimals = odds.map(americanToDecimal);
  
  // Calculate implied probabilities
  const impliedProbs = decimals.map(d => 1 / d);
  const totalImpliedProb = impliedProbs.reduce((sum, prob) => sum + prob, 0);
  
  // Check if arbitrage exists
  const isArbitrage = totalImpliedProb < 1;
  
  if (!isArbitrage) {
    return {
      game,
      team1: outcomes[0],
      team2: outcomes[1],
      totalStake: 0,
      guaranteedProfit: 0,
      profitMargin: 0,
      isArbitrage: false,
      totalBookmakers: new Set(bookmakers).size,
      bets: []
    };
  }
  
  // Calculate optimal stakes
  const stakes = impliedProbs.map(prob => totalStake * prob / totalImpliedProb);
  const payouts = stakes.map((stake, i) => stake * decimals[i]);
  
  // Guaranteed profit
  const guaranteedProfit = Math.min(...payouts) - totalStake;
  const profitMargin = (guaranteedProfit / totalStake) * 100;
  
  const bets = outcomes.map((outcome, i) => ({
    bookmaker: bookmakers[i],
    team: outcome,
    odds: odds[i],
    stake: stakes[i],
    potentialPayout: payouts[i]
  }));
  
  return {
    game,
    team1: outcomes[0],
    team2: outcomes[1],
    totalStake,
    guaranteedProfit,
    profitMargin,
    isArbitrage: true,
    totalBookmakers: new Set(bookmakers).size,
    bets
  };
}

function americanToDecimal(americanOdds) {
  if (americanOdds > 0) {
    return (americanOdds / 100) + 1;
  } else {
    return (100 / Math.abs(americanOdds)) + 1;
  }
}

// Advanced opportunity filtering and scoring
function scoreOpportunity(opportunity) {
  let score = 0;
  
  // Base score from profit margin
  score += opportunity.profitMargin * 10;
  
  // Bonus for higher total stakes (more liquid markets)
  score += Math.log(opportunity.totalStake / 100) * 2;
  
  // Bonus for more bookmakers involved
  score += opportunity.totalBookmakers * 5;
  
  // Penalty for very small profits (transaction costs)
  if (opportunity.guaranteedProfit < 10) {
    score -= 20;
  }
  
  // Bonus for balanced stakes (easier to execute)
  const stakes = opportunity.bets.map(bet => bet.stake);
  const maxStake = Math.max(...stakes);
  const minStake = Math.min(...stakes);
  const stakeRatio = minStake / maxStake;
  score += stakeRatio * 10;
  
  return Math.max(0, score);
}

function filterOpportunities(opportunities, filters = {}) {
  const {
    minProfitMargin = 0,
    minGuaranteedProfit = 0,
    maxStakePerBet = Infinity,
    allowedBookmakers = null,
    minBookmakers = 2
  } = filters;
  
  return opportunities.filter(opp => {
    // Profit margin filter
    if (opp.profitMargin < minProfitMargin) return false;
    
    // Guaranteed profit filter
    if (opp.guaranteedProfit < minGuaranteedProfit) return false;
    
    // Max stake filter
    const maxStake = Math.max(...opp.bets.map(bet => bet.stake));
    if (maxStake > maxStakePerBet) return false;
    
    // Bookmaker filter
    if (allowedBookmakers) {
      const oppBookmakers = opp.bets.map(bet => bet.bookmaker);
      if (!oppBookmakers.every(bm => allowedBookmakers.includes(bm))) return false;
    }
    
    // Minimum bookmakers
    if (opp.totalBookmakers < minBookmakers) return false;
    
    return true;
  });
}

// Batch processing for multiple games
function processGamesInBatches(games, batchSize = 10) {
  const results = [];
  const totalGames = games.length;
  let processedGames = 0;
  
  for (let i = 0; i < games.length; i += batchSize) {
    const batch = games.slice(i, i + batchSize);
    const batchResults = [];
    
    for (const game of batch) {
      try {
        const result = calculateArbitrageOpportunity(game);
        batchResults.push({
          gameId: game.id || `game_${i}`,
          game: game.game || 'Unknown Game',
          ...result
        });
        processedGames++;
        
        // Send progress update
        self.postMessage({
          type: 'PROGRESS',
          data: {
            processed: processedGames,
            total: totalGames,
            percentage: Math.round((processedGames / totalGames) * 100)
          }
        });
        
      } catch (error) {
        console.error('Error processing game:', error);
        batchResults.push({
          gameId: game.id || `game_${i}`,
          game: game.game || 'Unknown Game',
          opportunities: [],
          calculationTime: 0,
          error: error.message
        });
      }
    }
    
    results.push(...batchResults);
    
    // Allow for interruption between batches
    if (calculationId !== null) {
      // Check if calculation was cancelled
      break;
    }
  }
  
  return results;
}

// Message handler
self.addEventListener('message', function(e) {
  const { type, data, id } = e.data;
  
  switch (type) {
    case 'CALCULATE_ARBITRAGE':
      if (isCalculating) {
        self.postMessage({
          type: 'ERROR',
          data: { error: 'Calculation already in progress' },
          id
        });
        return;
      }
      
      isCalculating = true;
      calculationId = id;
      
      try {
        const startTime = performance.now();
        const result = calculateArbitrageOpportunity(data);
        const totalTime = performance.now() - startTime;
        
        // Score and sort opportunities
        const scoredOpportunities = result.opportunities.map(opp => ({
          ...opp,
          score: scoreOpportunity(opp)
        })).sort((a, b) => b.score - a.score);
        
        self.postMessage({
          type: 'ARBITRAGE_RESULT',
          data: {
            ...result,
            opportunities: scoredOpportunities,
            totalCalculationTime: totalTime
          },
          id
        });
      } catch (error) {
        self.postMessage({
          type: 'ERROR',
          data: { error: error.message },
          id
        });
      } finally {
        isCalculating = false;
        calculationId = null;
      }
      break;
      
    case 'BATCH_CALCULATE':
      if (isCalculating) {
        self.postMessage({
          type: 'ERROR',
          data: { error: 'Calculation already in progress' },
          id
        });
        return;
      }
      
      isCalculating = true;
      calculationId = id;
      
      try {
        const { games, filters, batchSize } = data;
        const startTime = performance.now();
        
        const results = processGamesInBatches(games, batchSize);
        
        // Filter and score all opportunities
        let allOpportunities = [];
        results.forEach(result => {
          if (result.opportunities) {
            const gameOpportunities = result.opportunities.map(opp => ({
              ...opp,
              gameId: result.gameId,
              score: scoreOpportunity(opp)
            }));
            allOpportunities.push(...gameOpportunities);
          }
        });
        
        // Apply filters
        if (filters) {
          allOpportunities = filterOpportunities(allOpportunities, filters);
        }
        
        // Sort by score
        allOpportunities.sort((a, b) => b.score - a.score);
        
        const totalTime = performance.now() - startTime;
        
        self.postMessage({
          type: 'BATCH_RESULT',
          data: {
            results,
            allOpportunities,
            totalCalculationTime: totalTime,
            gamesProcessed: results.length,
            opportunitiesFound: allOpportunities.length
          },
          id
        });
      } catch (error) {
        self.postMessage({
          type: 'ERROR',
          data: { error: error.message },
          id
        });
      } finally {
        isCalculating = false;
        calculationId = null;
      }
      break;
      
    case 'CANCEL_CALCULATION':
      if (isCalculating && calculationId === id) {
        isCalculating = false;
        calculationId = null;
        self.postMessage({
          type: 'CALCULATION_CANCELLED',
          id
        });
      }
      break;
      
    case 'PING':
      self.postMessage({
        type: 'PONG',
        data: { 
          isCalculating,
          timestamp: Date.now()
        },
        id
      });
      break;
      
    default:
      self.postMessage({
        type: 'ERROR',
        data: { error: `Unknown message type: ${type}` },
        id
      });
  }
});

// Health check - respond to keep-alive pings
setInterval(() => {
  self.postMessage({
    type: 'HEARTBEAT',
    data: {
      isCalculating,
      timestamp: Date.now(),
      memoryUsage: performance.memory ? {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      } : null
    }
  });
}, 30000); // Every 30 seconds

console.log('Arbitrage Worker initialized and ready');