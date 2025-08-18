'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { generateSecureToken, ValidationError } from '../utils/validation';
import { userDatabase } from '@/lib/userDatabase';

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
    
    // Try to find user by email first, then by username
    let dbUser = userDatabase.getUserByUsername(email); // email could be username
    if (!dbUser) {
      // Try to find by email (we'll need to search through users)
      const allUsers = userDatabase.getAllUsers();
      dbUser = allUsers.find(u => u.email?.toLowerCase() === email.toLowerCase()) || null;
      if (dbUser) {
        // Get the user with password for authentication
        dbUser = userDatabase.getUserById(dbUser.id);
      }
    }
    
    if (!dbUser || dbUser.password !== password) {
      throw new ValidationError('Invalid email or password');
    }

    const token = generateSecureToken(64);
    const expires = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
    
    this.tokens.set(token, { userId: dbUser.id, expires });
    
    // Convert to auth User format
    const authUser: User = {
      id: dbUser.id,
      email: dbUser.email,
      username: dbUser.username,
      firstName: dbUser.username, // Use username as firstName for now
      lastName: '',
      role: dbUser.role, // Use the role directly from database
      subscriptionStatus: dbUser.subscriptionStatus, // Use the subscription status directly from database
      createdAt: dbUser.createdAt.toISOString(),
      lastLogin: new Date().toISOString(),
      settings: {
        theme: 'system',
        notifications: true,
        defaultStake: 100,
        preferredBookmakers: ['draftkings', 'betmgm', 'fanduel']
      }
    };
    
    return { user: authUser, token };
  }

  async register(userData: RegisterData): Promise<{ user: User; token: string }> {
    await this.delay(700);
    
    if (this.users.has(userData.email.toLowerCase())) {
      throw new ValidationError('Email already registered');
    }

    const newUser = {
      id: generateSecureToken(16),
      email: userData.email.toLowerCase(),
      username: userData.username,
      firstName: userData.firstName,
      lastName: userData.lastName,
      password: userData.password, // In production, hash this
      role: 'user' as const,
      subscriptionStatus: 'free' as const,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      settings: {
        theme: 'system' as const,
        notifications: true,
        defaultStake: 50,
        preferredBookmakers: ['draftkings', 'betmgm']
      }
    };

    this.users.set(newUser.email, newUser);
    
    const token = generateSecureToken(64);
    const expires = Date.now() + (24 * 60 * 60 * 1000);
    this.tokens.set(token, { userId: newUser.id, expires });

    const { password: _, ...userWithoutPassword } = newUser;
    return { user: userWithoutPassword, token };
  }

  async verifyToken(token: string): Promise<User | null> {
    await this.delay(200);
    
    const tokenData = this.tokens.get(token);
    if (!tokenData || tokenData.expires < Date.now()) {
      return null;
    }

    const dbUser = userDatabase.getUserById(tokenData.userId);
    if (!dbUser) return null;

    // Convert to auth User format
    const authUser: User = {
      id: dbUser.id,
      email: dbUser.email,
      username: dbUser.username,
      firstName: dbUser.username,
      lastName: '',
      role: dbUser.role === 'admin' ? 'admin' : dbUser.role === 'premium' ? 'premium' : 'user',
      subscriptionStatus: dbUser.subscriptionStatus === 'premium' ? 'premium' : 
                          dbUser.subscriptionStatus === 'basic' ? 'free' : 'free',
      createdAt: dbUser.createdAt.toISOString(),
      lastLogin: dbUser.lastLogin.toISOString(),
      settings: {
        theme: 'system',
        notifications: true,  
        defaultStake: 100,
        preferredBookmakers: ['draftkings', 'betmgm', 'fanduel']
      }
    };

    return authUser;
  }

  async updateProfile(userId: string, updates: Partial<User>): Promise<User> {
    await this.delay(300);
    
    const dbUser = userDatabase.getUserById(userId);
    if (!dbUser) {
      throw new ValidationError('User not found');
    }

    // For now, just return the current user since profile updates are not the focus
    const authUser: User = {
      id: dbUser.id,
      email: dbUser.email,
      username: dbUser.username,
      firstName: dbUser.username,
      lastName: '',
      role: dbUser.role === 'admin' ? 'admin' : dbUser.role === 'premium' ? 'premium' : 'user',
      subscriptionStatus: dbUser.subscriptionStatus === 'premium' ? 'premium' : 
                          dbUser.subscriptionStatus === 'basic' ? 'free' : 'free',
      createdAt: dbUser.createdAt.toISOString(),
      lastLogin: dbUser.lastLogin.toISOString(),
      settings: {
        theme: 'system',
        notifications: true,
        defaultStake: 100,
        preferredBookmakers: ['draftkings', 'betmgm', 'fanduel']
      }
    };

    return authUser;
  }

  async resetPassword(email: string): Promise<void> {
    await this.delay(500);
    
    const allUsers = userDatabase.getAllUsers();
    const user = allUsers.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (!user) {
      // Don't reveal if email exists for security
      return;
    }

    // In production, send actual reset email
    console.log(`Password reset email sent to ${email}`);
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