'use client';

import { ReactNode } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('Admin Layout Error:', error, errorInfo);
      }}
    >
      <div className="admin-layout">
        {children}
      </div>
    </ErrorBoundary>
  );
}