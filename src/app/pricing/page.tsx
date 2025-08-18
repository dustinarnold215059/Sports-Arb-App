'use client';

import { useState, lazy, Suspense } from 'react';
import { Navigation } from '@/components/Navigation';
import { ModernCard, ModernCardHeader, ModernCardBody } from "../../shared/components/ui/ModernCard";
import { ModernButton, GradientButton } from "../../shared/components/ui/ModernButton";
import { ModernBadge } from "../../shared/components/ui/ModernBadge";
import { useAuth } from "../../shared/auth/authProvider";
import Script from 'next/script';
import { LoadingSkeleton } from "../../shared/components/ui/LoadingSkeleton";

// Dynamic imports for heavy components that are only needed conditionally
const AuthModal = lazy(() => import("../../shared/components/AuthModal").then(module => ({ default: module.AuthModal })));
const SquarePayment = lazy(() => import('@/components/SquarePayment').then(module => ({ default: module.SquarePayment })));
const PaymentFallback = lazy(() => import('@/components/PaymentFallback').then(module => ({ default: module.PaymentFallback })));

export default function PricingPage() {
  const { user, isAuthenticated, refreshToken } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [useSquarePayment, setUseSquarePayment] = useState(true); // Default to Square with fixed implementation

  const handleAuthClick = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };

  const handleUpgradeClick = (plan: typeof plans[0]) => {
    if (!isAuthenticated) {
      handleAuthClick('login');
      return;
    }
    setSelectedPlan(plan);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = async (paymentResult: any) => {
    setShowPaymentModal(false);
    setSelectedPlan(null);
    
    console.log('=== PAYMENT SUCCESS ===');
    console.log('Payment result:', paymentResult);
    console.log('Current user:', user);
    
    // Test direct user upgrade API call
    if (user) {
      try {
        console.log('=== CALLING USER UPGRADE API ===');
        console.log('User ID:', user.id);
        console.log('Plan name:', paymentResult.planName);
        console.log('Payment ID:', paymentResult.paymentId);
        
        const testUpgrade = await fetch('/api/payments/upgrade-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            planName: paymentResult.planName,
            paymentId: paymentResult.paymentId
          })
        });
        
        console.log('=== UPGRADE API RESPONSE ===');
        console.log('Status:', testUpgrade.status);
        console.log('Status text:', testUpgrade.statusText);
        
        const testResult = await testUpgrade.json();
        console.log('=== UPGRADE RESULT ===');
        console.log('Full result:', testResult);
        
        if (testResult.success) {
          console.log('=== UPGRADE SUCCESSFUL ===');
          console.log('New role:', testResult.role);
          console.log('New subscription status:', testResult.subscriptionStatus);
          
          // Manually update localStorage with the new role
          const storedAuth = localStorage.getItem('sports_betting_auth');
          if (storedAuth) {
            try {
              const parsedAuth = JSON.parse(storedAuth);
              console.log('=== UPDATING LOCALSTORAGE ===');
              console.log('Before update:', parsedAuth.role, parsedAuth.subscriptionStatus);
              
              // Update with new role and subscription status
              parsedAuth.role = testResult.role;
              parsedAuth.subscriptionStatus = testResult.subscriptionStatus;
              parsedAuth.subscriptionExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
              
              // Save back to localStorage
              localStorage.setItem('sports_betting_auth', JSON.stringify(parsedAuth));
              
              console.log('After update:', parsedAuth.role, parsedAuth.subscriptionStatus);
              console.log('=== LOCALSTORAGE UPDATED SUCCESSFULLY ===');
              
              // Refresh to load new data
              setTimeout(() => {
                window.location.reload();
              }, 500);
              return;
              
            } catch (e) {
              console.error('Failed to update localStorage:', e);
            }
          }
          
          // Fallback - just refresh
          setTimeout(() => {
            window.location.reload();
          }, 500);
          return;
        } else {
          console.error('=== UPGRADE FAILED ===');
          console.error('Error:', testResult.error);
          alert(`Upgrade failed: ${testResult.error}`);
        }
      } catch (error) {
        console.error('=== UPGRADE API ERROR ===');
        console.error('Error details:', error);
        alert(`Upgrade API error: ${error.message}`);
      }
    } else {
      console.error('=== NO USER FOUND ===');
      alert('No user found for upgrade');
    }
  };

  const plans = [
    {
      name: 'Basic',
      price: 'Free',
      priceValue: 0,
      description: 'Perfect for getting started and exploring our platform',
      features: [
        'Access to Home page',
        'Full Demo mode experience',
        'View all demo features',
        'Sample arbitrage opportunities',
        'Basic betting calculator',
        'Educational content'
      ],
      limitations: [
        'No real arbitrage data',
        'No live market access',
        'Demo data only'
      ],
      buttonText: 'Get Started Free',
      popular: false,
      current: user?.role === 'basic'
    },
    {
      name: 'Premium',
      price: '$50',
      priceValue: 50,
      description: 'Unlock real arbitrage opportunities and live market data',
      features: [
        'Everything in Basic',
        'Live arbitrage scanner',
        'Real-time market data',
        'Multiple sportsbook coverage',
        'Opportunity alerts'
      ],
      limitations: [
        'Limited advanced analytics',
        'Basic reporting features'
      ],
      buttonText: 'Upgrade to Premium',
      popular: true,
      current: user?.role === 'premium'
    },
    {
      name: 'Pro',
      price: '$75',
      priceValue: 75,
      description: 'Complete access to all features and advanced analytics',
      features: [
        'Everything in Premium',
        'Advanced betting calculator',
        'Basic portfolio tracking',
        'Advanced portfolio analytics',
        'Detailed performance tracking',
        'Export capabilities (PDF/CSV)',
        'Advanced market analysis',
        'Priority customer support',
        'API access (coming soon)',
        'Custom alert settings'
      ],
      limitations: [],
      buttonText: 'Upgrade to Pro',
      popular: false,
      current: user?.role === 'admin' || user?.role === 'pro'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <Navigation onAuthClick={handleAuthClick} />
      
      {/* Header */}
      <div className="bg-gray-800/30 backdrop-blur-sm border-b border-gray-700/30">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-4">Choose Your Plan</h1>
            <p className="text-xl text-gray-300 mb-6">
              Start with our free Basic plan or unlock powerful arbitrage tools
            </p>
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span className="text-gray-300">No setup fees</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span className="text-gray-300">Cancel anytime</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span className="text-gray-300">Instant access</span>
              </div>
            </div>
            
            {/* Payment System Toggle */}
            <div className="flex justify-center">
              <div className="bg-gray-800/50 rounded-lg p-2 flex gap-2">
                <button
                  onClick={() => setUseSquarePayment(false)}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    !useSquarePayment 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  🧪 Demo Mode
                </button>
                <button
                  onClick={() => setUseSquarePayment(true)}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    useSquarePayment 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  💳 Square Payments
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Current Plan Display */}
        {isAuthenticated && (
          <div className="mb-8 text-center">
            <ModernBadge variant="info" size="lg">
              Current Plan: {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
            </ModernBadge>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 overflow-visible" style={{marginTop: '8rem'}}>
          {plans.map((plan) => (
            <ModernCard 
              key={plan.name} 
              variant={plan.popular ? "glass" : "default"}
              className={`relative ${plan.popular ? 'ring-2 ring-blue-500/50' : ''}`}
            >
              <ModernCardHeader>
                {/* Top badges row */}
                <div className="flex justify-between items-start mb-4 h-8">
                  <div>
                    {plan.popular && (
                      <ModernBadge variant="primary" size="md">
                        Most Popular
                      </ModernBadge>
                    )}
                  </div>
                  <div>
                    {plan.current && (
                      <ModernBadge variant="success" size="sm">
                        Current Plan
                      </ModernBadge>
                    )}
                  </div>
                </div>
                
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-white mb-3">{plan.name}</h3>
                  <div className="mb-3">
                    <div className="text-4xl font-bold text-white">{plan.price}</div>
                    {plan.priceValue > 0 && <div className="text-gray-400 text-lg">/month</div>}
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed mx-auto max-w-xs">{plan.description}</p>
                </div>
              </ModernCardHeader>

              <ModernCardBody>
                {/* Features */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-white mb-3">What's Included:</h4>
                  <ul className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <span className="text-green-400">✓</span>
                        <span className="text-gray-300 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Limitations */}
                {plan.limitations.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold text-gray-400 mb-3">Limitations:</h4>
                    <ul className="space-y-2">
                      {plan.limitations.map((limitation, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <span className="text-gray-500">•</span>
                          <span className="text-gray-400 text-sm">{limitation}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Action Button */}
                <div className="mt-8">
                  {plan.current ? (
                    <ModernButton 
                      variant="ghost" 
                      fullWidth 
                      disabled
                    >
                      Current Plan
                    </ModernButton>
                  ) : plan.name === 'Basic' ? (
                    <GradientButton 
                      fullWidth
                      onClick={() => handleAuthClick('register')}
                    >
                      {plan.buttonText}
                    </GradientButton>
                  ) : (
                    <GradientButton 
                      fullWidth
                      onClick={() => handleUpgradeClick(plan)}
                    >
                      {plan.buttonText}
                    </GradientButton>
                  )}
                </div>
              </ModernCardBody>
            </ModernCard>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mt-16">
          <ModernCard variant="glass">
            <ModernCardHeader>
              <h2 className="text-2xl font-bold text-white text-center">Frequently Asked Questions</h2>
            </ModernCardHeader>
            <ModernCardBody>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="data-card">
                  <h4 className="font-semibold text-white mb-2">Can I change plans anytime?</h4>
                  <p className="text-gray-300 text-sm">
                    Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.
                  </p>
                </div>

                <div className="data-card">
                  <h4 className="font-semibold text-white mb-2">Is there a free trial?</h4>
                  <p className="text-gray-300 text-sm">
                    Our Basic plan is completely free forever. You can explore all demo features without any cost.
                  </p>
                </div>

                <div className="data-card">
                  <h4 className="font-semibold text-white mb-2">What payment methods do you accept?</h4>
                  <p className="text-gray-300 text-sm">
                    We accept all major credit cards, PayPal, and bank transfers for Premium and Pro plans.
                  </p>
                </div>

                <div className="data-card">
                  <h4 className="font-semibold text-white mb-2">How accurate are the arbitrage opportunities?</h4>
                  <p className="text-gray-300 text-sm">
                    Our real-time data is sourced from major sportsbooks and updated continuously for maximum accuracy.
                  </p>
                </div>
              </div>
            </ModernCardBody>
          </ModernCard>
        </div>

        {/* Contact Section */}
        <div className="mt-12 text-center">
          <p className="text-gray-300 mb-4">
            Need help choosing the right plan? Have questions about our features?
          </p>
          <ModernButton 
            variant="secondary"
            onClick={() => {
              if (!isAuthenticated) {
                handleAuthClick('login');
              } else {
                alert('Support contact feature coming soon! Please reach out to support@sportsarbpro.com');
              }
            }}
          >
            Contact Support
          </ModernButton>
        </div>
      </div>

      {/* Square.js Script - Use sandbox URL for sandbox credentials */}
      <Script
        src="https://sandbox.web.squarecdn.com/v1/square.js"
        strategy="afterInteractive"
        onLoad={() => {
          console.log('Square.js sandbox loaded successfully');
          window.dispatchEvent(new Event('squareLoaded'));
        }}
        onError={(e) => {
          console.error('Failed to load Square.js sandbox:', e);
        }}
      />

      {/* Auth Modal */}
      {showAuthModal && (
        <Suspense fallback={
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <LoadingSkeleton variant="card" width={400} height={500} />
          </div>
        }>
          <AuthModal 
            isOpen={showAuthModal}
            onClose={() => setShowAuthModal(false)}
            mode={authMode}
            onModeChange={setAuthMode}
          />
        </Suspense>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedPlan && user && (
        <Suspense fallback={
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <LoadingSkeleton variant="card" width={500} height={600} />
          </div>
        }>
          {useSquarePayment ? (
            <SquarePayment
              planName={selectedPlan.name}
              amount={selectedPlan.priceValue}
              planFeatures={selectedPlan.features}
              userId={user.id}
              onPaymentSuccess={handlePaymentSuccess}
              onClose={() => {
                setShowPaymentModal(false);
                setSelectedPlan(null);
              }}
            />
          ) : (
            <PaymentFallback
              planName={selectedPlan.name}
              amount={selectedPlan.priceValue}
              planFeatures={selectedPlan.features}
              onPaymentSuccess={handlePaymentSuccess}
              onClose={() => {
                setShowPaymentModal(false);
                setSelectedPlan(null);
              }}
            />
          )}
        </Suspense>
      )}
    </div>
  );
}