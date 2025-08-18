/**
 * Data Compression and Optimization System
 * Reduces bandwidth usage and improves performance
 */

interface CompressionOptions {
  level: 'fast' | 'balanced' | 'max';
  enableGzip: boolean;
  minSizeForCompression: number;
  maxCacheSize: number;
}

interface CompressedData {
  compressed: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  algorithm: string;
  timestamp: number;
}

export class DataCompressionManager {
  private static instance: DataCompressionManager;
  private compressionCache: Map<string, CompressedData> = new Map();
  private readonly defaultOptions: CompressionOptions = {
    level: 'balanced',
    enableGzip: true,
    minSizeForCompression: 1024, // 1KB
    maxCacheSize: 100
  };

  static getInstance(): DataCompressionManager {
    if (!DataCompressionManager.instance) {
      DataCompressionManager.instance = new DataCompressionManager();
    }
    return DataCompressionManager.instance;
  }

  /**
   * Simple text compression using LZ-string-like algorithm
   */
  private simpleCompress(data: string): string {
    const dictionary: { [key: string]: number } = {};
    const result: (string | number)[] = [];
    let dictSize = 256;
    
    // Initialize dictionary with single characters
    for (let i = 0; i < 256; i++) {
      dictionary[String.fromCharCode(i)] = i;
    }

    let w = '';
    for (let i = 0; i < data.length; i++) {
      const c = data[i];
      const wc = w + c;
      
      if (dictionary[wc] !== undefined) {
        w = wc;
      } else {
        result.push(dictionary[w]);
        dictionary[wc] = dictSize++;
        w = c;
      }
    }

    if (w !== '') {
      result.push(dictionary[w]);
    }

    return result.join(',');
  }

  /**
   * Simple text decompression
   */
  private simpleDecompress(compressed: string): string {
    const dictionary: { [key: number]: string } = {};
    const data = compressed.split(',').map(Number);
    let dictSize = 256;
    
    // Initialize dictionary
    for (let i = 0; i < 256; i++) {
      dictionary[i] = String.fromCharCode(i);
    }

    let w = String.fromCharCode(data[0]);
    let result = w;
    
    for (let i = 1; i < data.length; i++) {
      const k = data[i];
      let entry: string;
      
      if (dictionary[k] !== undefined) {
        entry = dictionary[k];
      } else if (k === dictSize) {
        entry = w + w[0];
      } else {
        throw new Error('Invalid compressed data');
      }
      
      result += entry;
      dictionary[dictSize++] = w + entry[0];
      w = entry;
    }

    return result;
  }

  /**
   * JSON data optimization - remove unnecessary whitespace and optimize structure
   */
  private optimizeJSON(data: any): string {
    // Remove null/undefined values and empty arrays/objects
    const cleanData = this.deepClean(data);
    
    // Use compact JSON representation
    return JSON.stringify(cleanData, (key, value) => {
      // Round numbers to reasonable precision
      if (typeof value === 'number' && !Number.isInteger(value)) {
        return Math.round(value * 100) / 100;
      }
      return value;
    });
  }

  private deepClean(obj: any): any {
    if (obj === null || obj === undefined) {
      return undefined;
    }
    
    if (Array.isArray(obj)) {
      const cleaned = obj.map(item => this.deepClean(item)).filter(item => item !== undefined);
      return cleaned.length > 0 ? cleaned : undefined;
    }
    
    if (typeof obj === 'object') {
      const cleaned: any = {};
      let hasValidProps = false;
      
      for (const [key, value] of Object.entries(obj)) {
        const cleanedValue = this.deepClean(value);
        if (cleanedValue !== undefined) {
          cleaned[key] = cleanedValue;
          hasValidProps = true;
        }
      }
      
      return hasValidProps ? cleaned : undefined;
    }
    
    return obj;
  }

  /**
   * Compress data using the best available method
   */
  async compressData(
    data: any,
    key?: string,
    options?: Partial<CompressionOptions>
  ): Promise<CompressedData> {
    const opts = { ...this.defaultOptions, ...options };
    
    // Convert to string if not already
    let stringData: string;
    if (typeof data === 'string') {
      stringData = data;
    } else {
      stringData = this.optimizeJSON(data);
    }

    const originalSize = new Blob([stringData]).size;
    
    // Skip compression for small data
    if (originalSize < opts.minSizeForCompression) {
      return {
        compressed: stringData,
        originalSize,
        compressedSize: originalSize,
        compressionRatio: 1,
        algorithm: 'none',
        timestamp: Date.now()
      };
    }

    // Check cache first
    if (key && this.compressionCache.has(key)) {
      const cached = this.compressionCache.get(key)!;
      if (Date.now() - cached.timestamp < 5 * 60 * 1000) { // 5 minutes cache
        return cached;
      }
    }

    let compressedString: string;
    let algorithm: string;

    try {
      // Try browser compression APIs first
      if (typeof CompressionStream !== 'undefined' && opts.enableGzip) {
        compressedString = await this.gzipCompress(stringData);
        algorithm = 'gzip';
      } else {
        // Fallback to simple compression
        compressedString = this.simpleCompress(stringData);
        algorithm = 'simple';
      }
    } catch (error) {
      console.warn('Compression failed, using original data:', error);
      compressedString = stringData;
      algorithm = 'none';
    }

    const compressedSize = new Blob([compressedString]).size;
    const compressionRatio = originalSize / compressedSize;

    const result: CompressedData = {
      compressed: compressedString,
      originalSize,
      compressedSize,
      compressionRatio,
      algorithm,
      timestamp: Date.now()
    };

    // Cache the result
    if (key) {
      this.compressionCache.set(key, result);
      this.maintainCacheSize(opts.maxCacheSize);
    }

    return result;
  }

