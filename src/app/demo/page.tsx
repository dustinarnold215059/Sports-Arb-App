'use client';

import { Navigation } from '@/components/Navigation';
import { ModernBadge } from "../../shared/components/ui/ModernBadge";
import { ModernButton } from "../../shared/components/ui/ModernButton";
import Link from 'next/link';

export default function DemoPage() {

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <Navigation />
      
      {/* Demo Information Header */}
      <div className="bg-gradient-to-r from-red-900/30 to-orange-900/30 border-b border-red-700/30">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-3xl font-bold text-white mb-2">Demo Information</h1>
            <p className="text-red-300 text-lg mb-4">
              You are currently looking at demo information. Nothing here is real.
            </p>
            <ModernBadge variant="warning" size="lg">
              Simulated Data Only
            </ModernBadge>
            
            {/* Quick Navigation Links */}
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/demo-dashboard">
                <ModernButton variant="secondary" size="sm" className="flex items-center gap-2">
                  📊 Dashboard
                </ModernButton>
              </Link>
              <Link href="/demo-portfolio">
                <ModernButton variant="secondary" size="sm" className="flex items-center gap-2">
                  💼 Portfolio
                </ModernButton>
              </Link>
              <Link href="/demo-arbitrage">
                <ModernButton variant="secondary" size="sm" className="flex items-center gap-2">
                  🎯 Scanner
                </ModernButton>
              </Link>
              <Link href="/demo-calculator">
                <ModernButton variant="secondary" size="sm" className="flex items-center gap-2">
                  🧮 Calculator
                </ModernButton>
              </Link>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}