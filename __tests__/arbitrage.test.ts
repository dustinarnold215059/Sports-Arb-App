/**
 * Comprehensive Test Suite for Arbitrage Calculations
 * SECURITY: Critical business logic must be tested thoroughly
 */

import {
  americanToDecimal,
  decimalToAmerican,
  calculateImpliedProbability,
  findArbitrageOpportunity,
  findBestArbitrageOpportunity,
  formatAmericanOdds,
  SPORTSBOOKS,
  type ArbitrageOpportunity,
  type MultiBookmakerOdds
} from '../src/lib/arbitrage';

describe('American Odds Conversion', () => {
  describe('americanToDecimal', () => {
    test('converts positive American odds correctly', () => {
      expect(americanToDecimal(150)).toBe(2.5);
      expect(americanToDecimal(100)).toBe(2.0);
      expect(americanToDecimal(200)).toBe(3.0);
      expect(americanToDecimal(300)).toBe(4.0);
    });

    test('converts negative American odds correctly', () => {
      expect(americanToDecimal(-150)).toBe(1.6666666666666667);
      expect(americanToDecimal(-200)).toBe(1.5);
      expect(americanToDecimal(-300)).toBe(1.3333333333333333);
      expect(americanToDecimal(-110)).toBeCloseTo(1.909, 3);
    });

    test('handles edge cases', () => {
      expect(americanToDecimal(-100)).toBe(2.0);
      expect(americanToDecimal(0)).toBe(1); // Invalid odds, but handled gracefully
    });

    test('throws error for invalid odds', () => {
      expect(() => americanToDecimal(NaN)).toThrow();
      expect(() => americanToDecimal(Infinity)).toThrow();
    });
  });

  describe('decimalToAmerican', () => {
    test('converts decimal odds to positive American odds', () => {
      expect(decimalToAmerican(2.5)).toBe(150);
      expect(decimalToAmerican(3.0)).toBe(200);
      expect(decimalToAmerican(4.0)).toBe(300);
    });

    test('converts decimal odds to negative American odds', () => {
      expect(decimalToAmerican(1.5)).toBe(-200);
      expect(decimalToAmerican(1.33)).toBeCloseTo(-303, 0);
      expect(decimalToAmerican(1.91)).toBeCloseTo(-110, 0);
    });

    test('handles edge case of 2.0', () => {
      expect(decimalToAmerican(2.0)).toBe(100);
    });

    test('throws error for invalid decimal odds', () => {
      expect(() => decimalToAmerican(0.5)).toThrow(); // Decimal odds must be > 1
      expect(() => decimalToAmerican(1.0)).toThrow();
      expect(() => decimalToAmerican(0)).toThrow();
    });
  });
});

describe('Implied Probability Calculations', () => {
  test('calculates implied probability correctly for positive odds', () => {
    expect(calculateImpliedProbability(150)).toBeCloseTo(40.0, 1); // 100/250 = 40%
    expect(calculateImpliedProbability(100)).toBeCloseTo(50.0, 1); // 100/200 = 50%
    expect(calculateImpliedProbability(300)).toBeCloseTo(25.0, 1); // 100/400 = 25%
  });

  test('calculates implied probability correctly for negative odds', () => {
    expect(calculateImpliedProbability(-150)).toBeCloseTo(60.0, 1); // 150/250 = 60%
    expect(calculateImpliedProbability(-200)).toBeCloseTo(66.67, 1); // 200/300 = 66.67%
    expect(calculateImpliedProbability(-110)).toBeCloseTo(52.38, 1); // 110/210 = 52.38%
  });

  test('handles edge cases', () => {
    expect(calculateImpliedProbability(-100)).toBe(50.0);
    expect(calculateImpliedProbability(0)).toBe(0); // Invalid but handled
  });
});