  /**
   * Decompress data
   */
  async decompressData(compressedData: CompressedData): Promise<any> {
    try {
      let decompressed: string;

      switch (compressedData.algorithm) {
        case 'gzip':
          decompressed = await this.gzipDecompress(compressedData.compressed);
          break;
        case 'simple':
          decompressed = this.simpleDecompress(compressedData.compressed);
          break;
        case 'none':
        default:
          decompressed = compressedData.compressed;
          break;
      }

      // Try to parse as JSON, fallback to string
      try {
        return JSON.parse(decompressed);
      } catch {
        return decompressed;
      }
    } catch (error) {
      console.error('Decompression failed:', error);
      throw new Error('Failed to decompress data');
    }
  }

  /**
   * GZIP compression using browser APIs
   */
  private async gzipCompress(data: string): Promise<string> {
    const stream = new CompressionStream('gzip');
    const writer = stream.writable.getWriter();
    const reader = stream.readable.getReader();

    // Write data
    await writer.write(new TextEncoder().encode(data));
    await writer.close();

    // Read compressed data
    const chunks: Uint8Array[] = [];
    let done = false;

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      if (value) {
        chunks.push(value);
      }
    }

    // Convert to base64 string
    const compressedArray = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
    let offset = 0;
    for (const chunk of chunks) {
      compressedArray.set(chunk, offset);
      offset += chunk.length;
    }

    return btoa(String.fromCharCode(...compressedArray));
  }

  /**
   * GZIP decompression using browser APIs
   */
  private async gzipDecompress(compressedData: string): Promise<string> {
    // Convert from base64
    const binaryString = atob(compressedData);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const stream = new DecompressionStream('gzip');
    const writer = stream.writable.getWriter();
    const reader = stream.readable.getReader();

    // Write compressed data
    await writer.write(bytes);
    await writer.close();

    // Read decompressed data
    const chunks: Uint8Array[] = [];
    let done = false;

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      if (value) {
        chunks.push(value);
      }
    }

    // Convert back to string
    const decompressedArray = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
    let offset = 0;
    for (const chunk of chunks) {
      decompressedArray.set(chunk, offset);
      offset += chunk.length;
    }

    return new TextDecoder().decode(decompressedArray);
  }

  private maintainCacheSize(maxSize: number): void {
    if (this.compressionCache.size <= maxSize) return;

    // Remove oldest entries
    const entries = Array.from(this.compressionCache.entries()).sort(
      (a, b) => a[1].timestamp - b[1].timestamp
    );

    const toRemove = entries.slice(0, this.compressionCache.size - maxSize);
    toRemove.forEach(([key]) => {
      this.compressionCache.delete(key);
    });
  }

  /**
   * Get compression statistics
   */
  getCompressionStats(): {
    cacheSize: number;
    averageCompressionRatio: number;
    totalOriginalSize: number;
    totalCompressedSize: number;
    totalSavings: number;
    algorithmUsage: Record<string, number>;
  } {
    const entries = Array.from(this.compressionCache.values());
    
    if (entries.length === 0) {
      return {
        cacheSize: 0,
        averageCompressionRatio: 0,
        totalOriginalSize: 0,
        totalCompressedSize: 0,
        totalSavings: 0,
        algorithmUsage: {}
      };
    }

    const totalOriginalSize = entries.reduce((sum, entry) => sum + entry.originalSize, 0);
    const totalCompressedSize = entries.reduce((sum, entry) => sum + entry.compressedSize, 0);
    const averageCompressionRatio = entries.reduce((sum, entry) => sum + entry.compressionRatio, 0) / entries.length;
    
    const algorithmUsage: Record<string, number> = {};
    entries.forEach(entry => {
      algorithmUsage[entry.algorithm] = (algorithmUsage[entry.algorithm] || 0) + 1;
    });

    return {
      cacheSize: entries.length,
      averageCompressionRatio,
      totalOriginalSize,
      totalCompressedSize,
      totalSavings: totalOriginalSize - totalCompressedSize,
      algorithmUsage
    };
  }

  /**
   * Clear compression cache
   */
  clearCache(): void {
    this.compressionCache.clear();
  }
}

