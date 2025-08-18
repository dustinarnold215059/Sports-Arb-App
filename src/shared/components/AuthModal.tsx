'use client';

import React, { useState } from 'react';
import { useAuth } from '../auth/authProvider';
import { sanitizeInput, validateEmail, ValidationError } from '../utils/validation';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
}

export function AuthModal({ isOpen, onClose, initialMode = 'login' }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>(initialMode);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState('');
  
  const { login, register, resetPassword } = useAuth();

  // Form states
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    username: '',
    firstName: '',
    lastName: ''
  });

  if (!isOpen) return null;

  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Sanitize data before validation
    const sanitizedData = {
      ...formData,
      email: sanitizeInput(formData.email),
      username: sanitizeInput(formData.username),
      firstName: sanitizeInput(formData.firstName),
      lastName: sanitizeInput(formData.lastName)
    };

    // Email validation
    if (!sanitizedData.email) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(sanitizedData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (mode !== 'reset') {
      // Password validation
      if (!formData.password) {
        newErrors.password = 'Password is required';
      } else if (formData.password.length < 3) {
        newErrors.password = 'Password must be at least 3 characters';
      }

      if (mode === 'register') {
        // Username validation
        if (!sanitizedData.username) {
          newErrors.username = 'Username is required';
        } else if (sanitizedData.username.length < 3) {
          newErrors.username = 'Username must be at least 3 characters';
        }

        // Confirm password
        if (formData.password !== formData.confirmPassword) {
          newErrors.confirmPassword = 'Passwords do not match';
        }

        // Name validation (optional but if provided, validate)
        if (sanitizedData.firstName && sanitizedData.firstName.length > 50) {
          newErrors.firstName = 'First name too long';
        }
        if (sanitizedData.lastName && sanitizedData.lastName.length > 50) {
          newErrors.lastName = 'Last name too long';
        }
      }
    }

    setErrors(newErrors);
    
    // Update form data with sanitized values if validation passes
    if (Object.keys(newErrors).length === 0) {
      setFormData(prev => ({
        ...prev,
        email: sanitizedData.email,
        username: sanitizedData.username,
        firstName: sanitizedData.firstName,
        lastName: sanitizedData.lastName
      }));
    }
    
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});
    setSuccess('');

    try {
      if (mode === 'login') {
        await login(formData.email, formData.password);
        onClose();
      } else if (mode === 'register') {
        await register({
          email: formData.email,
          password: formData.password,
          username: formData.username,
          firstName: formData.firstName || undefined,
          lastName: formData.lastName || undefined
        });
        onClose();
      } else if (mode === 'reset') {
        await resetPassword(formData.email);
        setSuccess('Password reset instructions sent to your email');
        setTimeout(() => setMode('login'), 3000);
      }
    } catch (error) {
      if (error instanceof ValidationError) {
        setErrors({ general: error.message });
      } else {
        setErrors({ general: 'An unexpected error occurred' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      confirmPassword: '',
      username: '',
      firstName: '',
      lastName: ''
    });
    setErrors({});
    setSuccess('');
  };

  const switchMode = (newMode: 'login' | 'register' | 'reset') => {
    setMode(newMode);
    resetForm();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {mode === 'login' && 'Sign In'}
              {mode === 'register' && 'Create Account'}
              {mode === 'reset' && 'Reset Password'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Success Message */}
          {success && (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-green-600 dark:text-green-400 text-sm">{success}</p>
            </div>
          )}

          {/* Error Message */}
          {errors.general && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-600 dark:text-red-400 text-sm">{errors.general}</p>
            </div>
          )}

          {/* Demo Account Info */}
          {mode === 'login' && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-blue-600 dark:text-blue-400 text-sm font-medium mb-1">Demo Account:</p>
              <p className="text-blue-600 dark:text-blue-400 text-xs">
                Email: demo@sportsbetting.com<br />
                Password: password123
              </p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={handleInputChange('email')}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                  bg-white dark:bg-gray-700 
                  text-gray-900 dark:text-white 
                  placeholder:text-gray-400 dark:placeholder:text-gray-500 ${
                  errors.email ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="Enter your email"
                disabled={isLoading}
                maxLength={254}
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email}</p>
              )}
            </div>

            {mode !== 'reset' && (
              <>
                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange('password')}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                      bg-white dark:bg-gray-700 
                      text-gray-900 dark:text-white 
                      placeholder:text-gray-400 dark:placeholder:text-gray-500 ${
                      errors.password ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="Enter your password"
                    disabled={isLoading}
                    minLength={3}
                  />
                  {errors.password && (
                    <p className="text-red-500 text-sm mt-1">{errors.password}</p>
                  )}
                </div>

                {mode === 'register' && (
                  <>
                    {/* Confirm Password */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Confirm Password
                      </label>
                      <input
                        type="password"
                        value={formData.confirmPassword}
                        onChange={handleInputChange('confirmPassword')}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                          bg-white dark:bg-gray-700 
                          text-gray-900 dark:text-white 
                          placeholder:text-gray-400 dark:placeholder:text-gray-500 ${
                          errors.confirmPassword ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-gray-600'
                        }`}
                        placeholder="Confirm your password"
                        disabled={isLoading}
                      />
                      {errors.confirmPassword && (
                        <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>
                      )}
                    </div>

                    {/* Username */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Username
                      </label>
                      <input
                        type="text"
                        value={formData.username}
                        onChange={handleInputChange('username')}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                          bg-white dark:bg-gray-700 
                          text-gray-900 dark:text-white 
                          placeholder:text-gray-400 dark:placeholder:text-gray-500 ${
                          errors.username ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-gray-600'
                        }`}
                        placeholder="Choose a username"
                        disabled={isLoading}
                        maxLength={20}
                      />
                      {errors.username && (
                        <p className="text-red-500 text-sm mt-1">{errors.username}</p>
                      )}
                    </div>

                    {/* Names (Optional) */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          First Name (Optional)
                        </label>
                        <input
                          type="text"
                          value={formData.firstName}
                          onChange={handleInputChange('firstName')}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                            bg-white dark:bg-gray-700 
                            text-gray-900 dark:text-white 
                            placeholder:text-gray-400 dark:placeholder:text-gray-500 ${
                            errors.firstName ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-gray-600'
                          }`}
                          placeholder="First name"
                          disabled={isLoading}
                          maxLength={50}
                        />
                        {errors.firstName && (
                          <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Last Name (Optional)
                        </label>
                        <input
                          type="text"
                          value={formData.lastName}
                          onChange={handleInputChange('lastName')}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                            bg-white dark:bg-gray-700 
                            text-gray-900 dark:text-white 
                            placeholder:text-gray-400 dark:placeholder:text-gray-500 ${
                            errors.lastName ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-gray-600'
                          }`}
                          placeholder="Last name"
                          disabled={isLoading}
                          maxLength={50}
                        />
                        {errors.lastName && (
                          <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                isLoading
                  ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isLoading ? 'Processing...' : (
                mode === 'login' ? 'Sign In' :
                mode === 'register' ? 'Create Account' :
                'Send Reset Link'
              )}
            </button>
          </form>

          {/* Mode Switchers */}
          <div className="mt-6 text-center space-y-2">
            {mode === 'login' && (
              <>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Don't have an account?{' '}
                  <button
                    onClick={() => switchMode('register')}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                    disabled={isLoading}
                  >
                    Sign up
                  </button>
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Forgot your password?{' '}
                  <button
                    onClick={() => switchMode('reset')}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                    disabled={isLoading}
                  >
                    Reset it
                  </button>
                </p>
              </>
            )}

            {mode === 'register' && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Already have an account?{' '}
                <button
                  onClick={() => switchMode('login')}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                  disabled={isLoading}
                >
                  Sign in
                </button>
              </p>
            )}

            {mode === 'reset' && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Remember your password?{' '}
                <button
                  onClick={() => switchMode('login')}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                  disabled={isLoading}
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}