describe('Arbitrage Opportunity Detection', () => {
  describe('findArbitrageOpportunity - Two Bookmaker', () => {
    test('identifies profitable arbitrage opportunity', () => {
      const book1 = { team1: -110, team2: 120 }; // DraftKings
      const book2 = { team1: 115, team2: -105 }; // BetMGM
      
      const result = findArbitrageOpportunity(
        book1, book2, 'Lakers', 'Warriors', 'Lakers vs Warriors', 1000
      );

      expect(result.isArbitrage).toBe(true);
      expect(result.guaranteedProfit).toBeGreaterThan(0);
      expect(result.profitMargin).toBeGreaterThan(0);
      expect(result.bets).toHaveLength(2);
      expect(result.totalStake).toBe(1000);
    });

    test('identifies no arbitrage opportunity', () => {
      const book1 = { team1: -110, team2: -110 }; // Standard -110 both sides
      const book2 = { team1: -105, team2: -105 }; // Slightly better but no arb
      
      const result = findArbitrageOpportunity(
        book1, book2, 'Lakers', 'Warriors', 'Lakers vs Warriors', 1000
      );

      expect(result.isArbitrage).toBe(false);
      expect(result.guaranteedProfit).toBeLessThanOrEqual(0);
    });

    test('calculates stakes correctly', () => {
      const book1 = { team1: -110, team2: 130 };
      const book2 = { team1: 120, team2: -105 };
      
      const result = findArbitrageOpportunity(
        book1, book2, 'Lakers', 'Warriors', 'Lakers vs Warriors', 1000
      );

      // Stakes should sum to total stake
      const totalCalculatedStake = result.bets.reduce((sum, bet) => sum + bet.stake, 0);
      expect(totalCalculatedStake).toBeCloseTo(1000, 2);
    });

    test('validates payout calculations', () => {
      const book1 = { team1: -150, team2: 130 };
      const book2 = { team1: 140, team2: -140 };
      
      const result = findArbitrageOpportunity(
        book1, book2, 'Lakers', 'Warriors', 'Lakers vs Warriors', 1000
      );

      result.bets.forEach(bet => {
        const expectedPayout = bet.stake * americanToDecimal(bet.odds);
        expect(bet.potentialPayout).toBeCloseTo(expectedPayout, 2);
      });
    });

    test('handles invalid odds gracefully', () => {
      const book1 = { team1: 0, team2: 0 }; // Invalid odds
      const book2 = { team1: -110, team2: -110 };
      
      expect(() => {
        findArbitrageOpportunity(book1, book2, 'Lakers', 'Warriors', 'Lakers vs Warriors', 1000);
      }).toThrow();
    });
  });

  describe('findBestArbitrageOpportunity - Multi Bookmaker', () => {
    test('finds best arbitrage across multiple bookmakers', () => {
      const odds: MultiBookmakerOdds = {
        'DraftKings': { team1: -110, team2: 105 },
        'BetMGM': { team1: 115, team2: -115 },
        'FanDuel': { team1: 120, team2: -120 },
        'Caesars': { team1: -105, team2: 110 }
      };

      const result = findBestArbitrageOpportunity(
        odds, 'Lakers', 'Warriors', 'Lakers vs Warriors', 1000
      );

      expect(result.isArbitrage).toBe(true);
      expect(result.totalBookmakers).toBe(4);
      expect(result.bets).toHaveLength(2);
      
      // Should pick best odds for each outcome
      expect(result.bets[0].bookmaker).toBe('FanDuel'); // Best odds for team1: 120
      expect(result.bets[1].bookmaker).toBe('Caesars'); // Best odds for team2: 110
    });

    test('handles no arbitrage scenario across multiple books', () => {
      const odds: MultiBookmakerOdds = {
        'DraftKings': { team1: -110, team2: -110 },
        'BetMGM': { team1: -115, team2: -115 },
        'FanDuel': { team1: -105, team2: -105 }
      };

      const result = findBestArbitrageOpportunity(
        odds, 'Lakers', 'Warriors', 'Lakers vs Warriors', 1000
      );

      expect(result.isArbitrage).toBe(false);
      expect(result.guaranteedProfit).toBeLessThanOrEqual(0);
    });

    test('validates best odds selection', () => {
      const odds: MultiBookmakerOdds = {
        'DraftKings': { team1: -200, team2: 150 }, // Worst team1, good team2
        'BetMGM': { team1: 180, team2: -180 },     // Best team1, worst team2
        'FanDuel': { team1: -150, team2: 120 }     // Medium both
      };

      const result = findBestArbitrageOpportunity(
        odds, 'Lakers', 'Warriors', 'Lakers vs Warriors', 1000
      );

      // Should select BetMGM for team1 (180) and DraftKings for team2 (150)
      const team1Bet = result.bets.find(bet => bet.team === 'Lakers');
      const team2Bet = result.bets.find(bet => bet.team === 'Warriors');

      expect(team1Bet?.bookmaker).toBe('BetMGM');
      expect(team1Bet?.odds).toBe(180);
      expect(team2Bet?.bookmaker).toBe('DraftKings');
      expect(team2Bet?.odds).toBe(150);
    });

    test('handles edge case with identical odds', () => {
      const odds: MultiBookmakerOdds = {
        'DraftKings': { team1: -110, team2: -110 },
        'BetMGM': { team1: -110, team2: -110 },
        'FanDuel': { team1: -110, team2: -110 }
      };

      const result = findBestArbitrageOpportunity(
        odds, 'Lakers', 'Warriors', 'Lakers vs Warriors', 1000
      );

      expect(result.isArbitrage).toBe(false);
      expect(result.bets).toHaveLength(2);
      // Should still pick first bookmaker when odds are identical
      expect(result.bets[0].bookmaker).toBe('DraftKings');
      expect(result.bets[1].bookmaker).toBe('DraftKings');
    });
  });
});

