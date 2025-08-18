'use client';

import { memo } from 'react';
import { clsx } from 'clsx';

interface LoadingSkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'card' | 'table' | 'button';
  width?: string | number;
  height?: string | number;
  lines?: number;
  animation?: 'pulse' | 'wave' | 'none';
}

export const LoadingSkeleton = memo(function LoadingSkeleton({
  className,
  variant = 'rectangular',
  width,
  height,
  lines = 1,
  animation = 'pulse'
}: LoadingSkeletonProps) {
  const baseClasses = [
    'bg-gradient-to-r from-gray-700/50 to-gray-600/50',
    'rounded',
    animation === 'pulse' && 'animate-pulse',
    animation === 'wave' && 'animate-wave'
  ];

  const variantClasses = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded',
    card: 'h-48 rounded-xl',
    table: 'h-12 rounded',
    button: 'h-10 rounded-lg'
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  if (variant === 'text' && lines > 1) {
    return (
      <div className={className}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={clsx(
              baseClasses,
              variantClasses[variant],
              index === lines - 1 ? 'w-3/4' : 'w-full',
              index > 0 && 'mt-2'
            )}
            style={style}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={clsx(baseClasses, variantClasses[variant], className)}
      style={style}
    />
  );
});

// Specialized skeleton components
export const CardSkeleton = memo(function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={clsx('bg-gray-800/50 border border-gray-700/50 rounded-xl p-6 animate-pulse', className)}>
      <div className="flex items-center justify-between mb-4">
        <LoadingSkeleton variant="text" width={120} />
        <LoadingSkeleton variant="circular" width={32} height={32} />
      </div>
      <LoadingSkeleton variant="text" lines={3} className="mb-4" />
      <div className="flex gap-2 mt-4">
        <LoadingSkeleton variant="button" width={80} />
        <LoadingSkeleton variant="button" width={100} />
      </div>
    </div>
  );
});

export const TableSkeleton = memo(function TableSkeleton({ 
  rows = 5, 
  columns = 4,
  className 
}: { 
  rows?: number; 
  columns?: number;
  className?: string;
}) {
  return (
    <div className={clsx('space-y-3', className)}>
      {/* Header */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, index) => (
          <LoadingSkeleton key={`header-${index}`} variant="text" height={20} />
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div 
          key={`row-${rowIndex}`} 
          className="grid gap-4" 
          style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <LoadingSkeleton 
              key={`cell-${rowIndex}-${colIndex}`} 
              variant="table" 
              height={32}
            />
          ))}
        </div>
      ))}
    </div>
  );
});

export const StatsSkeleton = memo(function StatsSkeleton({ className }: { className?: string }) {
  return (
    <div className={clsx('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6', className)}>
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6 animate-pulse">
          <div className="flex items-center justify-between mb-2">
            <LoadingSkeleton variant="text" width={80} />
            <LoadingSkeleton variant="circular" width={24} height={24} />
          </div>
          <LoadingSkeleton variant="text" width={120} height={32} className="mb-1" />
          <LoadingSkeleton variant="text" width={100} height={16} />
        </div>
      ))}
    </div>
  );
});

export const ArbitrageOpportunitySkeleton = memo(function ArbitrageOpportunitySkeleton({ 
  className 
}: { 
  className?: string 
}) {
  return (
    <div className={clsx('bg-gray-800/50 border border-gray-700/50 rounded-xl p-6 animate-pulse', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <LoadingSkeleton variant="text" width={150} height={20} />
          <LoadingSkeleton variant="rectangular" width={60} height={20} className="rounded-full" />
        </div>
        <LoadingSkeleton variant="text" width={80} height={24} />
      </div>
      
      {/* Teams */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <LoadingSkeleton variant="text" width={100} height={16} className="mb-2" />
          <LoadingSkeleton variant="text" width={80} height={20} />
        </div>
        <div>
          <LoadingSkeleton variant="text" width={100} height={16} className="mb-2" />
          <LoadingSkeleton variant="text" width={80} height={20} />
        </div>
      </div>
      
      {/* Bookmakers */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="text-center">
            <LoadingSkeleton variant="text" width={80} height={16} className="mb-2 mx-auto" />
            <LoadingSkeleton variant="text" width={60} height={20} className="mx-auto" />
          </div>
        ))}
      </div>
      
      {/* Action Button */}
      <LoadingSkeleton variant="button" width="100%" height={40} />
    </div>
  );
});

export const DashboardSkeleton = memo(function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <LoadingSkeleton variant="text" width={200} height={32} className="mb-2" />
        <LoadingSkeleton variant="text" width={300} height={16} />
      </div>
      
      {/* Stats */}
      <StatsSkeleton />
      
      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <LoadingSkeleton variant="text" width={150} height={24} className="mb-4" />
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <ArbitrageOpportunitySkeleton key={index} />
            ))}
          </div>
        </div>
        
        <div>
          <LoadingSkeleton variant="text" width={150} height={24} className="mb-4" />
          <CardSkeleton />
        </div>
      </div>
    </div>
  );
});

// Add wave animation to global CSS
const waveKeyframes = `
@keyframes wave {
  0% {
    transform: translateX(-100%);
  }
  50% {
    transform: translateX(100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.animate-wave {
  position: relative;
  overflow: hidden;
}

.animate-wave::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
  animation: wave 1.5s infinite;
}
`;

// Export keyframes for adding to global CSS
export { waveKeyframes };