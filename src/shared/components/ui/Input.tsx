'use client';

import React from 'react';
import { clsx } from 'clsx';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helpText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: 'default' | 'filled' | 'flushed';
  inputSize?: 'sm' | 'md' | 'lg';
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({
    className,
    type = 'text',
    label,
    error,
    helpText,
    leftIcon,
    rightIcon,
    variant = 'default',
    inputSize = 'md',
    disabled,
    required,
    ...props
  }, ref) => {
    const inputId = props.id || `input-${Math.random().toString(36).substr(2, 9)}`;

    const baseClasses = [
      'block w-full rounded-lg border transition-colors duration-200',
      'focus:outline-none focus:ring-2 focus:ring-offset-1',
      'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
      'dark:disabled:bg-gray-800 dark:disabled:text-gray-400',
      'placeholder:text-gray-400 dark:placeholder:text-gray-500'
    ];

    const variantClasses = {
      default: [
        'bg-white dark:bg-gray-700',
        'border-gray-300 dark:border-gray-600',
        'text-gray-900 dark:text-gray-100',
        error 
          ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20 dark:border-red-400 dark:focus:border-red-400'
          : 'focus:border-blue-500 focus:ring-blue-500/20 dark:focus:border-blue-400 dark:focus:ring-blue-400/20'
      ],
      filled: [
        'bg-gray-50 dark:bg-gray-800',
        'border-transparent',
        'text-gray-900 dark:text-gray-100',
        error
          ? 'bg-red-50 dark:bg-red-900/20 focus:ring-red-500/20'
          : 'focus:bg-white dark:focus:bg-gray-700 focus:ring-blue-500/20 dark:focus:ring-blue-400/20'
      ],
      flushed: [
        'bg-transparent',
        'border-0 border-b-2 rounded-none',
        'border-gray-300 dark:border-gray-600',
        'text-gray-900 dark:text-gray-100',
        'focus:ring-0',
        error
          ? 'border-red-500 focus:border-red-500 dark:border-red-400'
          : 'focus:border-blue-500 dark:focus:border-blue-400'
      ]
    };

    const sizeClasses = {
      sm: leftIcon || rightIcon ? 'py-1.5 px-3' : 'py-1.5 px-3 text-sm',
      md: leftIcon || rightIcon ? 'py-2 px-3' : 'py-2 px-3',
      lg: leftIcon || rightIcon ? 'py-3 px-4' : 'py-3 px-4 text-lg'
    };

    const iconPadding = {
      sm: { left: leftIcon ? 'pl-8' : '', right: rightIcon ? 'pr-8' : '' },
      md: { left: leftIcon ? 'pl-10' : '', right: rightIcon ? 'pr-10' : '' },
      lg: { left: leftIcon ? 'pl-12' : '', right: rightIcon ? 'pr-12' : '' }
    };

    return (
      <div className="w-full">
        {label && (
          <label 
            htmlFor={inputId}
            className={clsx(
              'block text-sm font-medium mb-1',
              error ? 'text-red-700 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'
            )}
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <div className={clsx(
              'absolute left-0 top-0 bottom-0 flex items-center justify-center',
              'text-gray-400 dark:text-gray-500',
              {
                'w-8': inputSize === 'sm',
                'w-10': inputSize === 'md',
                'w-12': inputSize === 'lg'
              }
            )}>
              {leftIcon}
            </div>
          )}
          
          <input
            ref={ref}
            type={type}
            id={inputId}
            disabled={disabled}
            required={required}
            className={clsx(
              baseClasses,
              variantClasses[variant],
              sizeClasses[inputSize],
              iconPadding[inputSize].left,
              iconPadding[inputSize].right,
              className
            )}
            {...props}
          />
          
          {rightIcon && (
            <div className={clsx(
              'absolute right-0 top-0 bottom-0 flex items-center justify-center',
              'text-gray-400 dark:text-gray-500',
              {
                'w-8': inputSize === 'sm',
                'w-10': inputSize === 'md',
                'w-12': inputSize === 'lg'
              }
            )}>
              {rightIcon}
            </div>
          )}
        </div>
        
        {error && (
          <p className="text-red-600 dark:text-red-400 text-sm mt-1">
            {error}
          </p>
        )}
        
        {helpText && !error && (
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {helpText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';