describe('Risk Assessment', () => {
  test('identifies draw risk for soccer games', () => {
    // This would need to be implemented in the arbitrage logic
    // Currently testing the existing structure
    const book1 = { team1: -110, team2: 120 };
    const book2 = { team1: 115, team2: -105 };
    
    const result = findArbitrageOpportunity(
      book1, book2, 'Manchester United', 'Liverpool', 'Premier League', 1000
    );

    // Should identify potential draw risk for soccer
    expect(result.riskWarning).toBeDefined();
  });

  test('no draw risk for American sports', () => {
    const book1 = { team1: -110, team2: 120 };
    const book2 = { team1: 115, team2: -105 };
    
    const result = findArbitrageOpportunity(
      book1, book2, 'Lakers', 'Warriors', 'NBA Game', 1000
    );

    // American sports typically don't have draws
    expect(result.hasDrawRisk).toBeFalsy();
  });
});

describe('Formatting and Display', () => {
  test('formatAmericanOdds formats positive odds correctly', () => {
    expect(formatAmericanOdds(150)).toBe('+150');
    expect(formatAmericanOdds(100)).toBe('+100');
    expect(formatAmericanOdds(250)).toBe('+250');
  });

  test('formatAmericanOdds formats negative odds correctly', () => {
    expect(formatAmericanOdds(-150)).toBe('-150');
    expect(formatAmericanOdds(-200)).toBe('-200');
    expect(formatAmericanOdds(-110)).toBe('-110');
  });

  test('formatAmericanOdds handles edge cases', () => {
    expect(formatAmericanOdds(0)).toBe('+0');
    expect(formatAmericanOdds(-100)).toBe('-100');
  });
});

