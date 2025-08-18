'use client';

import { useState } from 'react';
import { ModernButton } from '../shared/components/ui/ModernButton';
import { ModernCard, ModernCardHeader, ModernCardBody } from '../shared/components/ui/ModernCard';

interface PaymentFallbackProps {
  planName: string;
  amount: number;
  planFeatures: string[];
  onPaymentSuccess: (paymentResult: any) => void;
  onClose: () => void;
}

export function PaymentFallback({ 
  planName, 
  amount, 
  planFeatures, 
  onPaymentSuccess, 
  onClose 
}: PaymentFallbackProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleDemoPayment = async () => {
    setIsLoading(true);
    
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simulate successful payment for demo purposes
    const demoPaymentResult = {
      success: true,
      paymentId: `demo-${Date.now()}`,
      planName,
      amount,
      message: `Demo payment successful for ${planName} plan!`
    };
    
    setIsLoading(false);
    onPaymentSuccess(demoPaymentResult);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <ModernCard variant="glass" className="w-full max-w-md">
        <ModernCardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-white">
              Upgrade to {planName}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
        </ModernCardHeader>
        
        <ModernCardBody>
          {/* Plan Summary */}
          <div className="mb-6 p-4 bg-gray-800/50 rounded-lg">
            <div className="flex justify-between items-center mb-3">
              <span className="text-white font-medium">{planName} Plan</span>
              <span className="text-2xl font-bold text-white">${amount}/month</span>
            </div>
            <div className="text-sm text-gray-300">
              <p className="mb-2">You'll get access to:</p>
              <ul className="space-y-1">
                {planFeatures.slice(0, 3).map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
                {planFeatures.length > 3 && (
                  <li className="text-gray-400">+ {planFeatures.length - 3} more features</li>
                )}
              </ul>
            </div>
          </div>

          {/* Demo Payment Notice */}
          <div className="mb-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-blue-400">🧪</span>
              <span className="text-blue-300 font-medium">Demo Mode</span>
            </div>
            <p className="text-sm text-blue-200">
              This is a demo payment system. Click "Process Demo Payment" to simulate upgrading your account.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <ModernButton
              variant="ghost"
              onClick={onClose}
              fullWidth
              disabled={isLoading}
            >
              Cancel
            </ModernButton>
            <ModernButton
              variant="primary"
              onClick={handleDemoPayment}
              fullWidth
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : 'Process Demo Payment'}
            </ModernButton>
          </div>

          {/* Demo Notice */}
          <div className="mt-4 text-xs text-gray-400 text-center">
            🔧 Demo payment system - No real charges will be made
          </div>
        </ModernCardBody>
      </ModernCard>
    </div>
  );
}