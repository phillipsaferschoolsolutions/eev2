// src/types/Notification.ts
import type { Timestamp, FieldValue } from 'firebase/firestore';

export type NotificationType = 
  | 'task_assigned'
  | 'task_due_soon'
  | 'task_overdue'
  | 'task_completed'
  | 'drill_scheduled'
  | 'drill_starting_soon'
  | 'drill_completed'
  | 'assignment_assigned'
  | 'assignment_due_soon'
  | 'assignment_completed'
  | 'system_alert'
  | 'maintenance_reminder'
  | 'security_alert'
  | 'general';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export type NotificationStatus = 'unread' | 'read' | 'archived';

export interface Notification {
  id: string;
  accountId: string;
  userId: string; // User email or ID
  type: NotificationType;
  priority: NotificationPriority;
  status: NotificationStatus;
  
  // Content
  title: string;
  message: string;
  actionUrl?: string; // URL to navigate to when clicked
  
  // Related entities
  relatedEntityType?: 'task' | 'drill' | 'assignment' | 'asset' | 'user';
  relatedEntityId?: string;
  
  // Metadata
  createdAt: Timestamp | FieldValue;
  readAt?: Timestamp | FieldValue;
  expiresAt?: Timestamp | FieldValue;
  
  // Additional data
  metadata?: Record<string, unknown>;
}

export interface CreateNotificationPayload {
  accountId: string;
  userId: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  actionUrl?: string;
  relatedEntityType?: 'task' | 'drill' | 'assignment' | 'asset' | 'user';
  relatedEntityId?: string;
  expiresAt?: Timestamp | FieldValue;
  metadata?: Record<string, unknown>;
}

export interface NotificationFilters {
  status?: NotificationStatus;
  type?: NotificationType;
  priority?: NotificationPriority;
  limit?: number;
  offset?: number;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<NotificationType, number>;
  byPriority: Record<NotificationPriority, number>;
}
