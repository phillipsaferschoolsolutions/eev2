// src/services/notificationService.ts
'use client';

import { auth } from '@/lib/firebase';
import type { User } from 'firebase/auth';
import type { 
  Notification, 
  CreateNotificationPayload, 
  NotificationFilters, 
  NotificationStats,
  NotificationType,
  NotificationPriority,
  NotificationStatus
} from '@/types/Notification';

// Define a base URL for your notification Cloud Functions - dynamically detected
const NOTIFICATIONS_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://us-central1-webmvp-5b733.cloudfunctions.net/notificationsv2'
  : 'https://us-central1-webmvp-5b733.cloudfunctions.net/notificationsv2';

// Helper function for authenticated requests
async function authedFetch<T>(
  fullUrl: string,
  options: RequestInit = {},
  accountId?: string
): Promise<T> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User must be authenticated to fetch notifications');
  }

  const idToken = await user.getIdToken();
  
  // Get account name from localStorage if not provided
  const accountName = accountId || localStorage.getItem('accountName');
  
  console.log(`Making request to: ${fullUrl}`);
  console.log(`Headers:`, {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${idToken.substring(0, 20)}...`,
    'account': accountName,
    ...options.headers,
  });

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${idToken}`,
    ...options.headers,
  };

  // Add account header if available
  if (accountName) {
    headers['account'] = accountName;
  } else {
    console.warn(`[CRITICAL] authedFetch (notificationService): 'account' header not found for URL: ${fullUrl}.`);
    // Throw error for missing account header to prevent further issues
    throw new Error('Account header is required for notification requests');
  }

  const response = await fetch(fullUrl, {
    ...options,
    headers,
  });

  console.log(`Response status: ${response.status} ${response.statusText}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`API Error ${response.status}: ${errorText}`);
    throw new Error(`API Error ${response.status}: ${errorText}`);
  }

  const textResponse = await response.text();
  try {
    return JSON.parse(textResponse) as T;
  } catch {
    return textResponse as unknown as T;
  }
}

/**
 * Fetches notifications for the current user
 */
export async function getNotifications(
  accountId: string,
  filters?: NotificationFilters
): Promise<Notification[]> {
  if (!accountId || accountId.trim() === "") {
    throw new Error("Account ID is required for getNotifications.");
  }

  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.type) params.append('type', filters.type);
  if (filters?.priority) params.append('priority', filters.priority);
  if (filters?.limit) params.append('limit', filters.limit.toString());
  if (filters?.offset) params.append('offset', filters.offset.toString());

  const url = `${NOTIFICATIONS_BASE_URL}?${params.toString()}`;
  
  return authedFetch<Notification[]>(url, {
    method: 'GET',
  }, accountId);
}

/**
 * Fetches unread notifications for the current user
 */
export async function getUnreadNotifications(accountId: string): Promise<Notification[]> {
  return getNotifications(accountId, { status: 'unread' });
}

/**
 * Marks a notification as read
 */
export async function markNotificationAsRead(
  notificationId: string,
  accountId: string
): Promise<void> {
  if (!notificationId || !accountId) {
    throw new Error("Notification ID and Account ID are required.");
  }

  await authedFetch<void>(`${NOTIFICATIONS_BASE_URL}/${notificationId}/read`, {
    method: 'PATCH',
  }, accountId);
}

/**
 * Marks multiple notifications as read
 */
export async function markNotificationsAsRead(
  notificationIds: string[],
  accountId: string
): Promise<void> {
  if (!notificationIds.length || !accountId) {
    throw new Error("Notification IDs and Account ID are required.");
  }

  await authedFetch<void>(`${NOTIFICATIONS_BASE_URL}/mark-read`, {
    method: 'PATCH',
    body: JSON.stringify({ notificationIds }),
  }, accountId);
}

/**
 * Marks all notifications as read for the current user
 */
export async function markAllNotificationsAsRead(accountId: string): Promise<void> {
  if (!accountId) {
    throw new Error("Account ID is required.");
  }

  await authedFetch<void>(`${NOTIFICATIONS_BASE_URL}/mark-all-read`, {
    method: 'PATCH',
  }, accountId);
}

/**
 * Archives a notification
 */
export async function archiveNotification(
  notificationId: string,
  accountId: string
): Promise<void> {
  if (!notificationId || !accountId) {
    throw new Error("Notification ID and Account ID are required.");
  }

  await authedFetch<void>(`${NOTIFICATIONS_BASE_URL}/${notificationId}/archive`, {
    method: 'PATCH',
  }, accountId);
}

/**
 * Gets notification statistics for the current user
 */
export async function getNotificationStats(accountId: string): Promise<NotificationStats> {
  if (!accountId || accountId.trim() === "") {
    throw new Error("Account ID is required for getNotificationStats.");
  }

  return authedFetch<NotificationStats>(`${NOTIFICATIONS_BASE_URL}/stats`, {
    method: 'GET',
  }, accountId);
}

/**
 * Creates a new notification (typically used by system/admin functions)
 */
export async function createNotification(
  payload: CreateNotificationPayload
): Promise<Notification> {
  if (!payload.accountId || !payload.userId) {
    throw new Error("Account ID and User ID are required for createNotification.");
  }

  return authedFetch<Notification>(`${NOTIFICATIONS_BASE_URL}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }, payload.accountId);
}

