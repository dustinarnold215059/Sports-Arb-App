'use client';

import React, { useState, useEffect } from 'react';
import { ModernCard, ModernCardHeader, ModernCardBody } from '../shared/components/ui/ModernCard';
import { ModernButton, NeonButton, GradientButton } from '../shared/components/ui/ModernButton';
import { ModernBadge, StatusBadge, MetricBadge } from '../shared/components/ui/ModernBadge';
import AlgorithmMarketplace, { Algorithm, MarketplaceStats } from '../lib/marketplace/AlgorithmMarketplace';

interface AlgorithmMarketplaceProps {
  userId?: string;
}

export function AlgorithmMarketplaceComponent({ userId }: AlgorithmMarketplaceProps) {
  const [marketplace] = useState(() => new AlgorithmMarketplace());
  const [algorithms, setAlgorithms] = useState<Algorithm[]>([]);
  const [stats, setStats] = useState<MarketplaceStats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<Algorithm | null>(null);
  const [userCredits, setUserCredits] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMarketplaceData();
  }, [selectedCategory]);

  const loadMarketplaceData = async () => {
    setLoading(true);
    try {
      const [algorithmsData, statsData, credits] = await Promise.all([
        marketplace.getAlgorithms(
          selectedCategory !== 'all' ? { category: selectedCategory as any } : undefined
        ),
        marketplace.getMarketplaceStats(),
        userId ? marketplace.getUserCredits(userId) : 0
      ]);
      
      setAlgorithms(algorithmsData);
      setStats(statsData);
      setUserCredits(credits);
    } catch (error) {
      console.error('Failed to load marketplace data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (searchQuery.trim()) {
      const results = await marketplace.searchAlgorithms(searchQuery);
      setAlgorithms(results);
    } else {
      loadMarketplaceData();
    }
  };

  const handlePurchase = async (algorithmId: string) => {
    if (!userId) {
      // Handle authentication required
      return;
    }

    try {
      await marketplace.purchaseAlgorithm(userId, algorithmId);
      const newCredits = await marketplace.getUserCredits(userId);
      setUserCredits(newCredits);
      // Show success message
    } catch (error) {
      console.error('Purchase failed:', error);
      // Show error message
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      arbitrage: '⚡',
      value_betting: '💎',
      risk_management: '🛡️',
      analytics: '📊',
      optimization: '🎯'
    };
    return icons[category as keyof typeof icons] || '🔧';
  };

  const getRatingStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push('⭐');
    }
    if (hasHalfStar) {
      stars.push('⭐');
    }
    
    return stars.join('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-300">Loading marketplace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <ModernCard variant="gradient">
          <ModernCardHeader>
            <div className="flex items-center justify-between w-full">
              <div>
                <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                  Algorithm Marketplace
                </h1>
                <p className="text-gray-300">Discover and purchase advanced betting algorithms from the community</p>
              </div>
              {userId && (
                <div className="text-right">
                  <div className="text-2xl font-bold text-yellow-400">{userCredits}</div>
                  <div className="text-gray-300 text-sm">Credits</div>
                </div>
              )}
            </div>
          </ModernCardHeader>
        </ModernCard>

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <ModernCard variant="neon" hover>
              <ModernCardBody className="text-center">
                <div className="text-3xl mb-2">📚</div>
                <div className="text-2xl font-bold text-cyan-400">{stats.totalAlgorithms}</div>
                <div className="text-gray-300 text-sm">Algorithms</div>
              </ModernCardBody>
            </ModernCard>

            <ModernCard variant="glass" hover>
              <ModernCardBody className="text-center">
                <div className="text-3xl mb-2">👥</div>
                <div className="text-2xl font-bold text-emerald-400">{stats.totalAuthors}</div>
                <div className="text-gray-300 text-sm">Authors</div>
              </ModernCardBody>
            </ModernCard>

            <ModernCard variant="default" hover>
              <ModernCardBody className="text-center">
                <div className="text-3xl mb-2">⬇️</div>
                <div className="text-2xl font-bold text-purple-400">{stats.totalDownloads.toLocaleString()}</div>
                <div className="text-gray-300 text-sm">Downloads</div>
              </ModernCardBody>
            </ModernCard>

            <ModernCard variant="gradient" hover>
              <ModernCardBody className="text-center">
                <div className="text-3xl mb-2">💰</div>
                <div className="text-2xl font-bold text-yellow-400">${stats.totalRevenue.toLocaleString()}</div>
                <div className="text-gray-300 text-sm">Revenue</div>
              </ModernCardBody>
            </ModernCard>
          </div>
        )}

        {/* Search and Filters */}
        <ModernCard variant="default">
          <ModernCardBody>
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Search algorithms..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    className="flex-1 px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                  />
                  <NeonButton onClick={handleSearch}>
                    🔍 Search
                  </NeonButton>
                </div>
              </div>

              {/* Category Filter */}
              <div className="flex flex-wrap gap-2">
                {['all', 'arbitrage', 'value_betting', 'risk_management', 'analytics', 'optimization'].map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedCategory === category
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {category === 'all' ? '📂 All' : `${getCategoryIcon(category)} ${category.replace('_', ' ')}`}
                  </button>
                ))}
              </div>
            </div>
          </ModernCardBody>
        </ModernCard>

        {/* Algorithm Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {algorithms.map((algorithm) => (
            <ModernCard key={algorithm.id} variant="default" hover onClick={() => setSelectedAlgorithm(algorithm)}>
              <ModernCardBody>
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-1">{algorithm.name}</h3>
                      <p className="text-gray-400 text-sm line-clamp-2">{algorithm.description}</p>
                    </div>
                    <div className="text-2xl ml-2">{getCategoryIcon(algorithm.category)}</div>
                  </div>

                  {/* Author */}
                  <div className="flex items-center gap-2">
                    <div className="text-sm text-gray-300">by {algorithm.author.username}</div>
                    {algorithm.author.verified && <div className="text-cyan-400">✓</div>}
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-green-400 font-semibold">{algorithm.metrics.successRate}%</div>
                      <div className="text-gray-400">Success Rate</div>
                    </div>
                    <div>
                      <div className="text-cyan-400 font-semibold">{algorithm.metrics.avgMargin}%</div>
                      <div className="text-gray-400">Avg Margin</div>
                    </div>
                  </div>

                  {/* Rating and Price */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-400">{getRatingStars(algorithm.rating)}</span>
                      <span className="text-gray-300 text-sm">({algorithm.reviewCount})</span>
                    </div>
                    <div className="text-right">
                      {algorithm.price === 0 ? (
                        <ModernBadge variant="success" size="sm">FREE</ModernBadge>
                      ) : (
                        <div className="text-lg font-bold text-yellow-400">
                          {algorithm.currency === 'USD' ? '$' : ''}{algorithm.price}
                          {algorithm.currency === 'credits' ? ' credits' : ''}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1">
                    {algorithm.tags.slice(0, 3).map((tag) => (
                      <ModernBadge key={tag} variant="ghost" size="xs">
                        {tag}
                      </ModernBadge>
                    ))}
                    {algorithm.tags.length > 3 && (
                      <ModernBadge variant="ghost" size="xs">
                        +{algorithm.tags.length - 3}
                      </ModernBadge>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <ModernButton 
                      variant="ghost" 
                      size="sm" 
                      fullWidth
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedAlgorithm(algorithm);
                      }}
                    >
                      📖 Details
                    </ModernButton>
                    {algorithm.price === 0 ? (
                      <NeonButton 
                        size="sm" 
                        fullWidth
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePurchase(algorithm.id);
                        }}
                      >
                        💾 Download
                      </NeonButton>
                    ) : (
                      <GradientButton 
                        size="sm" 
                        fullWidth
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePurchase(algorithm.id);
                        }}
                      >
                        💳 Purchase
                      </GradientButton>
                    )}
                  </div>
                </div>
              </ModernCardBody>
            </ModernCard>
          ))}
        </div>

        {algorithms.length === 0 && (
          <ModernCard variant="neon">
            <ModernCardBody className="text-center py-12">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-white mb-2">No algorithms found</h3>
              <p className="text-gray-300">Try adjusting your search criteria or browse different categories</p>
            </ModernCardBody>
          </ModernCard>
        )}

        {/* Featured Algorithm */}
        {stats?.featuredAlgorithm && (
          <ModernCard variant="gradient">
            <ModernCardHeader>
              <h3 className="text-xl font-semibold text-white">🌟 Featured Algorithm</h3>
            </ModernCardHeader>
            <ModernCardBody>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <h4 className="text-2xl font-bold text-white mb-2">{stats.featuredAlgorithm.name}</h4>
                  <p className="text-gray-300 mb-4">{stats.featuredAlgorithm.description}</p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <MetricBadge value={`${stats.featuredAlgorithm.metrics.successRate}%`} label="Success" trend="up" />
                    <MetricBadge value={`${stats.featuredAlgorithm.metrics.avgMargin}%`} label="Margin" trend="up" />
                    <MetricBadge value={stats.featuredAlgorithm.downloads.toString()} label="Downloads" />
                    <MetricBadge value={stats.featuredAlgorithm.rating.toString()} label="Rating" trend="up" />
                  </div>
                </div>
                
                <div className="flex flex-col justify-center">
                  <div className="text-center mb-4">
                    <div className="text-3xl font-bold text-yellow-400 mb-1">
                      {stats.featuredAlgorithm.price === 0 ? 'FREE' : 
                       `${stats.featuredAlgorithm.currency === 'USD' ? '$' : ''}${stats.featuredAlgorithm.price}${stats.featuredAlgorithm.currency === 'credits' ? ' credits' : ''}`}
                    </div>
                    <div className="text-gray-300">by {stats.featuredAlgorithm.author.username}</div>
                  </div>
                  
                  <div className="space-y-2">
                    <NeonButton 
                      fullWidth 
                      size="lg"
                      onClick={() => setSelectedAlgorithm(stats.featuredAlgorithm)}
                    >
                      🌟 View Featured
                    </NeonButton>
                    <ModernButton 
                      variant="ghost" 
                      fullWidth
                      onClick={() => handlePurchase(stats.featuredAlgorithm.id)}
                    >
                      {stats.featuredAlgorithm.price === 0 ? '💾 Download' : '💳 Purchase'}
                    </ModernButton>
                  </div>
                </div>
              </div>
            </ModernCardBody>
          </ModernCard>
        )}
      </div>

      {/* Algorithm Detail Modal */}
      {selectedAlgorithm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <ModernCard variant="neon">
              <ModernCardHeader>
                <div className="flex items-center justify-between w-full">
                  <h2 className="text-2xl font-bold text-white">{selectedAlgorithm.name}</h2>
                  <button
                    onClick={() => setSelectedAlgorithm(null)}
                    className="text-gray-400 hover:text-white text-xl"
                  >
                    ✕
                  </button>
                </div>
              </ModernCardHeader>
              <ModernCardBody>
                <div className="space-y-6">
                  <p className="text-gray-300">{selectedAlgorithm.description}</p>
                  
                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-400">{selectedAlgorithm.metrics.successRate}%</div>
                      <div className="text-gray-400 text-sm">Success Rate</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-cyan-400">{selectedAlgorithm.metrics.avgMargin}%</div>
                      <div className="text-gray-400 text-sm">Avg Margin</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-400">{selectedAlgorithm.metrics.totalOpportunities}</div>
                      <div className="text-gray-400 text-sm">Opportunities</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-400">{selectedAlgorithm.metrics.avgExecutionTime}ms</div>
                      <div className="text-gray-400 text-sm">Exec Time</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-400">{selectedAlgorithm.metrics.riskScore}</div>
                      <div className="text-gray-400 text-sm">Risk Score</div>
                    </div>
                  </div>

                  {/* Technical Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-2">Supported Sports</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedAlgorithm.supportedSports.map((sport) => (
                          <ModernBadge key={sport} variant="primary" size="sm">
                            {sport}
                          </ModernBadge>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-2">Supported Bookmakers</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedAlgorithm.supportedBookmakers.map((bookmaker) => (
                          <ModernBadge key={bookmaker} variant="secondary" size="sm">
                            {bookmaker}
                          </ModernBadge>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-4 pt-4">
                    <ModernButton variant="ghost" onClick={() => setSelectedAlgorithm(null)}>
                      Cancel
                    </ModernButton>
                    {selectedAlgorithm.price === 0 ? (
                      <NeonButton fullWidth onClick={() => handlePurchase(selectedAlgorithm.id)}>
                        💾 Download Free
                      </NeonButton>
                    ) : (
                      <GradientButton fullWidth onClick={() => handlePurchase(selectedAlgorithm.id)}>
                        💳 Purchase for {selectedAlgorithm.currency === 'USD' ? '$' : ''}{selectedAlgorithm.price}{selectedAlgorithm.currency === 'credits' ? ' credits' : ''}
                      </GradientButton>
                    )}
                  </div>
                </div>
              </ModernCardBody>
            </ModernCard>
          </div>
        </div>
      )}
    </div>
  );
}

export default AlgorithmMarketplaceComponent;