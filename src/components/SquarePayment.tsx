'use client';

import { useState, useEffect, useRef } from 'react';
import { ModernButton } from '../shared/components/ui/ModernButton';
import { ModernCard, ModernCardHeader, ModernCardBody } from '../shared/components/ui/ModernCard';

interface SquarePaymentProps {
  planName: string;
  amount: number;
  planFeatures: string[];
  userId: string;
  onPaymentSuccess: (paymentResult: any) => void;
  onClose: () => void;
}

declare global {
  interface Window {
    Square?: any;
  }
}

export function SquarePayment({ 
  planName, 
  amount, 
  planFeatures, 
  userId,
  onPaymentSuccess, 
  onClose 
}: SquarePaymentProps) {
  const [payments, setPayments] = useState<any>(null);
  const [card, setCard] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log('SquarePayment component mounted');
    
    const initializeSquare = async () => {
      console.log('initializeSquare called, window.Square exists:', !!window.Square);
      
      if (!window.Square) {
        console.log('Square not loaded, waiting...');
        setTimeout(initializeSquare, 1000);
        return;
      }

      if (isInitialized) {
        console.log('Already initialized');
        return;
      }

      if (!containerRef.current) {
        console.error('Container ref not available, retrying...');
        setTimeout(initializeSquare, 500);
        return;
      }

      try {
        const applicationId = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID || 'sandbox-sq0idb-nOCr15i_3Se9eJWkUehnvg';
        const locationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID || 'LCTAWSGR6JKDM';

        console.log('Initializing Square with:', { applicationId, locationId });
        console.log('Container element:', containerRef.current);
        
        const paymentsInstance = window.Square.payments(applicationId, locationId);
        setPayments(paymentsInstance);

        console.log('Creating card with paymentsInstance:', paymentsInstance);
        const cardInstance = await paymentsInstance.card({
          style: {
            '.input-container': {
              borderColor: '#4b5563',
              borderRadius: '8px'
            },
            '.input-container.is-focus': {
              borderColor: '#3b82f6'
            },
            '.input-container.is-error': {
              borderColor: '#ef4444'
            },
            'input': {
              color: '#000000',
              fontSize: '16px'
            },
            '.message-text': {
              color: '#ef4444'
            }
          }
        });
        
        console.log('Card instance created:', cardInstance);
        console.log('Attaching card to container:', containerRef.current);
        
        await cardInstance.attach(containerRef.current);
        
        console.log('Card attached successfully');
        setCard(cardInstance);
        setIsInitialized(true);
        console.log('Square initialized successfully');

      } catch (error) {
        console.error('Square initialization failed:', error);
        console.error('Error details:', error.message, error.stack);
        setInitError(`Failed to initialize Square: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };

    // Wait a bit for the component to fully mount
    const timer = setTimeout(initializeSquare, 100);

    return () => {
      clearTimeout(timer);
      console.log('Cleanup - no card destruction to avoid React conflicts');
      // Don't destroy card to avoid React DOM conflicts
    };
  }, []);

  const handlePayment = async () => {
    if (!card || !payments) {
      console.error('Square not ready');
      return;
    }

    setIsLoading(true);

    try {
      const result = await card.tokenize();
      
      if (result.status === 'OK') {
        const paymentResponse = await fetch('/api/payments/square', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sourceId: result.token,
            amount: amount * 100,
            currency: 'USD',
            planName,
            userId,
          }),
        });

        if (!paymentResponse.ok) {
          const errorText = await paymentResponse.text();
          console.error('Payment API error:', errorText);
          throw new Error(`Payment API error: ${paymentResponse.status} - ${errorText.substring(0, 200)}`);
        }

        const paymentResult = await paymentResponse.json();

        if (paymentResult.success) {
          onPaymentSuccess(paymentResult);
        } else {
          throw new Error(paymentResult.error || 'Payment failed');
        }
      } else {
        throw new Error(result.errors?.[0]?.message || 'Tokenization failed');
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert(`Payment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
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

          {/* Square Card Form */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Payment Information
            </label>
            <div className="bg-white border border-gray-600 rounded-lg p-3">
              <div 
                ref={containerRef}
                className="min-h-[80px]"
              >
                {!isInitialized && !initError && (
                  <div className="flex items-center justify-center h-16 text-gray-400 text-sm">
                    <div className="animate-pulse">Loading payment form...</div>
                  </div>
                )}
                {initError && (
                  <div className="flex items-center justify-center h-16 text-red-400 text-sm">
                    <div>Error: {initError}</div>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-400">
              💳 Secure payment processing by Square
            </div>
            
            {/* Test Card Credentials for Sandbox */}
            <div className="mt-3 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
              <div className="text-xs text-blue-300 font-medium mb-2">🧪 Test Card (Sandbox Mode)</div>
              <div className="text-xs text-blue-200 space-y-1">
                <div><strong>Card Number:</strong> 4111 1111 1111 1111</div>
                <div><strong>Expiry:</strong> 12/25</div>
                <div><strong>CVV:</strong> 123</div>
                <div><strong>ZIP:</strong> 12345</div>
              </div>
            </div>
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
              onClick={handlePayment}
              fullWidth
              disabled={isLoading || !card}
            >
              {isLoading ? 'Processing...' : `Pay $${amount}/month`}
            </ModernButton>
          </div>

          {/* Security Notice */}
          <div className="mt-4 text-xs text-gray-400 text-center">
            🔒 Your payment information is securely processed by Square
          </div>
        </ModernCardBody>
      </ModernCard>
    </div>
  );
}