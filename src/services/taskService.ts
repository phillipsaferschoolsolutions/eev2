// src/services/taskService.ts
'use client';

import { auth } from '@/lib/firebase';
import type { User } from 'firebase/auth';
import type { Task } from '@/types/Task';

export interface IssueType {
  id: string;
  name: string;
  description?: string;
  accountId: string;
  createdAt?: any;
  updatedAt?: any;
}

const TASKS_BASE_URL = 'https://us-central1-webmvp-5b733.cloudfunctions.net/task';

// --- Helper to get ID Token ---
async function getIdToken(): Promise<string | null> {
  const currentUser: User | null = auth.currentUser;
  if (currentUser) {
    try {
      return await currentUser.getIdToken();
    } catch (error) {
      console.error("Error getting ID token:", error);
      return null;
    }
  }
  return null;
}

// --- Generic Fetch Wrapper ---
async function authedFetch<T>(
  fullUrl: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getIdToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  } else {
    console.warn(`[CRITICAL] authedFetch (taskService): No Authorization token available for endpoint: ${fullUrl}.`);
  }

  // Automatically get accountName from localStorage
  const accountName = localStorage.getItem('accountName');
  if (accountName) {
    headers.set('account', accountName);
  } else {
    console.warn(`[CRITICAL] authedFetch (taskService): 'account' header not found in localStorage for URL: ${fullUrl}.`);
  }

  if (!(options.body instanceof FormData) && !headers.has('Content-Type') && options.method && !['GET', 'HEAD'].includes(options.method.toUpperCase())) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(fullUrl, { ...options, headers });

  if (!response.ok) {
    const errorData = await response.text();
    console.error(`API Error ${response.status} for ${fullUrl}:`, errorData);
    throw new Error(`API Error: ${response.status} ${errorData || response.statusText}`);
  }

  if (response.status === 204) {
    return undefined as any as T;
  }
  
  const textResponse = await response.text();
  try {
    return JSON.parse(textResponse);
  } catch (e) {
    return textResponse as any as T;
  }
}

/**
 * Gets tasks created by and assigned to the current user
 * @param taskType The type/status of tasks to fetch (e.g., "Open", "Closed")
 * @returns Promise that resolves to tasks and counts
 */
export async function getMyTasks(taskType: string = "Open"): Promise<{ tasks: Task[], counts: Record<string, number> }> {
  const taskTypeArray = ["Open", "Closed", "In Progress", "Blocked"];
  
  const result = await authedFetch<{ tasks: Task[], counts: Record<string, number> }>(`${TASKS_BASE_URL}/myTasks/${taskType}`, {
    method: 'POST',
    body: JSON.stringify({ taskTypeArray }),
  });
  
  return result;
}

/**
 * Creates a new task without form data (JSON payload)
 * @param taskData The task data to create
 * @returns Promise that resolves to the created task
 */
export async function createTask(taskData: Partial<Task>): Promise<{ id: string; createdTime: any }> {
  const result = await authedFetch<{ id: string; createdTime: any }>(`${TASKS_BASE_URL}/addNewTaskNoForm`, {
    method: 'POST',
    body: JSON.stringify(taskData),
  });
  
  return result;
}

/**
 * Creates a new task with form data (including file upload)
 * @param formData The form data including task details and optional photo
 * @returns Promise that resolves to the created task and counts
 */
export async function createTaskWithForm(formData: FormData): Promise<{ task: Task, counts: Record<string, number> }> {
  const result = await authedFetch<{ task: Task, counts: Record<string, number> }>(`${TASKS_BASE_URL}/addNewTask`, {
    method: 'PUT',
    body: formData,
  });
  
  return result;
}

/**
 * Updates an existing task without form data
 * @param taskData The task data to update (must include id)
 * @returns Promise that resolves when update is complete
 */
export async function updateTask(taskData: Partial<Task> & { id: string }): Promise<void> {
  await authedFetch<void>(`${TASKS_BASE_URL}/updateTaskNoForm`, {
    method: 'PUT',
    body: JSON.stringify(taskData),
  });
}

