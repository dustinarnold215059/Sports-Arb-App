'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { generateSecureToken, ValidationError } from '../utils/validation';

// Types
export interface User {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  role: 'admin' | 'premium' | 'basic' | 'pro';
  subscriptionStatus: 'premium' | 'basic' | 'trial' | 'pro';
  createdAt: string;
  lastLogin: string;
  settings: {
    theme: 'light' | 'dark' | 'system';
    notifications: boolean;
    defaultStake: number;
    preferredBookmakers: string[];
  };
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  token: string | null;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  refreshToken: () => Promise<void>;
}

interface RegisterData {
  email: string;
  password: string;
  username: string;
  firstName?: string;
  lastName?: string;
}

// Create Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Local Storage Keys
const AUTH_STORAGE_KEY = 'sports_betting_auth';
const TOKEN_STORAGE_KEY = 'sports_betting_token';

// Mock API - Replace with actual backend
class AuthAPI {
  private tokens: Map<string, { userId: string; expires: number }> = new Map();

  constructor() {
    // Users are now managed by userDatabase
  }

  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    await this.delay(500); // Simulate network delay
    
    // For demo purposes, use predefined user credentials
    const demoUsers: Record<string, User> = {
      'john@example.com': {
        id: 'user_john',
        email: 'john@example.com',
        username: 'john_trader',
        firstName: 'John',
        lastName: 'Trader',
        role: 'premium',
        subscriptionStatus: 'premium',
        createdAt: '2024-01-15T00:00:00.000Z',
        lastLogin: new Date().toISOString(),
        settings: {
          theme: 'system',
          notifications: true,
          defaultStake: 100,
          preferredBookmakers: ['draftkings', 'betmgm', 'fanduel']
        }
      },
      'sarah@example.com': {
        id: 'user_sarah',
        email: 'sarah@example.com',
        username: 'sarah_sports',
        firstName: 'Sarah',
        lastName: 'Sports',
        role: 'basic',
        subscriptionStatus: 'basic',
        createdAt: '2024-02-01T00:00:00.000Z',
        lastLogin: new Date().toISOString(),
        settings: {
          theme: 'system',
          notifications: true,
          defaultStake: 50,
          preferredBookmakers: ['draftkings', 'betmgm']
        }
      },
      'mike@example.com': {
        id: 'user_mike',
        email: 'mike@example.com',
        username: 'mike_pro',
        firstName: 'Mike',
        lastName: 'Pro',
        role: 'pro',
        subscriptionStatus: 'pro',
        createdAt: '2024-03-10T00:00:00.000Z',
        lastLogin: new Date().toISOString(),
        settings: {
          theme: 'system',
          notifications: true,
          defaultStake: 200,
          preferredBookmakers: ['draftkings', 'betmgm', 'fanduel', 'caesars']
        }
      }
    };

    const demoPasswords: Record<string, string> = {
      'john@example.com': 'user123',
      'sarah@example.com': 'user123', 
      'mike@example.com': 'user123'
    };

    const user = demoUsers[email.toLowerCase()];
    const validPassword = demoPasswords[email.toLowerCase()];

    if (!user || password !== validPassword) {
      throw new ValidationError('Invalid email or password');
    }

    const token = generateSecureToken(64);
    const expires = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
    
    this.tokens.set(token, { userId: user.id, expires });
    
    return { user, token };
  }

  async register(userData: RegisterData): Promise<{ user: User; token: string }> {
    await this.delay(700);
    
    // For now, registration is not implemented on the backend
    // Return a demo response
    throw new ValidationError('Registration is currently not available. Please use existing demo accounts.');
  }

  async verifyToken(token: string): Promise<User | null> {
    await this.delay(200);
    
    try {
      const tokenData = this.tokens.get(token);
      if (!tokenData || tokenData.expires < Date.now()) {
        return null;
      }

      // For demo purposes, if token is valid in memory, assume user is valid
      // In production, you'd validate against the server
      return null; // Force re-login for now
    } catch (error) {
      console.error('Token verification error:', error);
      return null;
    }
  }

  async updateProfile(userId: string, updates: Partial<User>): Promise<User> {
    await this.delay(300);
    
    // For demo purposes, profile updates not implemented
    throw new ValidationError('Profile updates not implemented in demo');
  }

  async resetPassword(email: string): Promise<void> {
    await this.delay(500);
    
    // For demo purposes, just log the action
    console.log(`Password reset email would be sent to ${email}`);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Provider Component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    token: null
  });

  const authAPI = new AuthAPI();

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem(TOKEN_STORAGE_KEY);
        const userData = localStorage.getItem(AUTH_STORAGE_KEY);
        
        if (!token || !userData) {
          setState(prev => ({ ...prev, isLoading: false }));
          return;
        }

        // Parse stored user data
        try {
          const user = JSON.parse(userData);
          
          // For demo purposes, skip token validation to fix persistence
          // In production, you'd want to validate the token with the server
          setState({
            user,
            token,
            isAuthenticated: true,
            isLoading: false
          });
          
        } catch (parseError) {
          console.error('Failed to parse stored user data:', parseError);
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          localStorage.removeItem(AUTH_STORAGE_KEY);
          setState(prev => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const { user, token } = await authAPI.login(email, password);
      
      // Store in localStorage
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      
      setState({
        user,
        token,
        isAuthenticated: true,
        isLoading: false
      });
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const register = async (userData: RegisterData) => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const { user, token } = await authAPI.register(userData);
      
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      
      setState({
        user,
        token,
        isAuthenticated: true,
        isLoading: false
      });
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    
    setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false
    });
  };

  const updateProfile = async (updates: Partial<User>) => {
    if (!state.user) throw new ValidationError('Not authenticated');
    
    try {
      const updatedUser = await authAPI.updateProfile(state.user.id, updates);
      
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
      setState(prev => ({
        ...prev,
        user: updatedUser
      }));
    } catch (error) {
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    await authAPI.resetPassword(email);
  };

  const verifyEmail = async (token: string) => {
    // Implementation would verify email token
    console.log('Email verification not implemented in demo');
  };

  const refreshToken = async () => {
    if (!state.token) throw new ValidationError('No token to refresh');
    
    const user = await authAPI.verifyToken(state.token);
    if (!user) {
      logout();
      throw new ValidationError('Token refresh failed');
    }
  };

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    updateProfile,
    resetPassword,
    verifyEmail,
    refreshToken
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Protected Route Component
export function ProtectedRoute({ 
  children, 
  requiredRole,
  fallback 
}: { 
  children: React.ReactNode;
  requiredRole?: User['role'];
  fallback?: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return fallback || (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Authentication Required
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Please log in to access this feature.
        </p>
      </div>
    );
  }

  if (requiredRole && user?.role !== requiredRole && user?.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Premium Feature
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          This feature requires a {requiredRole} subscription.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}