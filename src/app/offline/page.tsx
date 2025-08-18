'use client';

import { ModernCard, ModernCardHeader, ModernCardBody } from '../../shared/components/ui/ModernCard';
import { ModernButton } from '../../shared/components/ui/ModernButton';

export default function OfflinePage() {
  const handleRetry = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4">
      <ModernCard variant="glass" className="w-full max-w-md">
        <ModernCardHeader>
          <div className="text-center">
            <div className="text-6xl mb-4">📡</div>
            <h1 className="text-2xl font-bold text-white mb-2">You're Offline</h1>
            <p className="text-gray-300">
              It looks like you've lost your internet connection. Some features may not be available.
            </p>
          </div>
        </ModernCardHeader>
        
        <ModernCardBody>
          <div className="text-center space-y-4">
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <h3 className="text-blue-300 font-semibold mb-2">Available Offline</h3>
              <ul className="text-sm text-blue-200 space-y-1">
                <li>• Demo Dashboard</li>
                <li>• Demo Calculator</li>
                <li>• Demo Portfolio</li>
                <li>• Cached Arbitrage Data</li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <ModernButton 
                onClick={handleRetry}
                fullWidth
                variant="primary"
                icon={<span>🔄</span>}
              >
                Try Again
              </ModernButton>
              
              <ModernButton 
                onClick={handleGoHome}
                fullWidth
                variant="ghost"
                icon={<span>🏠</span>}
              >
                Go to Demo Mode
              </ModernButton>
            </div>
            
            <div className="text-xs text-gray-400 pt-4">
              <p>Tips for better offline experience:</p>
              <ul className="mt-2 space-y-1">
                <li>• Use demo features when offline</li>
                <li>• Cached data may be outdated</li>
                <li>• Payments require internet connection</li>
              </ul>
            </div>
          </div>
        </ModernCardBody>
      </ModernCard>
    </div>
  );
}