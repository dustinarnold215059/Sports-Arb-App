'use client';

import { DemoPortfolio } from '@/components/DemoPortfolio';
import { Navigation } from '@/components/Navigation';

export default function DemoPortfolioPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <Navigation />
      <DemoPortfolio />
    </div>
  );
}