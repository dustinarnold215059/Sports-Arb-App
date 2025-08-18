export interface BookmakerCredentials {
  bookmaker: string;
  apiKey?: string;
  username?: string;
  password?: string;
  accessToken?: string;
  refreshToken?: string;
  sandbox?: boolean;
}

export interface MarketInfo {
  id: string;
  name: string;
  odds: number;
  available: boolean;
  maxStake: number;
  minStake: number;
}

export interface GameInfo {
  id: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  startTime: Date;
  markets: MarketInfo[];
}

export interface BetRequest {
  gameId: string;
  marketId: string;
  selection: string;
  odds: number;
  stake: number;
  reference?: string;
}

export interface BetResponse {
  success: boolean;
  betId?: string;
  transactionId?: string;
  actualOdds?: number;
  actualStake?: number;
  error?: string;
  errorCode?: string;
}

export interface AccountInfo {
  balance: number;
  currency: string;
  bonusBalance?: number;
  withdrawableBalance: number;
  lastUpdated: Date;
}

export abstract class BookmakerAPIBase {
  protected credentials: BookmakerCredentials;
  protected rateLimiter: Map<string, number> = new Map();
  protected maxRequestsPerMinute = 60;

  constructor(credentials: BookmakerCredentials) {
    this.credentials = credentials;
  }

  abstract authenticate(): Promise<boolean>;
  abstract getAccountInfo(): Promise<AccountInfo>;
  abstract getGames(sport?: string): Promise<GameInfo[]>;
  abstract placeBet(request: BetRequest): Promise<BetResponse>;
  abstract cancelBet(betId: string): Promise<boolean>;
  abstract getBetStatus(betId: string): Promise<string>;

  protected async checkRateLimit(): Promise<void> {
    const now = Date.now();
    const minute = Math.floor(now / 60000);
    const key = `${this.credentials.bookmaker}_${minute}`;
    
    const requests = this.rateLimiter.get(key) || 0;
    if (requests >= this.maxRequestsPerMinute) {
      const waitTime = 60000 - (now % 60000);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.rateLimiter.set(key, requests + 1);
  }

  protected async makeRequest<T>(
    url: string, 
    options: RequestInit = {}
  ): Promise<T> {
    await this.checkRateLimit();

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
        ...options.headers
      }
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  protected abstract getAuthHeaders(): Record<string, string>;
}

export class DraftKingsAPI extends BookmakerAPIBase {
  private baseUrl = 'https://api.draftkings.com/v1';

  async authenticate(): Promise<boolean> {
    try {
      // DraftKings authentication logic
      const response = await this.makeRequest<any>(`${this.baseUrl}/auth/login`, {
        method: 'POST',
        body: JSON.stringify({
          username: this.credentials.username,
          password: this.credentials.password
        })
      });
      
      this.credentials.accessToken = response.access_token;
      return true;
    } catch (error) {
      console.error('DraftKings authentication failed:', error);
      return false;
    }
  }

  async getAccountInfo(): Promise<AccountInfo> {
    const response = await this.makeRequest<any>(`${this.baseUrl}/account/balance`);
    
    return {
      balance: response.balance,
      currency: response.currency || 'USD',
      bonusBalance: response.bonus_balance,
      withdrawableBalance: response.withdrawable_balance,
      lastUpdated: new Date()
    };
  }

  async getGames(sport?: string): Promise<GameInfo[]> {
    const url = sport 
      ? `${this.baseUrl}/games?sport=${sport}`
      : `${this.baseUrl}/games`;
      
    const response = await this.makeRequest<any>(url);
    
    return response.games.map((game: any) => ({
      id: game.id,
      sport: game.sport,
      homeTeam: game.home_team,
      awayTeam: game.away_team,
      startTime: new Date(game.start_time),
      markets: game.markets.map((market: any) => ({
        id: market.id,
        name: market.name,
        odds: market.odds,
        available: market.available,
        maxStake: market.max_stake,
        minStake: market.min_stake
      }))
    }));
  }

  async placeBet(request: BetRequest): Promise<BetResponse> {
    try {
      const response = await this.makeRequest<any>(`${this.baseUrl}/bets`, {
        method: 'POST',
        body: JSON.stringify({
          game_id: request.gameId,
          market_id: request.marketId,
          selection: request.selection,
          odds: request.odds,
          stake: request.stake,
          reference: request.reference
        })
      });

      return {
        success: true,
        betId: response.bet_id,
        transactionId: response.transaction_id,
        actualOdds: response.actual_odds,
        actualStake: response.actual_stake
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'PLACEMENT_FAILED'
      };
    }
  }

  async cancelBet(betId: string): Promise<boolean> {
    try {
      await this.makeRequest(`${this.baseUrl}/bets/${betId}/cancel`, {
        method: 'POST'
      });
      return true;
    } catch (error) {
      console.error('Failed to cancel bet:', error);
      return false;
    }
  }

  async getBetStatus(betId: string): Promise<string> {
    const response = await this.makeRequest<any>(`${this.baseUrl}/bets/${betId}`);
    return response.status;
  }

  protected getAuthHeaders(): Record<string, string> {
    return this.credentials.accessToken 
      ? { 'Authorization': `Bearer ${this.credentials.accessToken}` }
      : {};
  }
}

export class BetMGMAPI extends BookmakerAPIBase {
  private baseUrl = 'https://api.betmgm.com/v2';

  async authenticate(): Promise<boolean> {
    try {
      const response = await this.makeRequest<any>(`${this.baseUrl}/auth`, {
        method: 'POST',
        body: JSON.stringify({
          api_key: this.credentials.apiKey,
          username: this.credentials.username,
          password: this.credentials.password
        })
      });
      
      this.credentials.accessToken = response.token;
      return true;
    } catch (error) {
      console.error('BetMGM authentication failed:', error);
      return false;
    }
  }

