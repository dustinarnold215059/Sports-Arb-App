'use client';

import React from 'react';
import { clsx } from 'clsx';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
  outline?: boolean;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({
    className,
    variant = 'default',
    size = 'md',
    dot = false,
    outline = false,
    children,
    ...props
  }, ref) => {
    const baseClasses = [
      'inline-flex items-center justify-center',
      'font-medium rounded-full shrink-0',
      'transition-colors duration-200'
    ];

    const sizeClasses = {
      sm: dot ? 'w-2 h-2' : 'px-2 py-0.5 text-xs',
      md: dot ? 'w-2.5 h-2.5' : 'px-2.5 py-0.5 text-sm',
      lg: dot ? 'w-3 h-3' : 'px-3 py-1 text-sm'
    };

    // Solid variant styles
    const solidVariants = {
      default: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      primary: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
      secondary: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
      success: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
      warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
      danger: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
      info: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-300'
    };

    // Outline variant styles
    const outlineVariants = {
      default: 'border border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300',
      primary: 'border border-blue-300 text-blue-700 dark:border-blue-600 dark:text-blue-300',
      secondary: 'border border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-200',
      success: 'border border-green-300 text-green-700 dark:border-green-600 dark:text-green-300',
      warning: 'border border-yellow-300 text-yellow-700 dark:border-yellow-600 dark:text-yellow-300',
      danger: 'border border-red-300 text-red-700 dark:border-red-600 dark:text-red-300',
      info: 'border border-cyan-300 text-cyan-700 dark:border-cyan-600 dark:text-cyan-300'
    };

    const variantClasses = outline ? outlineVariants[variant] : solidVariants[variant];

    return (
      <span
        ref={ref}
        className={clsx(
          baseClasses,
          sizeClasses[size],
          variantClasses,
          className
        )}
        {...props}
      >
        {!dot && children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';