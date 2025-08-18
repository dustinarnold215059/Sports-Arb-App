'use client';

import { useAuth } from "../shared/auth/authProvider";
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ModernCard, ModernCardHeader, ModernCardBody } from "../shared/components/ui/ModernCard";
import { ModernButton } from "../shared/components/ui/ModernButton";
import Link from 'next/link';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requirePremium?: boolean;
  allowDemo?: boolean;
  requireProOrAdmin?: boolean; // Only allow Pro or Admin users
}

export function ProtectedRoute({ 
  children, 
  requirePremium = false, 
  allowDemo = false,
  requireProOrAdmin = false
}: ProtectedRouteProps) {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth');
      return;
    }

    // If Pro/Admin is required and user is not Pro or Admin, redirect to home
    if (requireProOrAdmin && user?.role !== 'admin' && user?.role !== 'pro') {
      router.push('/');
      return;
    }

    // If premium is required and user is basic, redirect unless demo is allowed
    if (requirePremium && user?.role === 'basic' && !allowDemo) {
      router.push('/demo');
      return;
    }
  }, [isAuthenticated, user, requirePremium, allowDemo, requireProOrAdmin, router]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <ModernCard variant="glass" className="w-full max-w-md">
          <ModernCardHeader>
            <h1 className="text-2xl font-bold text-white text-center">🔐 Authentication Required</h1>
            <p className="text-gray-300 text-center">Please log in to access this page</p>
          </ModernCardHeader>
          <ModernCardBody>
            <div className="flex flex-col gap-4">
              <Link href="/auth">
                <ModernButton variant="primary" fullWidth>
                  Login / Sign Up
                </ModernButton>
              </Link>
              <Link href="/">
                <ModernButton variant="ghost" fullWidth>
                  Back to Home
                </ModernButton>
              </Link>
            </div>
          </ModernCardBody>
        </ModernCard>
      </div>
    );
  }

  // If Pro/Admin is required and user is not Pro or Admin, show upgrade prompt
  if (requireProOrAdmin && user?.role !== 'admin' && user?.role !== 'pro') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <ModernCard variant="glass" className="w-full max-w-md">
          <ModernCardHeader>
            <h1 className="text-2xl font-bold text-white text-center">🏆 Pro Required</h1>
            <p className="text-gray-300 text-center">This feature requires a Pro subscription</p>
          </ModernCardHeader>
          <ModernCardBody>
            <div className="space-y-4">
              <div className="p-4 bg-purple-900/20 border border-purple-800 rounded-lg">
                <h3 className="text-sm font-medium text-purple-300 mb-2">Pro Features:</h3>
                <ul className="text-xs text-purple-400 space-y-1">
                  <li>• Advanced portfolio analytics</li>
                  <li>• Professional betting calculator</li>
                  <li>• Export capabilities</li>
                  <li>• Priority customer support</li>
                  <li>• Custom alert settings</li>
                </ul>
              </div>
              <div className="flex flex-col gap-3">
                <Link href="/pricing">
                  <ModernButton variant="primary" fullWidth>
                    Upgrade to Pro
                  </ModernButton>
                </Link>
                <Link href="/">
                  <ModernButton variant="ghost" fullWidth>
                    Back to Home
                  </ModernButton>
                </Link>
              </div>
            </div>
          </ModernCardBody>
        </ModernCard>
      </div>
    );
  }

  // If premium is required and user is basic (and demo not allowed), show upgrade prompt
  if (requirePremium && user?.role === 'basic' && !allowDemo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <ModernCard variant="glass" className="w-full max-w-md">
          <ModernCardHeader>
            <h1 className="text-2xl font-bold text-white text-center">⭐ Premium Required</h1>
            <p className="text-gray-300 text-center">This feature requires a premium subscription</p>
          </ModernCardHeader>
          <ModernCardBody>
            <div className="space-y-4">
              <div className="p-4 bg-blue-900/20 border border-blue-800 rounded-lg">
                <h3 className="text-sm font-medium text-blue-300 mb-2">Premium Features:</h3>
                <ul className="text-xs text-blue-400 space-y-1">
                  <li>• Live arbitrage scanning</li>
                  <li>• Real-time market data</li>
                  <li>• Multiple sportsbook coverage</li>
                  <li>• Advanced betting calculator</li>
                  <li>• Opportunity alerts</li>
                </ul>
              </div>
              <div className="flex flex-col gap-3">
                <Link href="/pricing">
                  <ModernButton variant="primary" fullWidth>
                    Upgrade to Premium
                  </ModernButton>
                </Link>
                <Link href="/demo">
                  <ModernButton variant="secondary" fullWidth>
                    Try Demo Mode
                  </ModernButton>
                </Link>
                <Link href="/">
                  <ModernButton variant="ghost" fullWidth>
                    Back to Home
                  </ModernButton>
                </Link>
              </div>
            </div>
          </ModernCardBody>
        </ModernCard>
      </div>
    );
  }

  return <>{children}</>;
}