/**
 * Deletes a notification
 */
export async function deleteNotification(
  notificationId: string,
  accountId: string
): Promise<void> {
  if (!notificationId || !accountId) {
    throw new Error("Notification ID and Account ID are required.");
  }

  await authedFetch<void>(`${NOTIFICATIONS_BASE_URL}/${notificationId}`, {
    method: 'DELETE',
  }, accountId);
}

/**
 * Helper function to create task-related notifications
 */
export async function createTaskNotification(
  accountId: string,
  userId: string,
  taskTitle: string,
  type: 'task_assigned' | 'task_due_soon' | 'task_overdue' | 'task_completed',
  taskId: string,
  priority: NotificationPriority = 'medium'
): Promise<Notification> {
  const messages = {
    task_assigned: `You have been assigned a new task: ${taskTitle}`,
    task_due_soon: `Task "${taskTitle}" is due soon`,
    task_overdue: `Task "${taskTitle}" is overdue`,
    task_completed: `Task "${taskTitle}" has been completed`,
  };

  return createNotification({
    accountId,
    userId,
    type,
    priority,
    title: messages[type],
    message: messages[type],
    actionUrl: `/tasks?taskId=${taskId}`,
    relatedEntityType: 'task',
    relatedEntityId: taskId,
  });
}

/**
 * Helper function to create drill-related notifications
 */
export async function createDrillNotification(
  accountId: string,
  userId: string,
  drillTitle: string,
  type: 'drill_scheduled' | 'drill_starting_soon' | 'drill_completed',
  drillId: string,
  priority: NotificationPriority = 'medium'
): Promise<Notification> {
  const messages = {
    drill_scheduled: `New drill scheduled: ${drillTitle}`,
    drill_starting_soon: `Drill "${drillTitle}" is starting soon`,
    drill_completed: `Drill "${drillTitle}" has been completed`,
  };

  return createNotification({
    accountId,
    userId,
    type,
    priority,
    title: messages[type],
    message: messages[type],
    actionUrl: `/drill-tracking/${drillId}`,
    relatedEntityType: 'drill',
    relatedEntityId: drillId,
  });
}

/**
 * Helper function to create assignment-related notifications
 */
export async function createAssignmentNotification(
  accountId: string,
  userId: string,
  assignmentTitle: string,
  type: 'assignment_assigned' | 'assignment_due_soon' | 'assignment_completed',
  assignmentId: string,
  priority: NotificationPriority = 'medium'
): Promise<Notification> {
  const messages = {
    assignment_assigned: `New assignment: ${assignmentTitle}`,
    assignment_due_soon: `Assignment "${assignmentTitle}" is due soon`,
    assignment_completed: `Assignment "${assignmentTitle}" has been completed`,
  };

  return createNotification({
    accountId,
    userId,
    type,
    priority,
    title: messages[type],
    message: messages[type],
    actionUrl: `/assignments/${assignmentId}`,
    relatedEntityType: 'assignment',
    relatedEntityId: assignmentId,
  });
}
