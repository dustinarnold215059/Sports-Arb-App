'use client';

import { useState, useEffect, useRef } from 'react';
import { notificationManager, NotificationData, subscribeToNotifications, initializeNotifications } from '@/lib/notifications';
import { useAuth } from '../shared/auth/authProvider';
import { Card, CardHeader, CardBody, Button, Badge } from '../shared/components/ui';

export function NotificationCenter() {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'arbitrage' | 'bets'>('all');
  const [permissionStatus, setPermissionStatus] = useState<'default' | 'granted' | 'denied'>('default');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const userId = user?.id || 'demo-user';

  useEffect(() => {
    if (!isAuthenticated) return;

    // Initialize notifications
    initializeNotifications().then(granted => {
      setPermissionStatus(granted ? 'granted' : 'denied');
    });

    // Check current permission status
    if ('Notification' in window) {
      setPermissionStatus(Notification.permission);
    }

    // Load existing notifications
    loadNotifications();

    // Subscribe to new notifications
    const unsubscribe = subscribeToNotifications(handleNewNotification);

    // Set up periodic cleanup of expired notifications
    const cleanupInterval = setInterval(() => {
      notificationManager.clearExpiredNotifications();
      loadNotifications();
    }, 60000); // Every minute

    return () => {
      unsubscribe();
      clearInterval(cleanupInterval);
    };
  }, [isAuthenticated, userId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadNotifications = () => {
    const allNotifications = notificationManager.getNotifications(userId, 50);
    setNotifications(allNotifications);
    setUnreadCount(notificationManager.getUnreadCount(userId));
  };

  const handleNewNotification = (notification: NotificationData) => {
    if (notification.userId === userId) {
      loadNotifications();
    }
  };

  const handleNotificationClick = (notification: NotificationData) => {
    if (!notification.read) {
      notificationManager.markAsRead(notification.id);
      loadNotifications();
    }

    // Handle notification action
    if (notification.actions && notification.actions.length > 0) {
      const primaryAction = notification.actions[0];
      notificationManager.handleNotificationAction(notification.id, primaryAction.action, primaryAction.data);
    }
  };

  const handleMarkAllRead = () => {
    notifications.forEach(notification => {
      if (!notification.read) {
        notificationManager.markAsRead(notification.id);
      }
    });
    loadNotifications();
  };

  const handleClearAll = () => {
    notificationManager.clearAllNotifications(userId);
    loadNotifications();
    setIsOpen(false);
  };

  const handleTestNotification = async () => {
    await notificationManager.sendTestNotification(userId);
    loadNotifications();
  };

  const handleRequestPermission = async () => {
    const granted = await initializeNotifications();
    setPermissionStatus(granted ? 'granted' : 'denied');
  };

  const filteredNotifications = notifications.filter(notification => {
    switch (filter) {
      case 'unread':
        return !notification.read;
      case 'arbitrage':
        return notification.type === 'arbitrage';
      case 'bets':
        return notification.type === 'bet_result';
      default:
        return true;
    }
  });

  const getNotificationIcon = (type: NotificationData['type']) => {
    switch (type) {
      case 'arbitrage':
        return '🎯';
      case 'bet_result':
        return '🎲';
      case 'price_alert':
        return '📊';
      case 'milestone':
        return '🏆';
      case 'system':
        return '⚙️';
      case 'market_update':
        return '📈';
      default:
        return '🔔';
    }
  };

  const getPriorityColor = (priority: NotificationData['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors"
      >
        <div className="relative">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          
          {unreadCount > 0 && (
            <Badge 
              variant="danger" 
              className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 text-xs flex items-center justify-center"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </div>
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 max-h-[80vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllRead}
                  className="text-xs"
                >
                  Mark all read
                </Button>
              )}
            </div>

            {/* Permission Status */}
            {permissionStatus !== 'granted' && (
              <div className="mb-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-yellow-800 dark:text-yellow-200">
                    Enable push notifications
                  </span>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleRequestPermission}
                    className="text-xs px-2 py-1"
                  >
                    Enable
                  </Button>
                </div>
              </div>
            )}

            {/* Filter Tabs */}
            <div className="flex gap-1">
              {[
                { key: 'all', label: 'All' },
                { key: 'unread', label: 'Unread' },
                { key: 'arbitrage', label: 'Arbitrage' },
                { key: 'bets', label: 'Bets' }
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key as any)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    filter === key
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-4xl mb-2">🔔</div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  {filter === 'all' ? 'No notifications yet' : `No ${filter} notifications`}
                </p>
                {permissionStatus === 'granted' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleTestNotification}
                    className="mt-2 text-xs"
                  >
                    Send test notification
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors ${
                      !notification.read ? 'bg-blue-50 dark:bg-blue-900/10' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon and Priority Indicator */}
                      <div className="relative">
                        <div className="text-2xl">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full ${getPriorityColor(notification.priority)}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className={`font-medium text-sm ${
                            !notification.read 
                              ? 'text-gray-900 dark:text-white' 
                              : 'text-gray-700 dark:text-gray-300'
                          }`}>
                            {notification.title}
                          </h4>
                          <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 flex-shrink-0">
                            {formatTimeAgo(notification.timestamp)}
                          </span>
                        </div>
                        
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                          {notification.message}
                        </p>

                        {/* Actions */}
                        {notification.actions && notification.actions.length > 0 && (
                          <div className="flex gap-2">
                            {notification.actions.slice(0, 2).map((action) => (
                              <button
                                key={action.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  notificationManager.handleNotificationAction(
                                    notification.id, 
                                    action.action, 
                                    action.data
                                  );
                                  loadNotifications();
                                }}
                                className="text-xs bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 px-2 py-1 rounded transition-colors"
                              >
                                {action.label}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Unread indicator */}
                        {!notification.read && (
                          <div className="mt-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {filteredNotifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="text-xs text-red-600 hover:text-red-700"
              >
                Clear all
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="text-xs"
              >
                Close
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}