describe('Integration Tests', () => {
  test('complete arbitrage workflow', () => {
    const realWorldScenario: MultiBookmakerOdds = {
      'DraftKings': { team1: -150, team2: 130 },
      'BetMGM': { team1: 140, team2: -140 },
      'FanDuel': { team1: 135, team2: -130 },
      'Caesars': { team1: -145, team2: 125 }
    };

    const result = findBestArbitrageOpportunity(
      realWorldScenario, 'Chiefs', 'Bills', 'NFL Championship', 5000
    );

    // Validate complete calculation chain
    expect(result.totalStake).toBe(5000);
    expect(typeof result.guaranteedProfit).toBe('number');
    expect(typeof result.profitMargin).toBe('number');
    expect(result.bets.length).toBe(2);
    
    // Validate stake distribution
    const totalStakes = result.bets.reduce((sum, bet) => sum + bet.stake, 0);
    expect(totalStakes).toBeCloseTo(5000, 2);
    
    // If arbitrage exists, profit should be positive
    if (result.isArbitrage) {
      expect(result.guaranteedProfit).toBeGreaterThan(0);
      expect(result.profitMargin).toBeGreaterThan(0);
    }
  });

  test('stress test with extreme odds', () => {
    const extremeOdds: MultiBookmakerOdds = {
      'Book1': { team1: -1000, team2: 500 }, // Heavy favorite
      'Book2': { team1: 800, team2: -900 }   // Opposite heavy favorite
    };

    const result = findBestArbitrageOpportunity(
      extremeOdds, 'Team A', 'Team B', 'Extreme Game', 10000
    );

    // Should handle extreme odds without errors
    expect(result).toBeDefined();
    expect(result.totalStake).toBe(10000);
    expect(result.bets.length).toBe(2);
    
    // With such disparate odds, this should be profitable
    expect(result.isArbitrage).toBe(true);
    expect(result.guaranteedProfit).toBeGreaterThan(0);
  });
});

describe('Error Handling', () => {
  test('handles empty odds object', () => {
    expect(() => {
      findBestArbitrageOpportunity({}, 'Team1', 'Team2', 'Game', 1000);
    }).toThrow();
  });

  test('handles negative stake', () => {
    const odds = { 'Book1': { team1: -110, team2: -110 } };
    
    expect(() => {
      findBestArbitrageOpportunity(odds, 'Team1', 'Team2', 'Game', -1000);
    }).toThrow();
  });

  test('handles zero stake', () => {
    const odds = { 'Book1': { team1: -110, team2: -110 } };
    
    expect(() => {
      findBestArbitrageOpportunity(odds, 'Team1', 'Team2', 'Game', 0);
    }).toThrow();
  });

  test('handles invalid team names', () => {
    const book1 = { team1: -110, team2: -110 };
    const book2 = { team1: -105, team2: -105 };
    
    expect(() => {
      findArbitrageOpportunity(book1, book2, '', '', 'Game', 1000);
    }).toThrow();
  });
});

describe('Performance Tests', () => {
  test('handles large number of bookmakers efficiently', () => {
    const manyBookmakers: MultiBookmakerOdds = {};
    
    // Generate 50 bookmakers with random odds
    for (let i = 0; i < 50; i++) {
      manyBookmakers[`Book${i}`] = {
        team1: Math.floor(Math.random() * 200) - 300, // -300 to -100
        team2: Math.floor(Math.random() * 300) + 100   // 100 to 400
      };
    }

    const startTime = Date.now();
    const result = findBestArbitrageOpportunity(
      manyBookmakers, 'Team1', 'Team2', 'Big Game', 1000
    );
    const endTime = Date.now();

    // Should complete within reasonable time (less than 100ms)
    expect(endTime - startTime).toBeLessThan(100);
    expect(result).toBeDefined();
    expect(result.totalBookmakers).toBe(50);
  });

  test('repeated calculations are consistent', () => {
    const odds: MultiBookmakerOdds = {
      'DraftKings': { team1: -150, team2: 130 },
      'BetMGM': { team1: 140, team2: -140 }
    };

    const results = [];
    for (let i = 0; i < 10; i++) {
      results.push(findBestArbitrageOpportunity(
        odds, 'Team1', 'Team2', 'Consistency Test', 1000
      ));
    }

    // All results should be identical
    const first = results[0];
    results.forEach(result => {
      expect(result.isArbitrage).toBe(first.isArbitrage);
      expect(result.guaranteedProfit).toBeCloseTo(first.guaranteedProfit, 5);
      expect(result.profitMargin).toBeCloseTo(first.profitMargin, 5);
    });
  });
});