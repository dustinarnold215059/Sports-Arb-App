'use client';

import React from 'react';
import { clsx } from 'clsx';

export interface ModernBadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'neon' | 'gradient';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  glow?: boolean;
  pulse?: boolean;
  dot?: boolean;
  className?: string;
}

export function ModernBadge({
  children,
  variant = 'default',
  size = 'sm',
  glow = false,
  pulse = false,
  dot = false,
  className
}: ModernBadgeProps) {
  const baseClasses = [
    'inline-flex items-center justify-center',
    'font-semibold leading-none',
    'transition-all duration-200',
    pulse && 'animate-pulse',
    glow && 'shadow-lg'
  ];

  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-xs rounded-md gap-1',
    sm: 'px-2 py-1 text-xs rounded-lg gap-1',
    md: 'px-2.5 py-1.5 text-sm rounded-lg gap-1.5',
    lg: 'px-3 py-2 text-base rounded-xl gap-2'
  };

  const variantClasses = {
    default: [
      'bg-gray-700/80 text-gray-200',
      'border border-gray-600/50',
      'backdrop-blur-sm'
    ],
    primary: [
      'bg-gradient-to-r from-blue-600/90 to-blue-700/90',
      'text-white border border-blue-500/50',
      glow && 'shadow-blue-500/50'
    ],
    secondary: [
      'bg-gradient-to-r from-gray-600/90 to-gray-700/90',
      'text-gray-100 border border-gray-500/50'
    ],
    success: [
      'bg-gradient-to-r from-emerald-600/90 to-emerald-700/90',
      'text-white border border-emerald-500/50',
      glow && 'shadow-emerald-500/50'
    ],
    danger: [
      'bg-gradient-to-r from-red-600/90 to-red-700/90',
      'text-white border border-red-500/50',
      glow && 'shadow-red-500/50'
    ],
    warning: [
      'bg-gradient-to-r from-amber-600/90 to-amber-700/90',
      'text-white border border-amber-500/50',
      glow && 'shadow-amber-500/50'
    ],
    info: [
      'bg-gradient-to-r from-cyan-600/90 to-cyan-700/90',
      'text-white border border-cyan-500/50',
      glow && 'shadow-cyan-500/50'
    ],
    neon: [
      'bg-gradient-to-r from-cyan-400/20 to-blue-500/20',
      'text-cyan-300 border border-cyan-400/70',
      'backdrop-blur-sm',
      'shadow-lg shadow-cyan-400/30',
      'animate-pulse'
    ],
    gradient: [
      'bg-gradient-to-r from-purple-600/90 via-pink-600/90 to-blue-600/90',
      'text-white border border-purple-500/50',
      glow && 'shadow-purple-500/50'
    ]
  };

  const dotClasses = {
    xs: 'before:w-1 before:h-1',
    sm: 'before:w-1.5 before:h-1.5',
    md: 'before:w-2 before:h-2',
    lg: 'before:w-2.5 before:h-2.5'
  };

  return (
    <span
      className={clsx(
        baseClasses,
        sizeClasses[size],
        variantClasses[variant],
        dot && [
          'relative',
          'before:absolute before:left-2 before:top-1/2 before:-translate-y-1/2',
          'before:rounded-full before:bg-current',
          dotClasses[size],
          'pl-5'
        ],
        className
      )}
    >
      {children}
    </span>
  );
}

// Status badges with predefined styles
export function StatusBadge({ 
  status, 
  className,
  ...props 
}: { 
  status: 'active' | 'inactive' | 'pending' | 'completed' | 'failed' | 'cancelled';
  className?: string;
} & Omit<ModernBadgeProps, 'variant' | 'children'>) {
  const statusConfig = {
    active: { variant: 'success' as const, children: 'Active', dot: true },
    inactive: { variant: 'secondary' as const, children: 'Inactive', dot: true },
    pending: { variant: 'warning' as const, children: 'Pending', dot: true, pulse: true },
    completed: { variant: 'success' as const, children: 'Completed', dot: true },
    failed: { variant: 'danger' as const, children: 'Failed', dot: true },
    cancelled: { variant: 'secondary' as const, children: 'Cancelled', dot: true }
  };

  const config = statusConfig[status];

  return (
    <ModernBadge
      variant={config.variant}
      dot={config.dot}
      pulse={config.pulse}
      className={className}
      {...props}
    >
      {config.children}
    </ModernBadge>
  );
}

// Metric badges for displaying numbers/stats
export function MetricBadge({
  value,
  label,
  trend,
  className,
  ...props
}: {
  value: string | number;
  label?: string;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
} & Omit<ModernBadgeProps, 'children'>) {
  const trendConfig = {
    up: { variant: 'success' as const, icon: '↗️' },
    down: { variant: 'danger' as const, icon: '↘️' },
    neutral: { variant: 'secondary' as const, icon: '→' }
  };

  const config = trend ? trendConfig[trend] : null;

  return (
    <ModernBadge
      variant={config?.variant || 'primary'}
      className={className}
      {...props}
    >
      <span className="flex items-center gap-1">
        {config?.icon && <span className="text-xs">{config.icon}</span>}
        <span className="font-bold">{value}</span>
        {label && <span className="text-xs opacity-80">{label}</span>}
      </span>
    </ModernBadge>
  );
}

// Notification badge (typically used for counts)
export function NotificationBadge({
  count,
  max = 99,
  showZero = false,
  className,
  ...props
}: {
  count: number;
  max?: number;
  showZero?: boolean;
  className?: string;
} & Omit<ModernBadgeProps, 'children' | 'size'>) {
  if (count === 0 && !showZero) return null;

  const displayCount = count > max ? `${max}+` : count.toString();

  return (
    <ModernBadge
      variant="danger"
      size="xs"
      className={clsx(
        'absolute -top-1 -right-1 min-w-[1.25rem] h-5',
        'flex items-center justify-center',
        className
      )}
      glow
      {...props}
    >
      {displayCount}
    </ModernBadge>
  );
}