'use client';

import { useState, useEffect } from 'react';
import { subscriptionManager, SUBSCRIPTION_PLANS, SubscriptionPlan, BillingCycle, UserSubscription, formatPrice, calculateSavings, getSubscriptionStatus } from '@/lib/subscription';
import { useAuth } from '../shared/auth/authProvider';
import { Card, CardHeader, CardBody, Button, Badge, Alert } from '../shared/components/ui';

export function SubscriptionPlans() {
  const { user, isAuthenticated } = useAuth();
  const [currentSubscription, setCurrentSubscription] = useState<UserSubscription | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [showTrialModal, setShowTrialModal] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadSubscription();
    }
  }, [isAuthenticated, user]);

  const loadSubscription = async () => {
    if (!user) return;
    
    try {
      const subscription = await subscriptionManager.getSubscription(user.id);
      setCurrentSubscription(subscription);
      
      if (subscription) {
        setBillingCycle(subscription.billingCycle);
      }
    } catch (error) {
      console.error('Failed to load subscription:', error);
    }
  };

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    if (!user) return;

    setIsLoading(plan.id);

    try {
      if (plan.tier === 'free') {
        // Handle free plan
        if (currentSubscription) {
          await subscriptionManager.cancelSubscription(user.id, true);
        }
      } else {
        // Handle paid plans
        if (currentSubscription) {
          // Upgrade/downgrade existing subscription
          await subscriptionManager.changePlan(user.id, plan.id, billingCycle);
        } else {
          // Create new subscription
          await subscriptionManager.createSubscription(user.id, plan.id, billingCycle);
        }

        // Show trial modal for new premium subscriptions
        if (!currentSubscription && plan.tier !== 'free') {
          setShowTrialModal(true);
        }
      }

      await loadSubscription();
    } catch (error) {
      console.error('Subscription error:', error);
      alert('Failed to update subscription. Please try again.');
    } finally {
      setIsLoading(null);
    }
  };

  const handleCancelSubscription = async () => {
    if (!user || !currentSubscription) return;

    const confirmed = confirm('Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your current billing period.');
    if (!confirmed) return;

    setIsLoading('cancel');

    try {
      await subscriptionManager.cancelSubscription(user.id, false);
      await loadSubscription();
    } catch (error) {
      console.error('Cancellation error:', error);
      alert('Failed to cancel subscription. Please try again.');
    } finally {
      setIsLoading(null);
    }
  };

  const handleReactivate = async () => {
    if (!user || !currentSubscription) return;

    setIsLoading('reactivate');

    try {
      await subscriptionManager.reactivateSubscription(user.id);
      await loadSubscription();
    } catch (error) {
      console.error('Reactivation error:', error);
      alert('Failed to reactivate subscription. Please try again.');
    } finally {
      setIsLoading(null);
    }
  };

  const getButtonText = (plan: SubscriptionPlan): string => {
    if (!currentSubscription) {
      return plan.tier === 'free' ? 'Current Plan' : 'Start Free Trial';
    }

    if (currentSubscription.planId === plan.id) {
      return currentSubscription.cancelAtPeriodEnd ? 'Reactivate' : 'Current Plan';
    }

    if (plan.tier === 'free') {
      return 'Downgrade';
    }

    const currentPlan = SUBSCRIPTION_PLANS.find(p => p.id === currentSubscription.planId);
    const currentTierIndex = SUBSCRIPTION_PLANS.findIndex(p => p.id === currentSubscription.planId);
    const newTierIndex = SUBSCRIPTION_PLANS.findIndex(p => p.id === plan.id);

    return newTierIndex > currentTierIndex ? 'Upgrade' : 'Change Plan';
  };

  const getButtonVariant = (plan: SubscriptionPlan): 'primary' | 'secondary' | 'ghost' => {
    if (currentSubscription?.planId === plan.id) {
      return currentSubscription.cancelAtPeriodEnd ? 'primary' : 'ghost';
    }
    return plan.popular ? 'primary' : 'secondary';
  };

  const isButtonDisabled = (plan: SubscriptionPlan): boolean => {
    if (isLoading) return true;
    if (!currentSubscription) return false;
    
    return currentSubscription.planId === plan.id && !currentSubscription.cancelAtPeriodEnd;
  };

  const subscriptionStatus = getSubscriptionStatus(currentSubscription);

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          💎 Choose Your Plan
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-6">
          Unlock the full potential of sports betting arbitrage
        </p>

        {/* Current Subscription Status */}
        {isAuthenticated && currentSubscription && (
          <div className="mb-6">
            <Badge 
              variant={subscriptionStatus.isActive ? 'success' : 'warning'}
              className="text-sm px-4 py-2"
            >
              Current: {subscriptionStatus.status} • {currentSubscription.tier.charAt(0).toUpperCase() + currentSubscription.tier.slice(1)}
            </Badge>
          </div>
        )}

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg max-w-xs mx-auto">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-4 py-2 rounded-md transition-colors ${
              billingCycle === 'monthly'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-4 py-2 rounded-md transition-colors relative ${
              billingCycle === 'yearly'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            Yearly
            <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">
              Save 17%
            </span>
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {SUBSCRIPTION_PLANS.map((plan) => {
          const price = billingCycle === 'monthly' ? plan.pricing.monthly : plan.pricing.yearly;
          const monthlyEquivalent = billingCycle === 'yearly' ? price / 12 : price;
          
          return (
            <Card 
              key={plan.id}
              className={`relative overflow-hidden ${
                plan.popular ? 'ring-2 ring-blue-500 scale-105' : ''
              } ${currentSubscription?.planId === plan.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
            >
              {plan.popular && (
                <div className="absolute top-0 left-0 right-0 bg-blue-500 text-white text-center py-2 text-sm font-medium">
                  🌟 Most Popular
                </div>
              )}
              
              <CardBody className={`p-6 text-center ${plan.popular ? 'pt-14' : ''}`}>
                {/* Plan Name */}
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {plan.name}
                </h3>
                
                {/* Description */}
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {plan.description}
                </p>
                
                {/* Price */}
                <div className="mb-6">
                  {plan.tier === 'free' ? (
                    <div className="text-4xl font-bold text-gray-900 dark:text-white">
                      Free
                    </div>
                  ) : (
                    <>
                      <div className="text-4xl font-bold text-gray-900 dark:text-white">
                        {formatPrice(monthlyEquivalent)}
                        <span className="text-lg text-gray-500 dark:text-gray-400 font-normal">
                          /month
                        </span>
                      </div>
                      {billingCycle === 'yearly' && (
                        <div className="text-sm text-green-600 dark:text-green-400">
                          {formatPrice(price)} billed annually • Save {formatPrice(calculateSavings(plan))}
                        </div>
                      )}
                    </>
                  )}
                </div>
                
                {/* Features */}
                <ul className="text-left space-y-3 mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
                
                {/* Action Button */}
                <Button
                  variant={getButtonVariant(plan)}
                  size="lg"
                  className="w-full"
                  onClick={() => {
                    if (currentSubscription?.planId === plan.id && currentSubscription.cancelAtPeriodEnd) {
                      handleReactivate();
                    } else {
                      handleSubscribe(plan);
                    }
                  }}
                  disabled={isButtonDisabled(plan)}
                >
                  {isLoading === plan.id ? 'Processing...' : getButtonText(plan)}
                </Button>
                
                {/* Limits Info */}
                <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                  {plan.limits.maxBetsPerMonth === -1 ? 'Unlimited bets' : `${plan.limits.maxBetsPerMonth} bets/month`}
                  {' • '}
                  {plan.limits.maxArbitrageAlerts === -1 ? 'Unlimited alerts' : `${plan.limits.maxArbitrageAlerts} alerts/day`}
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* Current Subscription Management */}
      {isAuthenticated && currentSubscription && (
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <h3 className="text-lg font-semibold">Subscription Management</h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Current Plan: {currentSubscription.planId.charAt(0).toUpperCase() + currentSubscription.planId.slice(1)}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Status: {subscriptionStatus.status}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Next billing: {new Date(currentSubscription.currentPeriodEnd).toLocaleDateString()}
                  </p>
                </div>
                
                <div className="flex gap-2">
                  {currentSubscription.cancelAtPeriodEnd ? (
                    <Button
                      variant="primary"
                      onClick={handleReactivate}
                      disabled={isLoading === 'reactivate'}
                    >
                      {isLoading === 'reactivate' ? 'Processing...' : 'Reactivate'}
                    </Button>
                  ) : currentSubscription.tier !== 'free' && (
                    <Button
                      variant="ghost"
                      onClick={handleCancelSubscription}
                      disabled={isLoading === 'cancel'}
                      className="text-red-600 hover:text-red-700"
                    >
                      {isLoading === 'cancel' ? 'Processing...' : 'Cancel Subscription'}
                    </Button>
                  )}
                </div>
              </div>

              {currentSubscription.cancelAtPeriodEnd && (
                <Alert
                  variant="warning"
                  title="Subscription Ending"
                  description={`Your subscription will end on ${new Date(currentSubscription.currentPeriodEnd).toLocaleDateString()}. You'll lose access to premium features after this date.`}
                />
              )}

              {subscriptionManager.isInTrial(currentSubscription.userId) && (
                <Alert
                  variant="info"
                  title="Free Trial Active"
                  description={`You have ${subscriptionManager.getTrialDaysRemaining(currentSubscription.userId)} days left in your free trial. Your first payment will be processed after the trial ends.`}
                />
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Enterprise Contact */}
      <div className="text-center mt-12">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Need something custom?
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Our Enterprise plan can be tailored to your specific needs
        </p>
        <Button variant="ghost" size="lg">
          Contact Sales
        </Button>
      </div>

      {/* FAQ Section */}
      <div className="mt-16">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-8">
          Frequently Asked Questions
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {[
            {
              question: "Can I cancel anytime?",
              answer: "Yes, you can cancel your subscription at any time. You'll continue to have access to premium features until the end of your current billing period."
            },
            {
              question: "Is there a free trial?",
              answer: "All paid plans come with a 14-day free trial. No credit card required to start your trial."
            },
            {
              question: "What payment methods do you accept?",
              answer: "We accept all major credit cards, PayPal, and bank transfers for Enterprise plans."
            },
            {
              question: "Can I change plans anytime?",
              answer: "Yes, you can upgrade or downgrade your plan at any time. Changes are prorated based on your billing cycle."
            }
          ].map((faq, index) => (
            <Card key={index}>
              <CardBody className="p-4">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  {faq.question}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {faq.answer}
                </p>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>

      {/* Trial Modal */}
      {showTrialModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <CardBody className="p-6 text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Welcome to Premium!
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Your 14-day free trial has started. Explore all premium features risk-free.
              </p>
              <Button
                variant="primary"
                size="lg"
                onClick={() => setShowTrialModal(false)}
              >
                Get Started
              </Button>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}