# 📡 Live Sportsbook Data Integration Guide

## 🎯 Overview
This guide explains how to get live odds data from major sportsbooks for your arbitrage betting system.

## ⚠️ Important Legal Considerations

### **DO NOT:**
- Scrape sportsbook websites directly (violates Terms of Service)
- Use automated bots on sportsbook platforms
- Violate rate limits or API restrictions
- Share API keys publicly

### **DO:**
- Use official APIs when available
- Respect rate limits and terms of service
- Use legitimate third-party data providers
- Check local gambling laws and regulations

## 🔑 Recommended Approach: The Odds API

### **Why The Odds API?**
- ✅ Legitimate data aggregator
- ✅ Covers all major US sportsbooks
- ✅ Real-time odds updates
- ✅ Free tier available (500 requests/month)
- ✅ Professional support

### **Setup Instructions:**

1. **Get API Key**
   ```bash
   # Visit https://the-odds-api.com/
   # Sign up for free account
   # Get your API key from dashboard
   ```

2. **Configure Environment Variables**
   ```bash
   # Copy .env.example to .env.local
   cp .env.example .env.local
   
   # Add your API key
   NEXT_PUBLIC_ODDS_API_KEY=your-actual-api-key-here
   ```

3. **Test Connection**
   ```typescript
   import { fetchLiveOdds } from '@/lib/oddsAPI';
   
   const data = await fetchLiveOdds('basketball_nba');
   console.log(data);
   ```

## 📊 Supported Sportsbooks

The Odds API provides data from:

| Sportsbook | API Key | Coverage |
|------------|---------|----------|
| DraftKings | `draftkings` | ✅ Full |
| BetMGM | `betmgm` | ✅ Full |
| FanDuel | `fanduel` | ✅ Full |
| Caesars | `caesars` | ✅ Full |
| PointsBet | `pointsbet` | ✅ Full |
| BetRivers | `betrivers` | ✅ Full |
| WilliamHill | `williamhill_us` | ✅ Full |

## 🏈 Supported Sports

```typescript
export const SUPPORTED_SPORTS = {
  NBA: 'basketball_nba',
  NFL: 'americanfootball_nfl',
  NHL: 'icehockey_nhl',
  MLB: 'baseball_mlb',
  NCAAB: 'basketball_ncaab',
  NCAAF: 'americanfootball_ncaaf',
  // ... and many more
};
```

## 💰 Pricing Tiers

### **Free Tier**
- 500 requests/month
- All major sportsbooks
- Real-time data
- Perfect for testing and small-scale use

### **Pro Tier ($30/month)**
- 10,000 requests/month
- Priority support
- Higher rate limits
- Ideal for serious arbitrage betting

### **Enterprise**
- Custom pricing
- Unlimited requests
- Dedicated support
- For commercial applications

## 🔄 Alternative Data Sources

### **1. Official Sportsbook APIs**
Some sportsbooks offer limited public APIs:

```typescript
// DraftKings (limited public endpoints)
const DRAFTKINGS_URL = 'https://sportsbook.draftkings.com/sites/US-SB/api/v5/eventgroups/';

// BetMGM (very limited)
const BETMGM_URL = 'https://sports.ny.betmgm.com/cds-api/bettingoffer/fixtures';
```

**Pros:** Direct from source, potentially more detailed
**Cons:** Limited availability, may require special access, can change without notice

### **2. Other Third-Party APIs**

#### **Pinnacle API**
```typescript
const PINNACLE_API = 'https://api.pinnacle.com/v1/sports';
// Free tier available, primarily Pinnacle's own odds
```

#### **SportsDataIO**
```typescript
const SPORTSDATA_API = 'https://api.sportsdata.io/v3/nba/odds/json/GameOddsByDate/';
// Professional service, paid plans only
```

#### **RapidAPI Sports Odds**
```typescript
const RAPIDAPI_URL = 'https://odds.p.rapidapi.com/v4/sports/';
// Multiple providers, varying quality and pricing
```

