// Optional: configure or set up a testing framework before each test.
// If you delete this file, remove `setupFilesAfterEnv` from `jest.config.js`

// Used for __tests__/testing-library.js
// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock environment variables for testing
process.env.NEXT_PUBLIC_ODDS_API_KEY = 'test-api-key-for-testing'
process.env.NODE_ENV = 'test'

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Suppress console.log in tests unless explicitly needed
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}

// Mock fetch for API tests
global.fetch = jest.fn()

// Reset all mocks after each test
afterEach(() => {
  jest.clearAllMocks()
})

// Custom matchers for arbitrage testing
expect.extend({
  toBeValidArbitrageOpportunity(received) {
    const pass = 
      received &&
      typeof received.isArbitrage === 'boolean' &&
      typeof received.guaranteedProfit === 'number' &&
      typeof received.profitMargin === 'number' &&
      Array.isArray(received.bets) &&
      received.bets.length >= 2 &&
      received.bets.every(bet => 
        typeof bet.bookmaker === 'string' &&
        typeof bet.team === 'string' &&
        typeof bet.odds === 'number' &&
        typeof bet.stake === 'number' &&
        typeof bet.potentialPayout === 'number'
      )

    if (pass) {
      return {
        message: () => `expected ${JSON.stringify(received)} not to be a valid arbitrage opportunity`,
        pass: true,
      }
    } else {
      return {
        message: () => `expected ${JSON.stringify(received)} to be a valid arbitrage opportunity`,
        pass: false,
      }
    }
  },

  toHaveProfitableArbitrage(received) {
    const pass = 
      received &&
      received.isArbitrage === true &&
      received.guaranteedProfit > 0 &&
      received.profitMargin > 0

    if (pass) {
      return {
        message: () => `expected arbitrage not to be profitable`,
        pass: true,
      }
    } else {
      return {
        message: () => `expected arbitrage to be profitable (profit: ${received?.guaranteedProfit}, margin: ${received?.profitMargin}%)`,
        pass: false,
      }
    }
  }
})