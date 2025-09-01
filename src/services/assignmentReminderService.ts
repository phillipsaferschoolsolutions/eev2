// src/services/assignmentReminderService.ts
'use client';

import { createAssignmentNotification } from './notificationService';

export interface AssignmentReminder {
  id: string;
  assignmentId: string;
  assignmentName: string;
  frequency: string;
  dueDate?: string;
  accountId: string;
  userId: string;
  lastReminded?: Date;
  nextReminder?: Date;
}

export interface ReminderSchedule {
  frequency: string;
  intervals: number[]; // Days before due date to send reminders
  recurringInterval?: number; // Days between reminders for recurring assignments
}

// Define reminder schedules for different assignment frequencies
const REMINDER_SCHEDULES: Record<string, ReminderSchedule> = {
  onetime: {
    frequency: 'onetime',
    intervals: [7, 3, 1], // Remind 7 days, 3 days, and 1 day before due
  },
  daily: {
    frequency: 'daily',
    intervals: [1], // Remind 1 day before due
    recurringInterval: 1, // Daily reminders
  },
  weekly: {
    frequency: 'weekly',
    intervals: [3, 1], // Remind 3 days and 1 day before due
    recurringInterval: 7, // Weekly reminders
  },
  monthly: {
    frequency: 'monthly',
    intervals: [7, 3, 1], // Remind 7, 3, and 1 days before due
    recurringInterval: 30, // Monthly reminders
  },
  quarterly: {
    frequency: 'quarterly',
    intervals: [14, 7, 3, 1], // Remind 14, 7, 3, and 1 days before due
    recurringInterval: 90, // Quarterly reminders
  },
  annually: {
    frequency: 'annually',
    intervals: [30, 14, 7, 3, 1], // Remind 30, 14, 7, 3, and 1 days before due
    recurringInterval: 365, // Annual reminders
  },
};

/**
 * Calculates when reminders should be sent for an assignment
 */
export function calculateReminderDates(
  frequency: string,
  dueDate: string
): Date[] {
  const schedule = REMINDER_SCHEDULES[frequency];
  if (!schedule) {
    console.warn(`No reminder schedule found for frequency: ${frequency}`);
    return [];
  }

  const due = new Date(dueDate);
  const reminderDates: Date[] = [];

  // Calculate reminder dates based on intervals
  schedule.intervals.forEach(days => {
    const reminderDate = new Date(due);
    reminderDate.setDate(due.getDate() - days);
    reminderDates.push(reminderDate);
  });

  return reminderDates.sort((a, b) => a.getTime() - b.getTime());
}

/**
 * Checks if a reminder should be sent today
 */
export function shouldSendReminder(
  reminder: AssignmentReminder,
  today: Date = new Date()
): boolean {
  const { frequency, dueDate, lastReminded } = reminder;
  
  if (!dueDate) return false;

  const due = new Date(dueDate);
  const schedule = REMINDER_SCHEDULES[frequency];
  
  if (!schedule) return false;

  // For one-time assignments, check if we should send reminder based on intervals
  if (frequency === 'onetime') {
    const reminderDates = calculateReminderDates(frequency, dueDate);
    const todayStr = today.toDateString();
    
    return reminderDates.some(date => {
      const reminderStr = date.toDateString();
      return reminderStr === todayStr && 
             (!lastReminded || date.getTime() > lastReminded.getTime());
    });
  }

  // For recurring assignments, check if enough time has passed since last reminder
  if (schedule.recurringInterval && lastReminded) {
    const daysSinceLastReminder = Math.floor(
      (today.getTime() - lastReminded.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysSinceLastReminder >= schedule.recurringInterval;
  }

  // If no last reminder, send first reminder
  return !lastReminded;
}

/**
 * Sends a reminder notification for an assignment
 */
export async function sendAssignmentReminder(
  reminder: AssignmentReminder
): Promise<void> {
  const { assignmentId, assignmentName, accountId, userId, frequency, dueDate } = reminder;

  try {
    // Determine the appropriate message based on frequency and due date
    let messageType: 'assignment_assigned' | 'assignment_due_soon' = 'assignment_assigned';
    
    if (dueDate) {
      const due = new Date(dueDate);
      const today = new Date();
      const daysUntilDue = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilDue <= 3) {
        messageType = 'assignment_due_soon';
      }
    }

    await createAssignmentNotification(
      accountId,
      userId,
      assignmentName,
      messageType,
      assignmentId,
      'medium'
    );

    console.log(`Reminder sent for assignment: ${assignmentName} to user: ${userId}`);
  } catch (error) {
    console.error(`Failed to send reminder for assignment ${assignmentId}:`, error);
    throw error;
  }
}

/**
 * Batch processes reminders for multiple assignments
 */
export async function processAssignmentReminders(
  reminders: AssignmentReminder[],
  today: Date = new Date()
): Promise<{ sent: number; failed: number; errors: string[] }> {
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const reminder of reminders) {
    try {
      if (shouldSendReminder(reminder, today)) {
        await sendAssignmentReminder(reminder);
        sent++;
      }
    } catch (error) {
      failed++;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`${reminder.assignmentName}: ${errorMessage}`);
    }
  }

  return { sent, failed, errors };
}

