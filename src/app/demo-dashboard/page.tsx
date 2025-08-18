'use client';

import { DemoDashboard } from '@/components/DemoDashboard';
import { Navigation } from '@/components/Navigation';

export default function DemoDashboardPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <Navigation />
      <DemoDashboard />
    </div>
  );
}