### **3. Web Scraping (NOT RECOMMENDED)**

⚠️ **WARNING:** Most sportsbooks explicitly prohibit scraping in their Terms of Service.

If you absolutely must scrape (for educational purposes only):

```typescript
// Example structure (DO NOT USE IN PRODUCTION)
const scrapingExample = {
  risks: [
    'Legal violations',
    'Account bans',
    'IP blocking',
    'Cease and desist letters',
    'Unstable data source'
  ],
  alternatives: [
    'Use The Odds API instead',
    'Contact sportsbooks for data partnerships',
    'Use official APIs where available'
  ]
};
```

## 🚀 Implementation Best Practices

### **1. Rate Limiting**
```typescript
import { RateLimiter } from '@/lib/oddsAPI';

const rateLimiter = new RateLimiter(500, 24); // 500 requests per 24 hours

if (rateLimiter.canMakeRequest()) {
  rateLimiter.recordRequest();
  const data = await fetchLiveOdds();
}
```

### **2. Error Handling**
```typescript
try {
  const data = await fetchLiveOdds();
} catch (error) {
  if (error.message.includes('401')) {
    console.error('Invalid API key');
  } else if (error.message.includes('429')) {
    console.error('Rate limit exceeded');
  } else {
    console.error('Unexpected error:', error);
  }
}
```

### **3. Data Caching**
```typescript
// Cache data to reduce API calls
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
let cachedData = null;
let lastFetch = 0;

if (Date.now() - lastFetch > CACHE_DURATION) {
  cachedData = await fetchLiveOdds();
  lastFetch = Date.now();
}
```

### **4. Webhook Integration**
Some providers offer webhooks for real-time updates:

```typescript
// Express.js webhook handler
app.post('/webhooks/odds-update', (req, res) => {
  const oddsUpdate = req.body;
  
  // Process the update
  updateArbitrageCalculations(oddsUpdate);
  
  res.status(200).send('OK');
});
```

## 🔍 Testing Your Integration

### **1. Basic Connection Test**
```bash
# Test API connection
curl "https://api.the-odds-api.com/v4/sports/basketball_nba/odds/?apiKey=YOUR_KEY&regions=us&markets=h2h"
```

### **2. Monitor Rate Limits**
```typescript
// Check remaining requests
console.log('Remaining requests:', rateLimiter.getRemainingRequests());
```

### **3. Validate Data Quality**
```typescript
const validateOddsData = (data) => {
  return data.every(game => 
    game.bookmakers &&
    game.bookmakers.length > 0 &&
    game.commence_time &&
    game.home_team &&
    game.away_team
  );
};
```

## 🚨 Production Considerations

### **Security**
- Never commit API keys to version control
- Use environment variables for sensitive data
- Implement proper authentication for your application
- Consider API key rotation

### **Monitoring**
- Track API usage and costs
- Monitor for data quality issues
- Set up alerts for service outages
- Log errors for debugging

### **Scalability**
- Implement proper caching strategies
- Consider using a database for historical data
- Plan for increased API usage as you scale
- Monitor application performance

## 📞 Support and Resources

### **The Odds API**
- Documentation: https://the-odds-api.com/liveapi/guides/v4/
- Support: support@the-odds-api.com
- Status Page: https://status.the-odds-api.com/

### **Community**
- Reddit: r/sportsbook
- Discord: Various sports betting communities
- GitHub: Open source arbitrage projects

## ⚖️ Legal Disclaimer

This guide is for educational purposes only. Sports betting and arbitrage betting may be subject to local laws and regulations. Always:

- Check your local gambling laws
- Bet responsibly
- Never bet more than you can afford to lose
- Be aware that arbitrage opportunities are rare and may have restrictions
- Understand that sportsbooks may limit or ban accounts that consistently profit

The information provided here is not legal advice. Consult with legal professionals regarding gambling laws in your jurisdiction.