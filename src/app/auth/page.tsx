'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ModernCard, ModernCardHeader, ModernCardBody } from "../../shared/components/ui/ModernCard";
import { ModernButton, NeonButton, GradientButton } from "../../shared/components/ui/ModernButton";
import { ModernBadge, StatusBadge, MetricBadge } from "../../shared/components/ui/ModernBadge";
import { useAuth } from "../../shared/auth/authProvider";

export default function AuthPage() {
  const { login, register, isLoading, isAuthenticated, user } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState<string>('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    username: ''
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      // Redirect based on user role
      const redirectTo = user.role === 'admin' ? '/admin' : '/dashboard';
      router.push(redirectTo);
    }
  }, [isAuthenticated, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      if (mode === 'login') {
        await login(formData.email, formData.password);
        // The useEffect above will handle the redirect
      } else {
        await register({
          email: formData.email,
          password: formData.password,
          username: formData.username
        });
      }
    } catch (error: any) {
      setError(error.message || 'Authentication failed');
    }
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-white">Loading...</p>
        </div>
      </div>
    );
  }

  // Show success message if authenticated (before redirect)
  if (isAuthenticated && user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-green-500 text-6xl mb-4">✓</div>
          <h2 className="text-2xl font-bold text-white mb-2">Welcome back, {user.username}!</h2>
          <p className="text-gray-300">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
      <div className="w-full max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Left Side - Branding */}
          <div className="text-center lg:text-left">
            <Link href="/" className="inline-block mb-8">
              <ModernButton variant="ghost" size="sm">
                ← Back to Home
              </ModernButton>
            </Link>
            
            <div className="mb-8">
              <h1 className="text-4xl lg:text-6xl font-bold mb-4">
                <span className="text-gradient">SportsArb</span>
                <br />
                <span className="text-white">Professional</span>
              </h1>
              <p className="text-xl text-gray-300 mb-6">
                Advanced arbitrage trading platform for professional sports betting
              </p>
            </div>

            {/* Platform Features */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="data-card text-center">
                <div className="text-2xl mb-2">🎯</div>
                <div className="text-sm font-medium text-white">Real-time Scanner</div>
                <div className="text-xs text-gray-400">Live opportunities</div>
              </div>
              <div className="data-card text-center">
                <div className="text-2xl mb-2">📊</div>
                <div className="text-sm font-medium text-white">Portfolio Analytics</div>
                <div className="text-xs text-gray-400">Track performance</div>
              </div>
              <div className="data-card text-center">
                <div className="text-2xl mb-2">⚡</div>
                <div className="text-sm font-medium text-white">Instant Alerts</div>
                <div className="text-xs text-gray-400">Never miss opportunities</div>
              </div>
              <div className="data-card text-center">
                <div className="text-2xl mb-2">🏆</div>
                <div className="text-sm font-medium text-white">Multi-Book Support</div>
                <div className="text-xs text-gray-400">7+ sportsbooks</div>
              </div>
            </div>

            {/* Demo Account Info */}
            <ModernCard variant="glass">
              <ModernCardBody>
                <div className="flex items-center gap-3">
                  <div className="text-2xl">💡</div>
                  <div>
                    <p className="font-semibold text-yellow-400 mb-1">Try Demo Accounts</p>
                    <p className="text-sm text-gray-300">
                      <strong>Admin:</strong> admin@test.com / admin123<br />
                      <strong>Users:</strong> john@example.com / user123<br />
                      <span className="ml-12">sarah@example.com / user123</span><br />
                      <span className="ml-12">mike@example.com / user123</span>
                    </p>
                  </div>
                </div>
              </ModernCardBody>
            </ModernCard>
          </div>

          {/* Right Side - Auth Form */}
          <div className="w-full max-w-md mx-auto">
            <ModernCard variant="default">
              <ModernCardHeader>
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-white mb-2">
                    {mode === 'login' ? 'Welcome Back' : 'Join SportsArb Pro'}
                  </h2>
                  <p className="text-gray-400">
                    {mode === 'login' 
                      ? 'Sign in to access your professional dashboard' 
                      : 'Create your account to start trading'
                    }
                  </p>
                </div>
              </ModernCardHeader>
              
              <ModernCardBody>
                {/* Mode Toggle */}
                <div className="flex bg-gray-800/50 rounded-lg p-1 mb-6">
                  <button
                    onClick={() => setMode('login')}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                      mode === 'login'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-gray-700'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => setMode('register')}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                      mode === 'register'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-gray-700'
                    }`}
                  >
                    Sign Up
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 mb-4">
                      <p className="text-red-400 text-sm">{error}</p>
                    </div>
                  )}
                  
                  {mode === 'register' && (
                    <div>
                      <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                        Username
                      </label>
                      <input
                        type="text"
                        id="username"
                        value={formData.username}
                        onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                        className="w-full px-4 py-3 rounded-lg bg-gray-800/50 text-white placeholder-gray-400 border border-gray-600 focus:border-blue-500 focus:outline-none transition-colors"
                        placeholder="Choose a username"
                        required
                      />
                    </div>
                  )}
                  
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-4 py-3 rounded-lg bg-gray-800/50 text-white placeholder-gray-400 border border-gray-600 focus:border-blue-500 focus:outline-none transition-colors"
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                      Password
                    </label>
                    <input
                      type="password"
                      id="password"
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full px-4 py-3 rounded-lg bg-gray-800/50 text-white placeholder-gray-400 border border-gray-600 focus:border-blue-500 focus:outline-none transition-colors"
                      placeholder="Enter your password"
                      required
                    />
                  </div>

                  {mode === 'register' && (
                    <div>
                      <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                        Confirm Password
                      </label>
                      <input
                        type="password"
                        id="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        className="w-full px-4 py-3 rounded-lg bg-gray-800/50 text-white placeholder-gray-400 border border-gray-600 focus:border-blue-500 focus:outline-none transition-colors"
                        placeholder="Confirm your password"
                        required
                      />
                    </div>
                  )}
                  
                  <div className="pt-4">
                    {mode === 'login' ? (
                      <NeonButton type="submit" size="lg" fullWidth disabled={isLoading}>
                        {isLoading ? 'Signing In...' : 'Sign In to Dashboard'}
                      </NeonButton>
                    ) : (
                      <GradientButton type="submit" size="lg" fullWidth disabled={isLoading}>
                        {isLoading ? 'Creating Account...' : 'Create Pro Account'}
                      </GradientButton>
                    )}
                  </div>
                </form>

                {mode === 'login' && (
                  <div className="mt-6 text-center">
                    <Link href="#" className="text-sm text-blue-400 hover:text-blue-300">
                      Forgot your password?
                    </Link>
                  </div>
                )}

                {/* Social Login Options */}
                <div className="mt-6">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-600"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-gray-800 text-gray-400">Or continue with</span>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <ModernButton variant="secondary" size="md" fullWidth>
                      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Google
                    </ModernButton>
                    <ModernButton variant="secondary" size="md" fullWidth>
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                      </svg>
                      Twitter
                    </ModernButton>
                  </div>
                </div>
              </ModernCardBody>
            </ModernCard>

            {/* Security Notice */}
            <div className="mt-6 text-center text-xs text-gray-400">
              By signing up, you agree to our Terms of Service and Privacy Policy.
              <br />
              🔒 Your data is encrypted and secure.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}