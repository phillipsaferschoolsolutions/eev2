// src/components/layout/notification-dropdown.tsx
"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  AlertTriangle, 
  Calendar, 
  ClipboardList, 
  Zap,
  Clock,
  X,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuHeader,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications } from '@/context/notification-context';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import type { Notification } from '@/types/Notification';

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'task_assigned':
    case 'task_due_soon':
    case 'task_overdue':
    case 'task_completed':
      return <ClipboardList className="h-4 w-4" />;
    case 'drill_scheduled':
    case 'drill_starting_soon':
    case 'drill_completed':
      return <Zap className="h-4 w-4" />;
    case 'assignment_assigned':
    case 'assignment_due_soon':
    case 'assignment_completed':
      return <Calendar className="h-4 w-4" />;
    case 'system_alert':
    case 'security_alert':
      return <AlertTriangle className="h-4 w-4" />;
    default:
      return <Bell className="h-4 w-4" />;
  }
};

const getNotificationColor = (priority: string) => {
  switch (priority) {
    case 'urgent':
      return 'text-red-600 bg-red-50 border-red-200';
    case 'high':
      return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'medium':
      return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'low':
      return 'text-gray-600 bg-gray-50 border-gray-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
};

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
}

function NotificationItem({ notification, onMarkAsRead }: NotificationItemProps) {
  const router = useRouter();
  const [isMarkingAsRead, setIsMarkingAsRead] = useState(false);

  const handleClick = async () => {
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
    }
    
    if (notification.status === 'unread') {
      setIsMarkingAsRead(true);
      try {
        await onMarkAsRead(notification.id);
      } finally {
        setIsMarkingAsRead(false);
      }
    }
  };

  const handleMarkAsRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMarkingAsRead(true);
    try {
      await onMarkAsRead(notification.id);
    } finally {
      setIsMarkingAsRead(false);
    }
  };

  return (
    <div 
      className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
        notification.status === 'unread' ? 'bg-blue-50' : ''
      }`}
      onClick={handleClick}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-full ${getNotificationColor(notification.priority)}`}>
          {getNotificationIcon(notification.type)}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 break-words">
                {notification.title}
              </p>
              <p className="text-xs text-gray-600 mt-1 break-words">
                {notification.message}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                {(() => {
                  try {
                    // Handle different date formats from the backend
                    let date;
                    if (notification.createdAt?.seconds) {
                      // Firestore Timestamp format
                      date = new Date(notification.createdAt.seconds * 1000);
                    } else if (notification.createdAt?.toDate) {
                      // Firestore Timestamp object
                      date = notification.createdAt.toDate();
                    } else if (typeof notification.createdAt === 'string') {
                      // ISO string
                      date = new Date(notification.createdAt);
                    } else if (notification.createdAt) {
                      // Try to parse as is
                      date = new Date(notification.createdAt);
                    } else {
                      return 'Unknown time';
                    }
                    
                    if (isNaN(date.getTime())) {
                      return 'Invalid time';
                    }
                    
                    return formatDistanceToNow(date, { addSuffix: true });
                  } catch (error) {
                    return 'Invalid time';
                  }
                })()}
              </p>
            </div>
            
            {notification.status === 'unread' && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={handleMarkAsRead}
                disabled={isMarkingAsRead}
              >
                {isMarkingAsRead ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Check className="h-3 w-3" />
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function NotificationDropdown() {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      toast({
        title: "All notifications marked as read",
        description: "All notifications have been marked as read.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to mark all notifications as read.",
      });
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-96 max-w-[90vw] p-0">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="text-xs"
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
          {unreadCount > 0 && (
            <p className="text-sm text-gray-600 mt-1">
              {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        <ScrollArea className="max-h-[70vh]">
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p className="text-sm text-gray-600">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-600">No new notifications</p>
              <p className="text-xs text-gray-500 mt-1">
                You're all caught up!
              </p>
            </div>
          ) : (
            <div className="group">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={markAsRead}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Button variant="ghost" className="w-full" asChild>
                <Link href="/notifications">
                  View all notifications
                </Link>
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
