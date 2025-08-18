'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { memo } from 'react';
import { useAuth } from '../shared/auth/authProvider';
import { ModernButton } from '../shared/components/ui/ModernButton';

interface NavigationProps {
  onAuthClick?: (mode: 'login' | 'register') => void;
}

export const Navigation = memo(function Navigation({ onAuthClick }: NavigationProps = {}) {
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuth();

  // Default auth handler that does nothing if not provided
  const handleAuth = onAuthClick || (() => {});

  const getBaseNavigationItems = () => {
    // Pro users don't see pricing since they already have the highest tier
    if (isAuthenticated && user?.role === 'pro') {
      return [{ href: '/', label: 'Home', icon: '🏠' }];
    }
    return [
      { href: '/', label: 'Home', icon: '🏠' },
      { href: '/pricing', label: 'Pricing', icon: '💰' },
    ];
  };

  const baseNavigationItems = getBaseNavigationItems();

  const premiumNavigationItems = [
    { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/arbitrage', label: 'Scanner', icon: '🎯' },
    { href: '/calculator', label: 'Calculator', icon: '🧮' },
    { href: '/portfolio', label: 'Portfolio', icon: '💼' },
  ];

  const basicNavigationItems = [
    { href: '/demo', label: 'Demo', icon: '🧪' }
  ];

  const basicUserPremiumItems = [
    { href: '/demo-dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/demo-arbitrage', label: 'Scanner', icon: '🎯' },
    { href: '/demo-calculator', label: 'Calculator', icon: '🧮' },
    { href: '/demo-portfolio', label: 'Portfolio', icon: '💼' },
  ];

  // Build navigation items based on user role
  let navigationItems = [...baseNavigationItems];
  
  if (isAuthenticated) {
    if (user?.role === 'admin') {
      // Admin users see all premium features
      navigationItems = [...navigationItems, ...premiumNavigationItems];
      // Admin users also see demo
      navigationItems = [...navigationItems, ...basicNavigationItems];
    } else if (user?.role === 'premium') {
      // Premium users see dashboard, scanner, and demo
      const premiumOnlyItems = [
        { href: '/dashboard', label: 'Dashboard', icon: '📊' },
        { href: '/arbitrage', label: 'Scanner', icon: '🎯' },
      ];
      navigationItems = [...navigationItems, ...premiumOnlyItems];
      // Premium users also see demo
      navigationItems = [...navigationItems, ...basicNavigationItems];
    } else if (user?.role === 'basic') {
      // Basic users see demo versions of premium features
      navigationItems = [...navigationItems, ...basicUserPremiumItems];
      // Basic users also see demo
      navigationItems = [...navigationItems, ...basicNavigationItems];
    } else if (user?.role === 'pro') {
      // Pro users see all premium features (no demo)
      navigationItems = [...navigationItems, ...premiumNavigationItems];
    }
  }

  // Add admin link for admin users only
  const allNavigationItems = isAuthenticated && user?.role === 'admin' 
    ? [...navigationItems, { href: '/admin', label: 'Admin', icon: '👨‍💼' }]
    : navigationItems;

  const isActivePage = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="bg-gray-900/80 backdrop-blur-xl border-b border-gray-700/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo/Brand */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl">⚡</span>
              <div>
                <h1 className="text-xl font-bold text-gradient">SportsArb Pro</h1>
                <p className="text-gray-400 text-xs">Arbitrage Trading Platform</p>
              </div>
            </Link>
          </div>
          
          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {allNavigationItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActivePage(item.href)
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                    : item.href === '/admin' 
                      ? 'text-red-300 hover:text-red-200 hover:bg-red-900/20'
                      : item.href === '/demo'
                        ? 'text-blue-300 hover:text-blue-200 hover:bg-blue-900/20'
                        : 'text-gray-300 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>

          {/* User Actions */}
          <div className="flex items-center gap-4">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-4">
                <div className="hidden sm:block text-right">
                  <div className="text-sm font-medium text-white">
                    {user.username}
                  </div>
                  <div className="text-xs text-gray-400 capitalize">
                    {user.role} • {user.subscriptionStatus}
                  </div>
                </div>
                <ModernButton
                  onClick={logout}
                  variant="ghost"
                  size="sm"
                  className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                >
                  Sign Out
                </ModernButton>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <ModernButton 
                  variant="ghost" 
                  size="sm"
                  onClick={() => handleAuth('login')}
                >
                  Sign In
                </ModernButton>
                <ModernButton 
                  variant="primary" 
                  size="sm"
                  onClick={() => handleAuth('register')}
                >
                  Get Started
                </ModernButton>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden mt-4 pt-4 border-t border-gray-700/50">
          <div className="flex items-center justify-between">
            {allNavigationItems.slice(0, 6).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActivePage(item.href)
                    ? 'text-blue-400'
                    : item.href === '/admin'
                      ? 'text-red-400 hover:text-red-300'
                      : item.href === '/demo'
                        ? 'text-blue-300 hover:text-blue-200'
                        : 'text-gray-400 hover:text-white'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});