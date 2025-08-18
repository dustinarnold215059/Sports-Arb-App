'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { ModernCard, ModernCardHeader, ModernCardBody } from "../../shared/components/ui/ModernCard";
import { ModernButton, NeonButton } from "../../shared/components/ui/ModernButton";
import { ModernBadge } from "../../shared/components/ui/ModernBadge";
import { AdminDashboardSkeleton } from "../../shared/components/ui/LoadingSkeleton";
import { ErrorBoundary } from "@/components/ErrorBoundary";

interface UserStats {
  totalBets: number;
  totalProfit: number;
  successRate: number;
  avgProfitPerBet: number;
  lastActivity: Date;
  arbitrageOpportunitiesFound: number;
  totalStakeAmount: number;
  bestArbitrageProfit: number;
  scansPerformed: number;
  apiRequestsUsed: number;
}

interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'premium' | 'basic' | 'pro';
  subscriptionStatus: 'premium' | 'basic' | 'trial' | 'pro';
  subscriptionExpiry: string;
  createdAt: string;
  lastLogin: string;
  isActive: boolean;
  stats: UserStats;
}

interface PlatformStats {
  activeUsers: number;
  totalUsers: number;
  premiumUsers: number;
  basicUsers: number;
  proUsers: number;
  totalProfit: number;
  totalBets: number;
  totalApiRequests: number;
  avgSuccessRate: number;
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (data.success) {
        setIsAuthenticated(true);
        fetchUsers();
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    
    try {
      // Get portfolio data from client-side betTracker for each user
      const clientPortfolioData: { [userId: string]: unknown } = {};
      
      // Import betTracker on client side
      const { betTracker } = await import('@/lib/betTracking');
      
      // Get portfolio stats for each user from client-side localStorage
      ['1', '2', '3'].forEach(userId => {
        const originalUser = betTracker.currentUserId;
        betTracker.setCurrentUser(userId);
        const portfolioStats = betTracker.getPortfolioStats();
        const userBets = betTracker.getAllBets();
        const userGroups = betTracker.getArbitrageGroups();
        
        clientPortfolioData[userId] = {
          portfolioStats,
          userBets: userBets.length,
          userGroups: userGroups.length
        };
        
        betTracker.setCurrentUser(originalUser);
      });

      // Send the portfolio data to the API
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'getUsers',
          portfolioData: clientPortfolioData
        })
      });
      
      const data = await response.json();

      if (data.success) {
        setUsers(data.users);
        setPlatformStats(data.platformStats);
      }
    } catch (err) {
      setError('Failed to fetch users');
      console.error('Fetch users error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateUserRole = async (userId: string, role: string, subscriptionStatus: string, expiryDays: number) => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateUserRole',
          userId,
          data: { role, subscriptionStatus, expiryDays }
        })
      });

      const data = await response.json();
      if (data.success) {
        fetchUsers();
        setShowEditModal(false);
      }
    } catch (err) {
      setError('Failed to update user role');
    }
  };

  const toggleUserStatus = async (userId: string) => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggleStatus',
          userId
        })
      });

      const data = await response.json();
      if (data.success) {
        fetchUsers();
      }
    } catch (err) {
      setError('Failed to update user status');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <ModernCard variant="glass" className="w-full max-w-md">
          <ModernCardHeader>
            <div className="flex items-center justify-between mb-4">
              <Link href="/">
                <ModernButton variant="ghost" size="sm">
                  ← Back to Home
                </ModernButton>
              </Link>
            </div>
            <h1 className="text-2xl font-bold text-white text-center">🔐 Admin Access</h1>
            <p className="text-gray-300 text-center">Enter admin credentials to continue</p>
          </ModernCardHeader>
          <ModernCardBody>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter username"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter password"
                  required
                />
              </div>
              {error && (
                <div className="p-3 bg-red-900/20 border border-red-800 rounded-lg text-red-300 text-sm">
                  {error}
                </div>
              )}
              <NeonButton type="submit" disabled={loading} fullWidth>
                {loading ? 'Authenticating...' : 'Login'}
              </NeonButton>
            </form>
            
            <div className="mt-6 p-4 bg-blue-900/20 border border-blue-800 rounded-lg">
              <h3 className="text-sm font-medium text-blue-300 mb-2">Test Accounts:</h3>
              <div className="text-xs text-blue-400 space-y-1">
                <div><strong>Admin:</strong> admin@test.com / admin123</div>
                <div><strong>User 1:</strong> john_trader / user123</div>
                <div><strong>User 2:</strong> sarah_sports / user123</div>
              </div>
            </div>
          </ModernCardBody>
        </ModernCard>
      </div>
    );
  }

  // Show loading skeleton while fetching data  
  if (isAuthenticated && loading && users.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="bg-gray-900/80 backdrop-blur-xl border-b border-gray-700/50 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gradient">🛡️ Admin Dashboard</h1>
                <p className="text-gray-400 text-sm">Loading system data...</p>
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 py-8">
          <AdminDashboardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('Admin Dashboard Error:', error, errorInfo);
        // Could integrate with error tracking service here
      }}
    >
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="bg-gray-900/80 backdrop-blur-xl border-b border-gray-700/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gradient">🛡️ Admin Dashboard</h1>
              <p className="text-gray-400 text-sm">User Management & Platform Analytics</p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/admin/database">
                <ModernButton variant="primary">
                  🗄️ Database
                </ModernButton>
              </Link>
              <Link href="/">
                <ModernButton variant="secondary">
                  ← Back to Home
                </ModernButton>
              </Link>
              <ModernButton variant="ghost" onClick={() => setIsAuthenticated(false)}>
                Logout
              </ModernButton>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Platform Stats */}
        {platformStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
            <div className="metric-card">
              <div className="metric-value text-green-400">
                {platformStats.activeUsers}
              </div>
              <div className="metric-label">Active Users</div>
              <div className="metric-change">
                <span>{platformStats.totalUsers} total</span>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-value text-blue-400">
                {platformStats.premiumUsers}
              </div>
              <div className="metric-label">Premium Users</div>
              <div className="metric-change">
                <span>{((platformStats.premiumUsers / platformStats.totalUsers) * 100).toFixed(1)}% of total</span>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-value text-yellow-400">
                {platformStats.proUsers}
              </div>
              <div className="metric-label">Pro Users</div>
              <div className="metric-change">
                <span>{((platformStats.proUsers / platformStats.totalUsers) * 100).toFixed(1)}% of total</span>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-value text-gray-400">
                {platformStats.basicUsers}
              </div>
              <div className="metric-label">Basic Users</div>
              <div className="metric-change">
                <span>{((platformStats.basicUsers / platformStats.totalUsers) * 100).toFixed(1)}% of total</span>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-value profit-loss positive">
                ${platformStats.totalProfit.toLocaleString()}
              </div>
              <div className="metric-label">Total Platform Profit</div>
              <div className="metric-change">
                <span>{platformStats.totalBets} total bets</span>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-value text-purple-400">
                {platformStats.avgSuccessRate.toFixed(1)}%
              </div>
              <div className="metric-label">Avg Success Rate</div>
              <div className="metric-change">
                <span>{platformStats.totalApiRequests.toLocaleString()} API calls</span>
              </div>
            </div>
          </div>
        )}

        {/* Users Table */}
        <ModernCard variant="default">
          <ModernCardHeader>
            <div className="flex items-center justify-between w-full">
              <div>
                <h2 className="text-xl font-semibold text-white">👥 User Management</h2>
                <p className="text-gray-400 text-sm">Manage user accounts, subscriptions, and view real portfolio statistics</p>
              </div>
              <ModernButton onClick={fetchUsers} variant="primary">
                Refresh
              </ModernButton>
            </div>
          </ModernCardHeader>
          <ModernCardBody padding="none">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Subscription</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Portfolio Stats</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-800/30">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-white">{user.username}</div>
                          <div className="text-sm text-gray-400">{user.email}</div>
                          <div className="text-xs text-gray-500">
                            Last login: {new Date(user.lastLogin).toLocaleDateString()}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <ModernBadge variant={user.role === 'admin' ? 'error' : user.role === 'pro' ? 'warning' : user.role === 'premium' ? 'success' : 'primary'} size="sm">
                          {user.role}
                        </ModernBadge>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <ModernBadge variant={user.subscriptionStatus === 'premium' ? 'success' : user.subscriptionStatus === 'pro' ? 'warning' : user.subscriptionStatus === 'basic' ? 'primary' : 'secondary'} size="sm">
                            {user.subscriptionStatus}
                          </ModernBadge>
                          <div className="text-xs text-gray-400 mt-1">
                            Expires: {new Date(user.subscriptionExpiry).toLocaleDateString()}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm space-y-1">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Profit:</span>
                            <span className={user.stats.totalProfit >= 0 ? 'text-green-400 font-medium' : 'text-red-400 font-medium'}>
                              ${user.stats.totalProfit.toFixed(0)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Bets:</span>
                            <span className="text-blue-400 font-medium">{user.stats.totalBets}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Win Rate:</span>
                            <span className="text-purple-400 font-medium">{user.stats.successRate.toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Arbitrages:</span>
                            <span className="text-yellow-400 font-medium">{user.stats.arbitrageOpportunitiesFound}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <ModernBadge variant={user.isActive ? 'success' : 'error'} size="sm">
                          {user.isActive ? 'Active' : 'Inactive'}
                        </ModernBadge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <ModernButton
                            size="sm"
                            variant="primary"
                            onClick={() => {
                              setSelectedUser(user);
                              setShowEditModal(true);
                            }}
                          >
                            Edit
                          </ModernButton>
                          <ModernButton
                            size="sm"
                            variant={user.isActive ? 'error' : 'success'}
                            onClick={() => toggleUserStatus(user.id)}
                          >
                            {user.isActive ? 'Disable' : 'Enable'}
                          </ModernButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ModernCardBody>
        </ModernCard>

        {/* Edit User Modal */}
        {showEditModal && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <ModernCard variant="glass" className="w-full max-w-md">
              <ModernCardHeader>
                <h3 className="text-lg font-semibold text-white">Edit User: {selectedUser.username}</h3>
              </ModernCardHeader>
              <ModernCardBody>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">User Role</label>
                    <select
                      className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                      defaultValue={selectedUser.role}
                      id="user-role"
                    >
                      <option value="admin">Admin</option>
                      <option value="pro">Pro</option>
                      <option value="premium">Premium</option>
                      <option value="basic">Basic</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Subscription Status</label>
                    <select
                      className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                      defaultValue={selectedUser.subscriptionStatus}
                      id="subscription-status"
                    >
                      <option value="premium">Premium</option>
                      <option value="pro">Pro</option>
                      <option value="basic">Basic</option>
                      <option value="trial">Trial</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Extend Subscription (days)</label>
                    <input
                      type="number"
                      defaultValue={30}
                      className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                      id="expiry-days"
                    />
                  </div>
                  <div className="flex space-x-3">
                    <ModernButton
                      variant="primary"
                      onClick={() => {
                        const role = (document.getElementById('user-role') as HTMLSelectElement).value as 'admin' | 'pro' | 'premium' | 'basic';
                        const status = (document.getElementById('subscription-status') as HTMLSelectElement).value as 'premium' | 'pro' | 'basic' | 'trial';
                        const days = parseInt((document.getElementById('expiry-days') as HTMLInputElement).value);
                        updateUserRole(selectedUser.id, role, status, days);
                      }}
                      fullWidth
                    >
                      Update
                    </ModernButton>
                    <ModernButton
                      variant="ghost"
                      onClick={() => setShowEditModal(false)}
                      fullWidth
                    >
                      Cancel
                    </ModernButton>
                  </div>
                </div>
              </ModernCardBody>
            </ModernCard>
          </div>
        )}
      </div>
    </div>
    </ErrorBoundary>
  );
}