/**
 * Odds Data Optimizer - Specialized for sports betting data
 */
export class OddsDataOptimizer {
  private compressionManager: DataCompressionManager;

  constructor() {
    this.compressionManager = DataCompressionManager.getInstance();
  }

  /**
   * Optimize odds data structure for storage and transmission
   */
  optimizeOddsData(rawData: any[]): any {
    return rawData.map(game => {
      const optimized: any = {
        id: game.id,
        g: game.game || `${game.away_team} vs ${game.home_team}`, // Shortened 'game'
        t1: game.away_team?.substring(0, 10), // Shortened team names
        t2: game.home_team?.substring(0, 10),
        ct: game.commence_time,
        s: game.sport_title?.substring(0, 10), // Shortened sport
      };

      // Optimize bookmaker data
      if (game.bookmakers) {
        optimized.b = game.bookmakers.map((bm: any) => ({
          k: bm.key.substring(0, 8), // Shortened bookmaker key
          t: bm.title.substring(0, 15), // Shortened title
          m: bm.markets?.map((market: any) => ({
            k: market.key,
            o: market.outcomes?.map((outcome: any) => ({
              n: outcome.name.substring(0, 15),
              p: Math.round(outcome.price * 100) / 100, // Round to 2 decimals
              pt: outcome.point ? Math.round(outcome.point * 10) / 10 : undefined
            }))
          }))
        }));
      }

      return optimized;
    });
  }

  /**
   * Restore optimized odds data to full format
   */
  restoreOddsData(optimizedData: any[]): any {
    return optimizedData.map(game => ({
      id: game.id,
      game: game.g,
      away_team: game.t1,
      home_team: game.t2,
      commence_time: game.ct,
      sport_title: game.s,
      bookmakers: game.b?.map((bm: any) => ({
        key: bm.k,
        title: bm.t,
        markets: bm.m?.map((market: any) => ({
          key: market.k,
          outcomes: market.o?.map((outcome: any) => ({
            name: outcome.n,
            price: outcome.p,
            point: outcome.pt
          }))
        }))
      }))
    }));
  }

  /**
   * Compress and optimize odds data
   */
  async compressOddsData(rawData: any[], cacheKey?: string): Promise<CompressedData> {
    const optimizedData = this.optimizeOddsData(rawData);
    return this.compressionManager.compressData(optimizedData, cacheKey, {
      level: 'max',
      enableGzip: true,
      minSizeForCompression: 512
    });
  }

  /**
   * Decompress and restore odds data
   */
  async decompressOddsData(compressedData: CompressedData): Promise<any[]> {
    const optimizedData = await this.compressionManager.decompressData(compressedData);
    return this.restoreOddsData(optimizedData);
  }
}

/**
 * Image and Asset Optimization
 */
export class AssetOptimizer {
  /**
   * Compress image data URL
   */
  compressImageDataURL(dataURL: string, quality: number = 0.8): Promise<string> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions (max 800px width)
        const maxWidth = 800;
        const scale = Math.min(1, maxWidth / img.width);
        
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        // Draw and compress
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressedDataURL = canvas.toDataURL('image/jpeg', quality);
        
        resolve(compressedDataURL);
      };

      img.src = dataURL;
    });
  }

  /**
   * Generate responsive image URLs
   */
  generateResponsiveImageURLs(baseURL: string): {
    small: string;
    medium: string;
    large: string;
  } {
    // This would typically integrate with a CDN or image service
    return {
      small: `${baseURL}?w=400&q=70`,
      medium: `${baseURL}?w=800&q=80`,
      large: `${baseURL}?w=1200&q=85`
    };
  }
}

// Export singleton instances
export const dataCompressionManager = DataCompressionManager.getInstance();
export const oddsDataOptimizer = new OddsDataOptimizer();
export const assetOptimizer = new AssetOptimizer();

// Utility functions
export function calculateCompressionSavings(original: number, compressed: number): {
  savedBytes: number;
  savedPercentage: number;
  compressionRatio: string;
} {
  const savedBytes = original - compressed;
  const savedPercentage = (savedBytes / original) * 100;
  const compressionRatio = `${original}:${compressed}`;

  return {
    savedBytes,
    savedPercentage,
    compressionRatio
  };
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Browser support detection
export function checkCompressionSupport(): {
  gzip: boolean;
  brotli: boolean;
  simpleCompression: boolean;
} {
  return {
    gzip: typeof CompressionStream !== 'undefined',
    brotli: typeof CompressionStream !== 'undefined', // Same API
    simpleCompression: true // Always supported
  };
}