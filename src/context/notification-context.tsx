// src/context/notification-context.tsx
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './auth-context';
import { 
  getNotifications,
  getUnreadNotifications, 
  getNotificationStats, 
  markNotificationAsRead,
  markAllNotificationsAsRead,
  type Notification,
  type NotificationStats
} from '@/services/notificationService';

interface NotificationContextType {
  notifications: Notification[];
  stats: NotificationStats | null;
  unreadCount: number;
  loading: boolean;
  error: string | null;
  refreshNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearError: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { userProfile, loading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unreadCount = stats?.unread || 0;

  const refreshNotifications = useCallback(async () => {
    if (!userProfile?.account || authLoading) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [notificationsData, statsData] = await Promise.all([
        getNotifications(userProfile.account), // Fetch ALL notifications, not just unread
        getNotificationStats(userProfile.account)
      ]);

      setNotifications(notificationsData);
      setStats(statsData);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      // Only set error for non-auth related issues
      if (err instanceof Error && !err.message.includes('Account header is required')) {
        setError(err.message);
      } else {
        console.warn('Notification service not available - account may not be fully loaded yet');
        // Clear any existing data if auth fails
        setNotifications([]);
        setStats(null);
      }
    } finally {
      setLoading(false);
    }
  }, [userProfile?.account, authLoading]);

  const markAsRead = useCallback(async (notificationId: string) => {
    if (!userProfile?.account) return;

    try {
      await markNotificationAsRead(notificationId, userProfile.account);
      
      // Update local state
      setNotifications(prev => 
        prev.filter(notification => notification.id !== notificationId)
      );
      
      // Refresh stats to get accurate unread count
      const updatedStats = await getNotificationStats(userProfile.account);
      setStats(updatedStats);
    } catch (err) {
      console.error('Error marking notification as read:', err);
      setError(err instanceof Error ? err.message : 'Failed to mark notification as read');
    }
  }, [userProfile?.account]);

  const markAllAsRead = useCallback(async () => {
    if (!userProfile?.account) return;

    try {
      await markAllNotificationsAsRead(userProfile.account);
      
      // Update local state
      setNotifications([]);
      
      // Refresh stats to get accurate unread count
      const updatedStats = await getNotificationStats(userProfile.account);
      setStats(updatedStats);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      setError(err instanceof Error ? err.message : 'Failed to mark all notifications as read');
    }
  }, [userProfile?.account]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Fetch notifications when user profile is available
  useEffect(() => {
    if (!authLoading && userProfile?.account) {
      // Add a small delay to ensure auth is fully ready
      const timer = setTimeout(() => {
        refreshNotifications();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [refreshNotifications, authLoading, userProfile?.account]);

  // Set up polling for new notifications (every 30 seconds)
  useEffect(() => {
    if (!userProfile?.account || authLoading) return;

    const interval = setInterval(() => {
      refreshNotifications();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [refreshNotifications, userProfile?.account, authLoading]);

  const value: NotificationContextType = {
    notifications,
    stats,
    unreadCount,
    loading,
    error,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
    clearError,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