  async getAccountInfo(): Promise<AccountInfo> {
    const response = await this.makeRequest<any>(`${this.baseUrl}/account`);
    
    return {
      balance: response.available_balance,
      currency: response.currency || 'USD',
      withdrawableBalance: response.withdrawable_balance,
      lastUpdated: new Date()
    };
  }

  async getGames(sport?: string): Promise<GameInfo[]> {
    const params = new URLSearchParams();
    if (sport) params.append('sport', sport);
    
    const response = await this.makeRequest<any>(`${this.baseUrl}/events?${params}`);
    
    return response.events.map((event: any) => ({
      id: event.event_id,
      sport: event.sport_name,
      homeTeam: event.home_team,
      awayTeam: event.away_team,
      startTime: new Date(event.start_time),
      markets: event.markets.map((market: any) => ({
        id: market.market_id,
        name: market.market_name,
        odds: market.odds,
        available: market.active,
        maxStake: market.max_stake,
        minStake: market.min_stake
      }))
    }));
  }

  async placeBet(request: BetRequest): Promise<BetResponse> {
    try {
      const response = await this.makeRequest<any>(`${this.baseUrl}/bets/place`, {
        method: 'POST',
        body: JSON.stringify({
          event_id: request.gameId,
          market_id: request.marketId,
          selection: request.selection,
          odds: request.odds,
          stake: request.stake,
          reference_id: request.reference
        })
      });

      return {
        success: response.success,
        betId: response.bet_id,
        transactionId: response.transaction_id,
        actualOdds: response.odds,
        actualStake: response.stake
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'BET_PLACEMENT_ERROR'
      };
    }
  }

  async cancelBet(betId: string): Promise<boolean> {
    try {
      const response = await this.makeRequest<any>(`${this.baseUrl}/bets/${betId}/cancel`, {
        method: 'DELETE'
      });
      return response.cancelled;
    } catch (error) {
      console.error('Failed to cancel BetMGM bet:', error);
      return false;
    }
  }

  async getBetStatus(betId: string): Promise<string> {
    const response = await this.makeRequest<any>(`${this.baseUrl}/bets/${betId}/status`);
    return response.status;
  }

  protected getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    
    if (this.credentials.apiKey) {
      headers['X-API-Key'] = this.credentials.apiKey;
    }
    
    if (this.credentials.accessToken) {
      headers['Authorization'] = `Bearer ${this.credentials.accessToken}`;
    }
    
    return headers;
  }
}

export class BookmakerAPIManager {
  private apis: Map<string, BookmakerAPIBase> = new Map();
  private credentials: Map<string, BookmakerCredentials> = new Map();

  constructor() {
    // Initialize with supported bookmakers
    this.registerBookmaker('draftkings', DraftKingsAPI);
    this.registerBookmaker('betmgm', BetMGMAPI);
  }

  private registerBookmaker(name: string, apiClass: new (credentials: BookmakerCredentials) => BookmakerAPIBase) {
    // Store API class for later instantiation
  }

  async addBookmaker(credentials: BookmakerCredentials): Promise<boolean> {
    try {
      let api: BookmakerAPIBase;
      
      switch (credentials.bookmaker.toLowerCase()) {
        case 'draftkings':
          api = new DraftKingsAPI(credentials);
          break;
        case 'betmgm':
          api = new BetMGMAPI(credentials);
          break;
        default:
          throw new Error(`Unsupported bookmaker: ${credentials.bookmaker}`);
      }

      const authenticated = await api.authenticate();
      if (!authenticated) {
        throw new Error('Authentication failed');
      }

      this.apis.set(credentials.bookmaker, api);
      this.credentials.set(credentials.bookmaker, credentials);
      
      return true;
    } catch (error) {
      console.error(`Failed to add bookmaker ${credentials.bookmaker}:`, error);
      return false;
    }
  }

  async removeBookmaker(bookmaker: string): Promise<void> {
    this.apis.delete(bookmaker);
    this.credentials.delete(bookmaker);
  }

  getAPI(bookmaker: string): BookmakerAPIBase | undefined {
    return this.apis.get(bookmaker);
  }

  getAvailableBookmakers(): string[] {
    return Array.from(this.apis.keys());
  }

  async getAllAccountInfo(): Promise<Map<string, AccountInfo>> {
    const accounts = new Map<string, AccountInfo>();
    
    for (const [bookmaker, api] of this.apis) {
      try {
        const accountInfo = await api.getAccountInfo();
        accounts.set(bookmaker, accountInfo);
      } catch (error) {
        console.error(`Failed to get account info for ${bookmaker}:`, error);
      }
    }
    
    return accounts;
  }

  async placeBetOnBookmaker(bookmaker: string, request: BetRequest): Promise<BetResponse> {
    const api = this.apis.get(bookmaker);
    if (!api) {
      return {
        success: false,
        error: `Bookmaker ${bookmaker} not configured`,
        errorCode: 'BOOKMAKER_NOT_FOUND'
      };
    }

    return api.placeBet(request);
  }

  async getAllGames(sport?: string): Promise<Map<string, GameInfo[]>> {
    const allGames = new Map<string, GameInfo[]>();
    
    for (const [bookmaker, api] of this.apis) {
      try {
        const games = await api.getGames(sport);
        allGames.set(bookmaker, games);
      } catch (error) {
        console.error(`Failed to get games from ${bookmaker}:`, error);
        allGames.set(bookmaker, []);
      }
    }
    
    return allGames;
  }
}

export default BookmakerAPIManager;