/**
 * Closes one or more tasks
 * @param taskIds Single task ID or array of task IDs to close
 * @returns Promise that resolves to updated task data or array
 */
export async function closeTasks(taskIds: string | string[]): Promise<any> {
  const payload = Array.isArray(taskIds) ? taskIds : { id: taskIds };
  
  const result = await authedFetch<any>(`${TASKS_BASE_URL}/closeTask`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  
  return result;
}

/**
 * Deletes one or more tasks
 * @param taskIds Array of task IDs to delete
 * @param taskTypeArray Array of task types for count recalculation
 * @returns Promise that resolves to updated counts and deleted IDs
 */
export async function deleteTasks(taskIds: string[], taskTypeArray: string[] = ["Open", "Closed"]): Promise<{ counts: Record<string, number>, selectedArray: string[] }> {
  const result = await authedFetch<{ counts: Record<string, number>, selectedArray: string[] }>(`${TASKS_BASE_URL}/delete`, {
    method: 'POST',
    body: JSON.stringify({ selectedArray: taskIds, taskTypeArray }),
  });
  
  return result;
}

/**
 * Deletes a single task by ID
 * @param taskId The ID of the task to delete
 * @returns Promise that resolves when deletion is complete
 */
export async function deleteTask(taskId: string): Promise<void> {
  await authedFetch<void>(`${TASKS_BASE_URL}/deleteTask/${taskId}`, {
    method: 'DELETE',
  });
}

/**
 * Gets ongoing tasks widget data for dashboard
 * @returns Promise that resolves to task counts
 */
export async function getOngoingTasks(): Promise<{ overdue: number, open: number }> {
  const result = await authedFetch<{ overdue: number, open: number }>(`${TASKS_BASE_URL}/ongoingtasks`, {
    method: 'GET',
  });
  
  return result;
}

/**
 * Gets tasks created by the current user
 * @returns Promise that resolves to tasks created by user
 */
export async function getCreatedByMe(): Promise<{ tasks: Task[] }> {
  const result = await authedFetch<{ tasks: Task[] }>(`${TASKS_BASE_URL}/createdByMe`, {
    method: 'GET',
  });
  
  return result;
}

/**
 * Gets tasks assigned to the current user
 * @returns Promise that resolves to tasks assigned to user
 */
export async function getAssignedToMe(): Promise<{ tasks: Task[] }> {
  const result = await authedFetch<{ tasks: Task[] }>(`${TASKS_BASE_URL}/assignedToMe`, {
    method: 'GET',
  });
  
  return result;
}

// Placeholder functions for issue types (these would need backend endpoints)
export async function getIssueTypes(): Promise<IssueType[]> {
  // This would need a backend endpoint - for now return mock data
  return [
    { id: 'electrical', name: 'Electrical Issue', description: 'Electrical problems and repairs', accountId: '', createdAt: new Date() as any, updatedAt: new Date() as any },
    { id: 'hvac', name: 'HVAC Issue', description: 'Heating, ventilation, and air conditioning', accountId: '', createdAt: new Date() as any, updatedAt: new Date() as any },
    { id: 'plumbing', name: 'Plumbing Issue', description: 'Water and plumbing related problems', accountId: '', createdAt: new Date() as any, updatedAt: new Date() as any },
    { id: 'security', name: 'Security Issue', description: 'Security and safety concerns', accountId: '', createdAt: new Date() as any, updatedAt: new Date() as any },
    { id: 'maintenance', name: 'General Maintenance', description: 'General maintenance and repairs', accountId: '', createdAt: new Date() as any, updatedAt: new Date() as any },
  ];
}

export async function createIssueType(issueType: Omit<IssueType, 'id' | 'createdAt' | 'updatedAt'>): Promise<IssueType> {
  // This would need a backend endpoint
  throw new Error('createIssueType not implemented - needs backend endpoint');
}

export async function updateIssueType(id: string, updates: Partial<IssueType>): Promise<void> {
  // This would need a backend endpoint
  throw new Error('updateIssueType not implemented - needs backend endpoint');
}

export async function deleteIssueType(id: string): Promise<void> {
  // This would need a backend endpoint
  throw new Error('deleteIssueType not implemented - needs backend endpoint');
}