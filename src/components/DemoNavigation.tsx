'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ModernButton } from "../shared/components/ui/ModernButton";
import { ModernBadge } from "../shared/components/ui/ModernBadge";

export function DemoNavigation() {
  const pathname = usePathname();

  const demoPages = [
    { href: '/demo-dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/demo-portfolio', label: 'Portfolio', icon: '💼' },
    { href: '/demo-arbitrage', label: 'Scanner', icon: '🎯' },
    { href: '/demo-calculator', label: 'Calculator', icon: '🧮' }
  ];

  const isActivePage = (href: string) => {
    return pathname === href;
  };

  return (
    <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border-b border-blue-700/30">
      <div className="max-w-7xl mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <ModernBadge variant="info" size="sm">🎯 Demo Navigation</ModernBadge>
            <span className="text-blue-300 text-sm">Switch between demo features</span>
          </div>
          
          {/* Demo Page Navigation */}
          <div className="flex flex-wrap gap-2">
            {demoPages.map((page) => (
              <Link key={page.href} href={page.href}>
                <ModernButton 
                  variant={isActivePage(page.href) ? "primary" : "ghost"} 
                  size="sm" 
                  className="flex items-center gap-2"
                >
                  {page.icon} {page.label}
                </ModernButton>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}