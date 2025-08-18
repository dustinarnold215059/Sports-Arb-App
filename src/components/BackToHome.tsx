'use client';

import Link from 'next/link';

interface BackToHomeProps {
  className?: string;
  variant?: 'button' | 'link' | 'floating';
  size?: 'sm' | 'md' | 'lg';
}

export function BackToHome({ 
  className = '', 
  variant = 'button',
  size = 'md' 
}: BackToHomeProps) {
  const baseClasses = "inline-flex items-center space-x-2 transition-colors font-medium";
  
  const variantClasses = {
    button: "bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-sm",
    link: "text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300",
    floating: "fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg z-40 hover:shadow-xl"
  };
  
  const sizeClasses = {
    sm: variant === 'floating' ? 'text-sm' : 'text-sm px-3 py-1.5',
    md: variant === 'floating' ? 'text-base' : 'text-base px-4 py-2',
    lg: variant === 'floating' ? 'text-lg' : 'text-lg px-6 py-3'
  };
  
  const combinedClasses = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;
  
  if (variant === 'floating') {
    return (
      <Link href="/" className={combinedClasses} title="Back to Home">
        <span className="text-xl">🏠</span>
      </Link>
    );
  }
  
  return (
    <Link href="/" className={combinedClasses}>
      <span>←</span>
      <span>Back to Home</span>
    </Link>
  );
}