/**
 * Creates reminder objects from assignment data
 */
export function createRemindersFromAssignments(
  assignments: Array<{
    id: string;
    assessmentName: string;
    frequency: string;
    dueDate?: string;
    accountSubmittedFor: string;
    assignedUsers?: string[];
  }>
): AssignmentReminder[] {
  const reminders: AssignmentReminder[] = [];

  assignments.forEach(assignment => {
    const { id, assessmentName, frequency, dueDate, accountSubmittedFor, assignedUsers } = assignment;
    
    if (!assignedUsers || assignedUsers.length === 0) {
      console.warn(`No assigned users for assignment: ${assessmentName}`);
      return;
    }

    assignedUsers.forEach(userId => {
      const reminder: AssignmentReminder = {
        id: `${id}_${userId}`,
        assignmentId: id,
        assignmentName: assessmentName,
        frequency,
        dueDate,
        accountId: accountSubmittedFor,
        userId,
      };

      reminders.push(reminder);
    });
  });

  return reminders;
}

/**
 * Email template generator for assignment reminders
 */
export function generateReminderEmailTemplate(
  reminder: AssignmentReminder,
  userEmail: string
): { subject: string; html: string; text: string } {
  const { assignmentName, frequency, dueDate } = reminder;
  
  let dueDateText = '';
  if (dueDate) {
    const due = new Date(dueDate);
    const today = new Date();
    const daysUntilDue = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDue > 0) {
      dueDateText = `This assignment is due in ${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'} (${due.toLocaleDateString()}).`;
    } else if (daysUntilDue === 0) {
      dueDateText = 'This assignment is due today!';
    } else {
      dueDateText = `This assignment was due ${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) === 1 ? '' : 's'} ago.`;
    }
  }

  const subject = `Reminder: ${assignmentName}`;
  
  const text = `
Dear ${userEmail},

This is a reminder about your assignment: ${assignmentName}

${dueDateText}

Frequency: ${frequency.charAt(0).toUpperCase() + frequency.slice(1)}

Please log in to the system to complete your assignment.

Best regards,
Assignment Management System
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Assignment Reminder</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb;">Assignment Reminder</h2>
        
        <p>Dear ${userEmail},</p>
        
        <p>This is a reminder about your assignment:</p>
        
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #1f2937;">${assignmentName}</h3>
            ${dueDateText ? `<p style="margin: 5px 0;"><strong>Due Date:</strong> ${dueDateText}</p>` : ''}
            <p style="margin: 5px 0;"><strong>Frequency:</strong> ${frequency.charAt(0).toUpperCase() + frequency.slice(1)}</p>
        </div>
        
        <p>Please log in to the system to complete your assignment.</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">
                Best regards,<br>
                Assignment Management System
            </p>
        </div>
    </div>
</body>
</html>
  `.trim();

  return { subject, html, text };
}

/**
 * Utility function to format frequency for display
 */
export function formatFrequency(frequency: string): string {
  const frequencyMap: Record<string, string> = {
    onetime: 'One-time',
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    annually: 'Annually',
  };

  return frequencyMap[frequency] || frequency;
}

/**
 * Gets the next reminder date for an assignment
 */
export function getNextReminderDate(
  frequency: string,
  dueDate: string,
  lastReminded?: Date
): Date | null {
  const schedule = REMINDER_SCHEDULES[frequency];
  if (!schedule) return null;

  const due = new Date(dueDate);
  const today = new Date();

  if (frequency === 'onetime') {
    const reminderDates = calculateReminderDates(frequency, dueDate);
    return reminderDates.find(date => date > today && (!lastReminded || date > lastReminded)) || null;
  }

  // For recurring assignments
  if (schedule.recurringInterval) {
    const nextReminder = lastReminded ? new Date(lastReminded) : new Date();
    nextReminder.setDate(nextReminder.getDate() + schedule.recurringInterval);
    return nextReminder;
  }

  return null;
}
