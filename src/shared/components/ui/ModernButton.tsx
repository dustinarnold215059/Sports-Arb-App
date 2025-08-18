'use client';

import React, { memo } from 'react';
import { clsx } from 'clsx';

export interface ModernButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'ghost' | 'neon' | 'gradient';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  glow?: boolean;
  pulse?: boolean;
}

export const ModernButton = memo(function ModernButton({
  children,
  className,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  glow = false,
  pulse = false,
  disabled,
  ...props
}: ModernButtonProps) {
  const baseClasses = [
    'inline-flex items-center justify-center gap-2',
    'font-semibold text-center transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none',
    'relative overflow-hidden',
    fullWidth && 'w-full',
    glow && !disabled && 'hover:shadow-lg',
    pulse && 'animate-pulse'
  ];

  const sizeClasses = {
    xs: 'px-2.5 py-1.5 text-xs rounded-lg',
    sm: 'px-3 py-2 text-sm rounded-lg',
    md: 'px-4 py-2.5 text-sm rounded-xl',
    lg: 'px-6 py-3 text-base rounded-xl',
    xl: 'px-8 py-4 text-lg rounded-2xl'
  };

  const variantClasses = {
    primary: [
      'bg-gradient-to-r from-blue-600 to-blue-700',
      'hover:from-blue-500 hover:to-blue-600',
      'text-white shadow-lg shadow-blue-600/25',
      'focus:ring-blue-500',
      glow && 'hover:shadow-blue-500/50',
      !disabled && 'hover:transform hover:scale-105'
    ],
    secondary: [
      'bg-gradient-to-r from-gray-700 to-gray-800',
      'hover:from-gray-600 hover:to-gray-700',
      'text-white shadow-lg shadow-gray-800/25',
      'focus:ring-gray-500',
      !disabled && 'hover:transform hover:scale-105'
    ],
    success: [
      'bg-gradient-to-r from-emerald-600 to-emerald-700',
      'hover:from-emerald-500 hover:to-emerald-600',
      'text-white shadow-lg shadow-emerald-600/25',
      'focus:ring-emerald-500',
      glow && 'hover:shadow-emerald-500/50',
      !disabled && 'hover:transform hover:scale-105'
    ],
    danger: [
      'bg-gradient-to-r from-red-600 to-red-700',
      'hover:from-red-500 hover:to-red-600',
      'text-white shadow-lg shadow-red-600/25',
      'focus:ring-red-500',
      glow && 'hover:shadow-red-500/50',
      !disabled && 'hover:transform hover:scale-105'
    ],
    warning: [
      'bg-gradient-to-r from-amber-600 to-amber-700',
      'hover:from-amber-500 hover:to-amber-600',
      'text-white shadow-lg shadow-amber-600/25',
      'focus:ring-amber-500',
      glow && 'hover:shadow-amber-500/50',
      !disabled && 'hover:transform hover:scale-105'
    ],
    ghost: [
      'bg-transparent border border-gray-600/50',
      'hover:bg-gray-800/50 hover:border-gray-500/70',
      'text-gray-300 hover:text-white',
      'focus:ring-gray-500'
    ],
    neon: [
      'bg-gradient-to-r from-cyan-400 to-blue-500',
      'hover:from-cyan-300 hover:to-blue-400',
      'text-gray-900 font-bold shadow-lg shadow-cyan-400/50',
      'focus:ring-cyan-400',
      'animate-pulse hover:animate-none',
      glow && 'hover:shadow-cyan-400/70',
      !disabled && 'hover:transform hover:scale-105',
      'before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent',
      'before:translate-x-[-100%] before:transition-transform before:duration-500',
      'hover:before:translate-x-[100%]'
    ],
    gradient: [
      'bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600',
      'hover:from-purple-500 hover:via-pink-500 hover:to-blue-500',
      'text-white font-bold shadow-lg shadow-purple-600/30',
      'focus:ring-purple-500',
      'bg-size-200 hover:bg-pos-0',
      glow && 'hover:shadow-purple-500/50',
      !disabled && 'hover:transform hover:scale-105'
    ]
  };

  const LoadingSpinner = () => (
    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );

  return (
    <button
      className={clsx(
        baseClasses,
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <LoadingSpinner />}
      {!loading && icon && iconPosition === 'left' && icon}
      {!loading && children}
      {!loading && icon && iconPosition === 'right' && icon}
    </button>
  );
});

// Specialized button components
export const NeonButton = memo(function NeonButton(props: Omit<ModernButtonProps, 'variant'>) {
  return <ModernButton {...props} variant="neon" glow />;
});

export const GradientButton = memo(function GradientButton(props: Omit<ModernButtonProps, 'variant'>) {
  return <ModernButton {...props} variant="gradient" glow />;
});

export const PulseButton = memo(function PulseButton(props: ModernButtonProps) {
  return <ModernButton {...props} pulse />;
});