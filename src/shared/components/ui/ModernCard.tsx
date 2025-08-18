'use client';

import React, { memo } from 'react';
import { clsx } from 'clsx';

export interface ModernCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'neon' | 'glass' | 'gradient';
  hover?: boolean;
  glow?: boolean;
  onClick?: () => void;
}

export const ModernCard = memo(function ModernCard({ 
  children, 
  className, 
  variant = 'default',
  hover = true,
  glow = false,
  onClick 
}: ModernCardProps) {
  const baseClasses = [
    'relative overflow-hidden backdrop-filter backdrop-blur-lg',
    'transition-all duration-300 ease-in-out',
    hover && 'hover:transform hover:-translate-y-1',
    onClick && 'cursor-pointer',
    glow && 'hover-glow'
  ];

  const variantClasses = {
    default: [
      'bg-gradient-to-br from-gray-900/90 to-gray-800/90',
      'border border-gray-700/50',
      'rounded-2xl shadow-xl',
      hover && 'hover:border-gray-600/70 hover:shadow-2xl'
    ],
    neon: [
      'bg-gradient-to-br from-gray-900/90 to-gray-800/90',
      'border border-cyan-400/50 rounded-2xl',
      'shadow-lg shadow-cyan-400/20',
      hover && 'hover:border-cyan-400/80 hover:shadow-cyan-400/40',
      'before:absolute before:inset-0 before:rounded-2xl',
      'before:bg-gradient-to-r before:from-transparent before:via-cyan-400/10 before:to-transparent',
      'before:translate-x-[-100%] before:transition-transform before:duration-500',
      hover && 'hover:before:translate-x-[100%]'
    ],
    glass: [
      'bg-white/5 backdrop-blur-md',
      'border border-white/10 rounded-2xl',
      'shadow-xl',
      hover && 'hover:bg-white/10 hover:border-white/20'
    ],
    gradient: [
      'bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-cyan-600/20',
      'border border-blue-400/30 rounded-2xl',
      'shadow-xl shadow-blue-500/10',
      hover && 'hover:from-blue-600/30 hover:via-purple-600/30 hover:to-cyan-600/30'
    ]
  };

  return (
    <div
      className={clsx(baseClasses, variantClasses[variant], className)}
      onClick={onClick}
    >
      {children}
    </div>
  );
});

export interface ModernCardHeaderProps {
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
}

export const ModernCardHeader = memo(function ModernCardHeader({ children, className, actions }: ModernCardHeaderProps) {
  return (
    <div className={clsx('px-6 py-4 border-b border-gray-700/50', className)}>
      <div className="flex items-center justify-between">
        <div>{children}</div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
});

export interface ModernCardBodyProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const ModernCardBody = memo(function ModernCardBody({ children, className, padding = 'md' }: ModernCardBodyProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  return (
    <div className={clsx(paddingClasses[padding], className)}>
      {children}
    </div>
  );
});

export interface ModernCardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const ModernCardFooter = memo(function ModernCardFooter({ children, className }: ModernCardFooterProps) {
  return (
    <div className={clsx('px-6 py-4 border-t border-gray-700/50 bg-gray-800/30', className)}>
      {children}
    </div>
  );
});