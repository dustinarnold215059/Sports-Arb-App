'use client';

import React from 'react';
import { clsx } from 'clsx';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    children,
    className,
    variant = 'primary',
    size = 'md',
    isLoading = false,
    leftIcon,
    rightIcon,
    fullWidth = false,
    disabled,
    asChild = false,
    ...props
  }, ref) => {
    const baseClasses = [
      'inline-flex items-center justify-center',
      'font-semibold rounded-lg transition-all duration-200',
      'focus:outline-none focus:ring-2 focus:ring-offset-2',
      'disabled:opacity-60 disabled:cursor-not-allowed disabled:pointer-events-none'
    ];

    const variantClasses = {
      primary: [
        'bg-blue-600 text-white hover:bg-blue-700',
        'focus:ring-blue-500 dark:focus:ring-blue-400',
        'shadow-sm hover:shadow-md'
      ],
      secondary: [
        'bg-gray-100 text-gray-900 hover:bg-gray-200',
        'dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600',
        'focus:ring-gray-500 dark:focus:ring-gray-400',
        'border border-gray-300 dark:border-gray-600'
      ],
      danger: [
        'bg-red-600 text-white hover:bg-red-700',
        'focus:ring-red-500 dark:focus:ring-red-400',
        'shadow-sm hover:shadow-md'
      ],
      success: [
        'bg-green-600 text-white hover:bg-green-700',
        'focus:ring-green-500 dark:focus:ring-green-400',
        'shadow-sm hover:shadow-md'
      ],
      warning: [
        'bg-yellow-600 text-white hover:bg-yellow-700',
        'focus:ring-yellow-500 dark:focus:ring-yellow-400',
        'shadow-sm hover:shadow-md'
      ],
      ghost: [
        'text-gray-700 hover:bg-gray-100 hover:text-gray-900',
        'dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-100',
        'focus:ring-gray-500 dark:focus:ring-gray-400'
      ]
    };

    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm gap-1.5',
      md: 'px-4 py-2 text-sm gap-2',
      lg: 'px-6 py-3 text-base gap-2',
      xl: 'px-8 py-4 text-lg gap-3'
    };

    const widthClasses = fullWidth ? 'w-full' : '';

    if (asChild) {
      return React.cloneElement(children as React.ReactElement, {
        className: clsx(
          baseClasses,
          variantClasses[variant],
          sizeClasses[size],
          widthClasses,
          className,
          (children as React.ReactElement).props.className
        )
      });
    }

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={clsx(
          baseClasses,
          variantClasses[variant],
          sizeClasses[size],
          widthClasses,
          className
        )}
        {...props}
      >
        {isLoading && (
          <svg 
            className="animate-spin h-4 w-4" 
            fill="none" 
            viewBox="0 0 24 24"
          >
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
        )}
        
        {!isLoading && leftIcon && (
          <span className="flex-shrink-0">{leftIcon}</span>
        )}
        
        <span className={clsx(isLoading && 'opacity-0')}>
          {children}
        </span>
        
        {!isLoading && rightIcon && (
          <span className="flex-shrink-0">{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';