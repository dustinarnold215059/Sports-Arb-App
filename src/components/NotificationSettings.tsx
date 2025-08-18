'use client';

import { useState, useEffect } from 'react';
import { notificationManager, NotificationConfig, updateNotificationSettings, getNotificationSettings } from '@/lib/notifications';
import { useAuth } from '../shared/auth/authProvider';
import { Card, CardHeader, CardBody, Button, Alert } from '../shared/components/ui';

export function NotificationSettings() {
  const { user, isAuthenticated } = useAuth();
  const [config, setConfig] = useState<NotificationConfig>(getNotificationSettings());
  const [isLoading, setIsLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      setConfig(getNotificationSettings());
    }
  }, [isAuthenticated]);

  const handleToggle = (section: keyof NotificationConfig, key: string) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: !prev[section][key as keyof typeof prev[section]]
      }
    }));
  };

  const handleThresholdChange = (key: keyof NotificationConfig['thresholds'], value: number) => {
    setConfig(prev => ({
      ...prev,
      thresholds: {
        ...prev.thresholds,
        [key]: value
      }
    }));
  };

  const handleScheduleChange = (key: keyof NotificationConfig['schedule'], value: string | boolean) => {
    setConfig(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        [key]: value
      }
    }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    setSaveMessage('');

    try {
      updateNotificationSettings(config);
      setSaveMessage('Settings saved successfully!');
      
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      setSaveMessage('Failed to save settings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestNotification = async () => {
    setIsLoading(true);
    try {
      await notificationManager.sendTestNotification(user?.id || 'demo-user');
      setSaveMessage('Test notification sent!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      setSaveMessage('Failed to send test notification.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    const defaultConfig = notificationManager.getConfig();
    setConfig(defaultConfig);
    setSaveMessage('Settings reset to defaults.');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Alert
          variant="info"
          title="Authentication Required"
          description="Please log in to access notification settings."
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            🔔 Notification Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Customize your notification preferences and alerts
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="ghost"
            onClick={handleTestNotification}
            disabled={isLoading}
          >
            Test Notification
          </Button>
          <Button
            variant="ghost"
            onClick={handleReset}
            disabled={isLoading}
          >
            Reset to Defaults
          </Button>
        </div>
      </div>

      {/* Save Message */}
      {saveMessage && (
        <Alert
          variant={saveMessage.includes('successfully') ? 'success' : 'warning'}
          title={saveMessage}
        />
      )}

      {/* Master Toggle */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Master Controls</h3>
        </CardHeader>
        <CardBody>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Enable Notifications</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Turn all notifications on or off
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={() => handleToggle('enabled' as any, 'enabled')}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </CardBody>
      </Card>

      {/* Notification Types */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Notification Types</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Choose which types of notifications you want to receive
          </p>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            {[
              {
                key: 'arbitrageOpportunities',
                label: 'Arbitrage Opportunities',
                description: 'Get notified when profitable arbitrage opportunities are found',
                icon: '🎯'
              },
              {
                key: 'betResults',
                label: 'Bet Results',
                description: 'Notifications when your bets win or lose',
                icon: '🎲'
              },
              {
                key: 'priceAlerts',
                label: 'Price Alerts',
                description: 'Alert when odds change significantly',
                icon: '📊'
              },
              {
                key: 'portfolioMilestones',
                label: 'Portfolio Milestones',
                description: 'Celebrate when you reach profit goals',
                icon: '🏆'
              },
              {
                key: 'systemUpdates',
                label: 'System Updates',
                description: 'Important system announcements and updates',
                icon: '⚙️'
              }
            ].map(({ key, label, description, icon }) => (
              <div key={key} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{icon}</span>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">{label}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.types[key as keyof typeof config.types]}
                    onChange={() => handleToggle('types', key)}
                    disabled={!config.enabled}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
                </label>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Thresholds */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Alert Thresholds</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Set minimum values for triggering notifications
          </p>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Minimum Profit Margin (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={config.thresholds.minProfitMargin}
                onChange={(e) => handleThresholdChange('minProfitMargin', parseFloat(e.target.value) || 0)}
                disabled={!config.enabled}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Only notify for arbitrage opportunities above this margin
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Minimum Bet Amount ($)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={config.thresholds.minBetAmount}
                onChange={(e) => handleThresholdChange('minBetAmount', parseFloat(e.target.value) || 0)}
                disabled={!config.enabled}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Only notify for bets above this amount
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Max Notifications Per Hour
              </label>
              <input
                type="number"
                min="1"
                max="100"
                step="1"
                value={config.thresholds.maxNotificationsPerHour}
                onChange={(e) => handleThresholdChange('maxNotificationsPerHour', parseInt(e.target.value) || 1)}
                disabled={!config.enabled}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Prevent notification spam
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Delivery Channels */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Delivery Channels</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Choose how you want to receive notifications
          </p>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                key: 'browser',
                label: 'Browser Push',
                description: 'Desktop/mobile browser notifications',
                available: true
              },
              {
                key: 'email',
                label: 'Email',
                description: 'Email notifications to your registered address',
                available: false
              },
              {
                key: 'sms',
                label: 'SMS',
                description: 'Text message alerts',
                available: false
              },
              {
                key: 'discord',
                label: 'Discord',
                description: 'Discord webhook notifications',
                available: false
              },
              {
                key: 'telegram',
                label: 'Telegram',
                description: 'Telegram bot messages',
                available: false
              }
            ].map(({ key, label, description, available }) => (
              <div key={key} className={`flex items-center justify-between p-3 rounded-lg ${
                available ? 'bg-gray-50 dark:bg-gray-700' : 'bg-gray-100 dark:bg-gray-800 opacity-60'
              }`}>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900 dark:text-white">{label}</h4>
                    {!available && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded dark:bg-yellow-900 dark:text-yellow-200">
                        Coming Soon
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.channels[key as keyof typeof config.channels]}
                    onChange={() => handleToggle('channels', key)}
                    disabled={!config.enabled || !available}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
                </label>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Schedule */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Quiet Hours</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Set specific hours when you want to receive notifications
          </p>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Enable Scheduled Notifications</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Only receive notifications during specified hours
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.schedule.enabled}
                  onChange={() => handleScheduleChange('enabled', !config.schedule.enabled)}
                  disabled={!config.enabled}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
              </label>
            </div>

            {config.schedule.enabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={config.schedule.startTime}
                    onChange={(e) => handleScheduleChange('startTime', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={config.schedule.endTime}
                    onChange={(e) => handleScheduleChange('endTime', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div className="md:col-span-2">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    📅 Notifications will only be sent between {config.schedule.startTime} and {config.schedule.endTime} in your local timezone ({config.schedule.timezone})
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isLoading}
          variant="primary"
          size="lg"
          className="min-w-[120px]"
        >
          {isLoading ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}