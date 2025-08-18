'use client';

import { useState, useEffect } from 'react';
import { requestDeduplicationManager, optimizedOddsAPI, performanceMonitor } from '@/lib/performance/requestDeduplication';
import { dataCompressionManager, oddsDataOptimizer } from '@/lib/performance/dataCompression';
import { arbitrageWorkerManager } from '@/lib/workers/arbitrageWorkerManager';
import { Card, CardHeader, CardBody, Button, Badge } from '../shared/components/ui';

interface PerformanceStats {
  cache: any;
  compression: any;
  workers: any;
  performance: any;
}

export function PerformanceMonitor() {
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (autoRefresh) {
      interval = setInterval(loadStats, 5000); // Refresh every 5 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      const [cacheStats, compressionStats, workerStats, performanceStats] = await Promise.all([
        Promise.resolve(requestDeduplicationManager.getCacheStats()),
        Promise.resolve(dataCompressionManager.getCompressionStats()),
        Promise.resolve(arbitrageWorkerManager.getStatus()),
        Promise.resolve(performanceMonitor.getAllMetrics())
      ]);

      setStats({
        cache: cacheStats,
        compression: compressionStats,
        workers: workerStats,
        performance: performanceStats
      });
    } catch (error) {
      console.error('Failed to load performance stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearCache = () => {
    requestDeduplicationManager.invalidateCache();
    dataCompressionManager.clearCache();
    loadStats();
  };

  const handleTestPerformance = async () => {
    setIsLoading(true);
    try {
      // Test various performance aspects
      const startTime = performance.now();
      
      // Test worker performance
      const workerTest = await arbitrageWorkerManager.performanceTest();
      
      // Test compression
      const testData = Array(1000).fill(0).map((_, i) => ({
        id: i,
        game: `Team ${i} vs Team ${i + 1}`,
        odds: { team1: Math.random() * 300 - 150, team2: Math.random() * 300 - 150 },
        timestamp: Date.now()
      }));
      
      const compressionResult = await oddsDataOptimizer.compressOddsData(testData, 'performance-test');
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // Record metrics
      performanceMonitor.recordMetric('worker_performance_test', workerTest.averageCalculationTime);
      performanceMonitor.recordMetric('compression_test', compressionResult.compressionRatio);
      performanceMonitor.recordMetric('total_performance_test', totalTime);
      
      alert(`Performance Test Results:
Worker Avg Time: ${workerTest.averageCalculationTime.toFixed(2)}ms
Compression Ratio: ${compressionResult.compressionRatio.toFixed(2)}x
Total Test Time: ${totalTime.toFixed(2)}ms
Data Compressed: ${formatBytes(compressionResult.originalSize)} → ${formatBytes(compressionResult.compressedSize)}`);
      
      loadStats();
    } catch (error) {
      console.error('Performance test failed:', error);
      alert('Performance test failed. Check console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  const formatNumber = (value: number): string => {
    return value.toLocaleString();
  };

  if (!stats) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            📊 Performance Monitor
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            System performance, caching, and optimization metrics
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => setAutoRefresh(!autoRefresh)}
            variant={autoRefresh ? 'primary' : 'secondary'}
            size="sm"
          >
            {autoRefresh ? '⏸️ Pause' : '▶️ Auto Refresh'}
          </Button>
          <Button
            onClick={loadStats}
            disabled={isLoading}
            variant="ghost"
            size="sm"
          >
            🔄 Refresh
          </Button>
          <Button
            onClick={handleTestPerformance}
            disabled={isLoading}
            variant="secondary"
            size="sm"
          >
            🚀 Run Test
          </Button>
          <Button
            onClick={handleClearCache}
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-700"
          >
            🗑️ Clear Cache
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardBody className="text-center p-4">
            <div className="text-2xl mb-2">📦</div>
            <div className="text-2xl font-bold text-blue-600">
              {formatNumber(stats.cache.size)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Cached Requests</div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="text-center p-4">
            <div className="text-2xl mb-2">🗜️</div>
            <div className="text-2xl font-bold text-green-600">
              {stats.compression.averageCompressionRatio.toFixed(1)}x
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Avg Compression</div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="text-center p-4">
            <div className="text-2xl mb-2">⚡</div>
            <div className="text-2xl font-bold text-purple-600">
              {stats.workers.availableWorkers}/{stats.workers.totalWorkers}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Available Workers</div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="text-center p-4">
            <div className="text-2xl mb-2">📈</div>
            <div className="text-2xl font-bold text-orange-600">
              {formatPercentage(stats.cache.hitRate)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Cache Hit Rate</div>
          </CardBody>
        </Card>
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cache Performance */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">📦 Cache Performance</h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Cache Size</div>
                  <div className="text-xl font-semibold">{formatNumber(stats.cache.size)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Hit Rate</div>
                  <div className="text-xl font-semibold text-green-600">
                    {formatPercentage(stats.cache.hitRate)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Error Rate</div>
                  <div className="text-xl font-semibold text-red-600">
                    {formatPercentage(stats.cache.errorRate)}
                  </div>
                </div>
              </div>

              {stats.cache.topKeys.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Top Cached Requests</h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {stats.cache.topKeys.slice(0, 5).map((item: any, index: number) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="truncate flex-1 mr-2" title={item.key}>
                          {item.key}
                        </span>
                        <div className="flex gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {item.requests}
                          </Badge>
                          {item.errors > 0 && (
                            <Badge variant="danger" className="text-xs">
                              {item.errors} errors
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Compression Stats */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">🗜️ Compression Performance</h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Avg Ratio</div>
                  <div className="text-xl font-semibold text-green-600">
                    {stats.compression.averageCompressionRatio.toFixed(1)}x
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Cache Size</div>
                  <div className="text-xl font-semibold">
                    {formatNumber(stats.compression.cacheSize)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total Original Size</div>
                  <div className="text-lg font-semibold">
                    {formatBytes(stats.compression.totalOriginalSize)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total Compressed Size</div>
                  <div className="text-lg font-semibold text-green-600">
                    {formatBytes(stats.compression.totalCompressedSize)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total Savings</div>
                  <div className="text-lg font-semibold text-blue-600">
                    {formatBytes(stats.compression.totalSavings)}
                  </div>
                </div>
              </div>

              {Object.keys(stats.compression.algorithmUsage).length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Algorithm Usage</h4>
                  <div className="space-y-1">
                    {Object.entries(stats.compression.algorithmUsage).map(([algorithm, count]) => (
                      <div key={algorithm} className="flex justify-between text-sm">
                        <span className="capitalize">{algorithm}</span>
                        <Badge variant="secondary" className="text-xs">
                          {count as number}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Worker Performance */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">⚡ Worker Performance</h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total Workers</div>
                  <div className="text-xl font-semibold">{stats.workers.totalWorkers}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Available</div>
                  <div className="text-xl font-semibold text-green-600">
                    {stats.workers.availableWorkers}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Active Calculations</div>
                  <div className="text-xl font-semibold text-orange-600">
                    {stats.workers.activeCalculations}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Queued</div>
                  <div className="text-xl font-semibold">
                    {stats.workers.queuedCalculations}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Worker Utilization</span>
                  <span>
                    {formatPercentage(
                      stats.workers.totalWorkers > 0 
                        ? ((stats.workers.totalWorkers - stats.workers.availableWorkers) / stats.workers.totalWorkers) * 100
                        : 0
                    )}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${stats.workers.totalWorkers > 0 
                        ? ((stats.workers.totalWorkers - stats.workers.availableWorkers) / stats.workers.totalWorkers) * 100
                        : 0}%`
                    }}
                  />
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">📈 Performance Metrics</h3>
          </CardHeader>
          <CardBody>
            {Object.keys(stats.performance).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(stats.performance).map(([metric, data]: [string, any]) => (
                  <div key={metric} className="border-b border-gray-200 dark:border-gray-700 pb-2 last:border-b-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium capitalize">
                        {metric.replace(/_/g, ' ')}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {data?.count || 0} samples
                      </Badge>
                    </div>
                    {data && (
                      <div className="grid grid-cols-3 gap-2 text-xs text-gray-600 dark:text-gray-400">
                        <div>Avg: {data.avg?.toFixed(2)}ms</div>
                        <div>Min: {data.min?.toFixed(2)}ms</div>
                        <div>Max: {data.max?.toFixed(2)}ms</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <div className="text-2xl mb-2">📊</div>
                <p>No performance metrics recorded yet.</p>
                <p className="text-sm">Run the performance test to generate data.</p>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* System Info */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">🖥️ System Information</h3>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-600 dark:text-gray-400">User Agent</div>
              <div className="font-mono text-xs truncate" title={navigator.userAgent}>
                {navigator.userAgent.substring(0, 50)}...
              </div>
            </div>
            <div>
              <div className="text-gray-600 dark:text-gray-400">Hardware Concurrency</div>
              <div className="font-semibold">
                {(navigator as any).hardwareConcurrency || 'Unknown'} cores
              </div>
            </div>
            <div>
              <div className="text-gray-600 dark:text-gray-400">Connection</div>
              <div className="font-semibold">
                {(navigator as any).connection?.effectiveType || 'Unknown'}
              </div>
            </div>
            <div>
              <div className="text-gray-600 dark:text-gray-400">Memory (if supported)</div>
              <div className="font-semibold">
                {(performance as any).memory 
                  ? formatBytes((performance as any).memory.usedJSHeapSize)
                  : 'Not available'
                }
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-gray-900 dark:text-white">Processing...</span>
          </div>
        </div>
      )}
    </div>
  );
}