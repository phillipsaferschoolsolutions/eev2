// src/app/notifications/page.tsx
"use client";

import React, { useState } from 'react';
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
  Filter,
  Search,
  Loader2,
  Archive,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNotifications } from '@/context/notification-context';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow, format } from 'date-fns';
import { archiveNotification, deleteNotification } from '@/services/notificationService';
import { useAuth } from '@/context/auth-context';
import type { Notification, NotificationType, NotificationPriority, NotificationStatus } from '@/types/Notification';

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'task_assigned':
    case 'task_due_soon':
    case 'task_overdue':
    case 'task_completed':
      return <ClipboardList className="h-5 w-5" />;
    case 'drill_scheduled':
    case 'drill_starting_soon':
    case 'drill_completed':
      return <Zap className="h-5 w-5" />;
    case 'assignment_assigned':
    case 'assignment_due_soon':
    case 'assignment_completed':
      return <Calendar className="h-5 w-5" />;
    case 'system_alert':
    case 'security_alert':
      return <AlertTriangle className="h-5 w-5" />;
    default:
      return <Bell className="h-5 w-5" />;
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

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent':
      return 'destructive';
    case 'high':
      return 'secondary';
    case 'medium':
      return 'outline';
    case 'low':
      return 'outline';
    default:
      return 'outline';
  }
};

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
}

function NotificationItem({ notification, onMarkAsRead, onArchive, onDelete }: NotificationItemProps) {
  const router = useRouter();
  const [isMarkingAsRead, setIsMarkingAsRead] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleArchive = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsArchiving(true);
    try {
      await onArchive(notification.id);
    } finally {
      setIsArchiving(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleting(true);
    try {
      await onDelete(notification.id);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-md ${
        notification.status === 'unread' ? 'border-l-4 border-l-blue-500 bg-blue-50/50' : ''
      }`}
      onClick={handleClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-full ${getNotificationColor(notification.priority)}`}>
            {getNotificationIcon(notification.type)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-medium text-gray-900 truncate">
                    {notification.title}
                  </h3>
                  <Badge variant={getPriorityColor(notification.priority)} className="text-xs">
                    {notification.priority}
                  </Badge>
                  {notification.status === 'unread' && (
                    <Badge variant="default" className="text-xs">
                      New
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  {notification.message}
                </p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {(() => {
                      try {
                        // Handle different date formats from the backend
                        let date: Date;
                        if (notification.createdAt && typeof notification.createdAt === 'object' && 'seconds' in notification.createdAt) {
                          // Firestore Timestamp format
                          date = new Date((notification.createdAt as any).seconds * 1000);
                        } else if (notification.createdAt && typeof notification.createdAt === 'object' && 'toDate' in notification.createdAt) {
                          // Firestore Timestamp object
                          date = (notification.createdAt as any).toDate();
                        } else if (typeof notification.createdAt === 'string') {
                          // ISO string
                          date = new Date(notification.createdAt);
                        } else if (notification.createdAt) {
                          // Try to parse as is
                          date = new Date(notification.createdAt as any);
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
                  </span>
                  <span>
                    {(() => {
                      try {
                        // Handle different date formats from the backend
                        let date: Date;
                        if (notification.createdAt && typeof notification.createdAt === 'object' && 'seconds' in notification.createdAt) {
                          // Firestore Timestamp format
                          date = new Date((notification.createdAt as any).seconds * 1000);
                        } else if (notification.createdAt && typeof notification.createdAt === 'object' && 'toDate' in notification.createdAt) {
                          // Firestore Timestamp object
                          date = (notification.createdAt as any).toDate();
                        } else if (typeof notification.createdAt === 'string') {
                          // ISO string
                          date = new Date(notification.createdAt);
                        } else if (notification.createdAt) {
                          // Try to parse as is
                          date = new Date(notification.createdAt as any);
                        } else {
                          return 'Invalid date';
                        }
                        
                        if (isNaN(date.getTime())) {
                          return 'Invalid date';
                        }
                        
                        return format(date, 'MMM d, yyyy h:mm a');
                      } catch (error) {
                        return 'Invalid date';
                      }
                    })()}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                {notification.status === 'unread' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={handleMarkAsRead}
                    disabled={isMarkingAsRead}
                  >
                    {isMarkingAsRead ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={handleArchive}
                  disabled={isArchiving}
                >
                  {isArchiving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Archive className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function NotificationsPage() {
  const { notifications, stats, loading, markAsRead, markAllAsRead, refreshNotifications } = useNotifications();
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<NotificationType | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<NotificationPriority | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<NotificationStatus | 'all'>('all');

  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         notification.message.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || notification.type === typeFilter;
    const matchesPriority = priorityFilter === 'all' || notification.priority === priorityFilter;
    
    // Handle status filtering with proper status normalization
    let matchesStatus = true;
    if (statusFilter !== 'all') {
      // The backend normalizes status values, so we can filter directly
      matchesStatus = notification.status === statusFilter;
    }
    
    return matchesSearch && matchesType && matchesPriority && matchesStatus;
  });

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

  const handleArchive = async (notificationId: string) => {
    if (!userProfile?.account) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "User account not found.",
      });
      return;
    }

    try {
      await archiveNotification(notificationId, userProfile.account);
      await refreshNotifications(); // Refresh to update the list
      toast({
        title: "Notification archived",
        description: "The notification has been archived.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to archive notification.",
      });
    }
  };

  const handleDelete = async (notificationId: string) => {
    if (!userProfile?.account) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "User account not found.",
      });
      return;
    }

    try {
      await deleteNotification(notificationId, userProfile.account);
      await refreshNotifications(); // Refresh to update the list
      toast({
        title: "Notification deleted",
        description: "The notification has been permanently deleted.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete notification.",
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading notifications...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">
            Manage your notifications and stay up to date
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={refreshNotifications}>
            <Bell className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {stats && stats.unread > 0 && (
            <Button onClick={handleMarkAllAsRead}>
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark All Read
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Unread</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.unread}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">High Priority</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {(stats.byPriority.high || 0) + (stats.byPriority.urgent || 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {(stats.byType.task_assigned || 0) + (stats.byType.task_due_soon || 0) + (stats.byType.task_overdue || 0) + (stats.byType.task_completed || 0)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search notifications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as NotificationType | 'all')}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="task_assigned">Task Assigned</SelectItem>
                <SelectItem value="task_due_soon">Task Due Soon</SelectItem>
                <SelectItem value="task_overdue">Task Overdue</SelectItem>
                <SelectItem value="drill_scheduled">Drill Scheduled</SelectItem>
                <SelectItem value="drill_starting_soon">Drill Starting Soon</SelectItem>
                <SelectItem value="assignment_assigned">Assignment Assigned</SelectItem>
                <SelectItem value="system_alert">System Alert</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={(value) => setPriorityFilter(value as NotificationPriority | 'all')}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as NotificationStatus | 'all')}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="read">Read</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <div className="space-y-4">
        {filteredNotifications.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Bell className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">No notifications found</h3>
              <p className="text-gray-600">
                {searchQuery || typeFilter !== 'all' || priorityFilter !== 'all' || statusFilter !== 'all'
                  ? 'Try adjusting your filters to see more notifications.'
                  : 'You\'re all caught up! No notifications at this time.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredNotifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkAsRead={markAsRead}
              onArchive={handleArchive}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>
    </div>
  );
}
