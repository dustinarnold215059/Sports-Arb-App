'use client';

import { useState, useEffect } from 'react';
import { subscriptionManager, BillingHistory, formatPrice } from '@/lib/subscription';
import { useAuth } from '../shared/auth/authProvider';
import { Card, CardHeader, CardBody, Button, Badge, Alert } from '../shared/components/ui';

export function BillingHistory() {
  const { user, isAuthenticated } = useAuth();
  const [billingHistory, setBillingHistory] = useState<BillingHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadBillingHistory();
    }
  }, [isAuthenticated, user]);

  const loadBillingHistory = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const history = await subscriptionManager.getBillingHistory(user.id);
      setBillingHistory(history.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (error) {
      console.error('Failed to load billing history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: BillingHistory['status']) => {
    const statusConfig = {
      paid: { variant: 'success' as const, label: 'Paid' },
      pending: { variant: 'warning' as const, label: 'Pending' },
      failed: { variant: 'danger' as const, label: 'Failed' },
      refunded: { variant: 'secondary' as const, label: 'Refunded' }
    };

    const config = statusConfig[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const downloadInvoice = (invoice: BillingHistory) => {
    if (invoice.invoiceUrl) {
      window.open(invoice.invoiceUrl, '_blank');
    } else {
      // Generate a mock PDF invoice
      alert('Invoice download would be available in production');
    }
  };

  const retryPayment = async (invoice: BillingHistory) => {
    if (!user) return;

    try {
      const success = await subscriptionManager.processPayment(invoice.id, user.id);
      if (success) {
        await loadBillingHistory();
        alert('Payment processed successfully!');
      } else {
        alert('Payment failed. Please check your payment method.');
      }
    } catch (error) {
      console.error('Payment retry failed:', error);
      alert('Failed to process payment. Please try again.');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Alert
          variant="info"
          title="Authentication Required"
          description="Please log in to view your billing history."
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            📄 Billing History
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            View and manage your payment history
          </p>
        </div>
        
        <Button
          variant="ghost"
          onClick={loadBillingHistory}
          disabled={isLoading}
        >
          🔄 Refresh
        </Button>
      </div>

      {/* Billing Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardBody className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {formatPrice(billingHistory.filter(h => h.status === 'paid').reduce((sum, h) => sum + h.amount, 0))}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Paid</div>
          </CardBody>
        </Card>
        
        <Card>
          <CardBody className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {billingHistory.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Invoices</div>
          </CardBody>
        </Card>
        
        <Card>
          <CardBody className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {billingHistory.filter(h => h.status === 'failed').length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Failed Payments</div>
          </CardBody>
        </Card>
      </div>

      {/* Billing History Table */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Payment History</h3>
        </CardHeader>
        <CardBody>
          {billingHistory.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📄</div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No billing history yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Your payment history will appear here once you make your first payment.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                      Invoice
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                      Date
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                      Amount
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                      Status
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900 dark:text-white">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {billingHistory.map((invoice) => (
                    <tr key={invoice.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="py-4 px-4">
                        <div className="font-medium text-gray-900 dark:text-white">
                          #{invoice.id.slice(-8).toUpperCase()}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Subscription Payment
                        </div>
                      </td>
                      
                      <td className="py-4 px-4">
                        <div className="text-gray-900 dark:text-white">
                          {formatDate(invoice.createdAt)}
                        </div>
                        {invoice.paidAt && (
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            Paid: {formatDate(invoice.paidAt)}
                          </div>
                        )}
                      </td>
                      
                      <td className="py-4 px-4">
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {formatPrice(invoice.amount, invoice.currency)}
                        </div>
                      </td>
                      
                      <td className="py-4 px-4">
                        {getStatusBadge(invoice.status)}
                      </td>
                      
                      <td className="py-4 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          {invoice.status === 'paid' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => downloadInvoice(invoice)}
                            >
                              📥 Download
                            </Button>
                          )}
                          
                          {invoice.status === 'failed' && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => retryPayment(invoice)}
                            >
                              🔄 Retry Payment
                            </Button>
                          )}
                          
                          {invoice.status === 'pending' && (
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              Processing...
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Payment Methods */}
      <Card className="mt-8">
        <CardHeader>
          <h3 className="text-lg font-semibold">Payment Methods</h3>
        </CardHeader>
        <CardBody>
          <div className="text-center py-8">
            <div className="text-4xl mb-4">💳</div>
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Manage Payment Methods
            </h4>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Add or update your payment methods for seamless billing
            </p>
            <Button variant="primary">
              Add Payment Method
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Billing Alerts */}
      {billingHistory.some(h => h.status === 'failed') && (
        <Alert
          variant="warning"
          title="Payment Issues Detected"
          description="You have failed payments that need attention. Please update your payment method or retry the failed payments."
          className="mt-6"
        />
      )}

      {/* Support */}
      <div className="mt-12 text-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Need help with billing?
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Our support team is here to help with any billing questions or issues.
        </p>
        <Button variant="ghost">
          Contact Support
        </Button>
      </div>
    </div>
  );
}