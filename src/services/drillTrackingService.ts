// src/services/drillTrackingService.ts
'use client';

import { auth } from '@/lib/firebase';
import type { User } from 'firebase/auth';
import type { 
  DrillEvent, 
  DrillSubmission, 
  CheckIn, 
  EvaluationTemplate,
  PerformanceMetrics,
  MediaAttachment,
  Comment,
  RecurrenceRule
} from '@/types/Drill';

// Define a base URL for your drill tracking Cloud Functions
const DRILL_TRACKING_BASE_URL = 'https://us-central1-webmvp-5b733.cloudfunctions.net/drilltracking';

// Payload for creating a new drill event
export interface CreateDrillEventPayload {
  title: string;
  description?: string;
  accountId: string;
  hazardType: string;
  startDate: string; // ISO string
  endDate: string; // ISO string
  recurrenceRule?: RecurrenceRule;
  requiredCompletions?: number;
  assignedToSites?: string[];
  assignedToUsers?: string[];
  notificationSettings?: {
    onCreation: boolean;
    oneWeekBefore: boolean;
    oneDayBefore: boolean;
    oneHourBefore: boolean;
    methods: ('email' | 'in-app' | 'sms')[];
  };
}

// Payload for submitting a drill completion
export interface SubmitDrillCompletionPayload {
  drillEventId: string;
  accountId: string;
  siteId?: string;
  siteName?: string;
  checkIns: CheckIn[];
  performanceMetrics: PerformanceMetrics;
  evaluationResponses: Record<string, boolean | string | number | string[]>;
  summaryNotes?: string;
  strengths?: string;
  weaknesses?: string;
  recommendations?: string;
  mediaAttachments: MediaAttachment[];
}

// Payload for creating evaluation template
export interface CreateEvaluationTemplatePayload {
  title: string;
  description?: string;
  hazardType?: string;
  accountId: string;
  items: Array<{
    type: 'yes-no' | 'rating' | 'free-text' | 'multiple-choice';
    prompt: string;
    options?: string[];
    required: boolean;
    order: number;
  }>;
}

// --- Helper to get ID Token (consistent with other services) ---
async function getIdToken(): Promise<string | null> {
  const currentUser: User | null = auth.currentUser;
  
  if (currentUser) {
    try {
      const token = await currentUser.getIdToken(true); // Force refresh
      return token;
    } catch (error) {
      console.error("Error getting ID token for drillTrackingService:", error);
      throw new Error("Could not get Firebase ID token.");
    }
  }
  throw new Error("User not authenticated.");
}

// --- Generic Fetch Wrapper (consistent with other services) ---
async function authedFetch<T>(
  fullUrl: string,
  options: RequestInit = {},
  accountForHeader?: string
): Promise<T> {
  const token = await getIdToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  } else {
    console.warn(`[CRITICAL] authedFetch (drillTrackingService): No Authorization token for ${fullUrl}.`);
  }

  const trimmedAccount = accountForHeader?.trim();
  if (trimmedAccount) {
    headers.set('account', trimmedAccount);
  } else {
     console.warn(`[CRITICAL] authedFetch (drillTrackingService): 'account' header NOT SET for ${fullUrl}.`);
  }

  if (!(options.body instanceof FormData) && !headers.has('Content-Type') && options.method && !['GET', 'HEAD'].includes(options.method.toUpperCase())) {
    headers.set('Content-Type', 'application/json');
  }

  let response;
  try {
    response = await fetch(fullUrl, { ...options, headers });
  } catch (networkError: unknown) {
    console.error(`Network error for ${fullUrl} (drillTrackingService):`, networkError);
    const errorMessage = networkError instanceof Error ? networkError.message : 'Failed to fetch';
    throw new Error(`Network Error: Could not connect to ${fullUrl}. (${errorMessage}).`);
  }

  if (!response.ok) {
    let errorData;
    let errorText = await response.text();
    try {
      errorData = JSON.parse(errorText);
    } catch {
      errorData = { message: errorText || response.statusText || `HTTP error ${response.status}` };
    }
    console.error(`API Error ${response.status} for ${fullUrl} (drillTrackingService):`, errorData);
    throw new Error(`API Error: ${response.status} ${errorData?.message || errorText || response.statusText}`);
  }
  
  const contentType = response.headers.get("content-type");
  if (response.status === 204) { return undefined as unknown as T; }
  
  const textResponse = await response.text();
  if (contentType && contentType.includes("application/json")) { 
    try {
      return JSON.parse(textResponse) as T; 
    } catch {
      console.warn(`Failed to parse non-JSON response as JSON for ${fullUrl}.`);
      throw new Error(`Malformed JSON response from ${fullUrl}.`);
    }
  }
  
  if (textResponse) {
    return textResponse as unknown as T;
  }
  
  return undefined as unknown as T;
}

// === DRILL EVENTS ===

/**
 * Creates a new Drill Event
 */
export async function createDrillEvent(payload: Omit<CreateDrillEventPayload, 'accountId'>, accountName: string): Promise<DrillEvent> {
  if (!accountName || accountName.trim() === "") {
    throw new Error("Account name is required for createDrillEvent.");
  }

  const fullPayload: CreateDrillEventPayload = {
    ...payload,
    accountId: accountName,
  };

  return authedFetch<DrillEvent>(`${DRILL_TRACKING_BASE_URL}/events`, {
    method: 'POST',
    body: JSON.stringify(fullPayload),
  }, accountName);
}

/**
 * Fetches upcoming Drill Events for a given account
 */
export async function getUpcomingDrills(accountId: string): Promise<DrillEvent[]> {
  if (!accountId || accountId.trim() === "") {
    throw new Error("Account ID is required for getUpcomingDrills.");
  }

  return authedFetch<DrillEvent[]>(`${DRILL_TRACKING_BASE_URL}/events/upcoming`, {
    method: 'GET',
  }, accountId);
}

/**
 * Fetches all Drill Events for a given account
 */
export async function getAllDrillEvents(accountId: string): Promise<DrillEvent[]> {
  if (!accountId || accountId.trim() === "") {
    throw new Error("Account ID is required for getAllDrillEvents.");
  }

  return authedFetch<DrillEvent[]>(`${DRILL_TRACKING_BASE_URL}/events`, {
    method: 'GET',
  }, accountId);
}

/**
 * Fetches a specific Drill Event by ID
 */
export async function getDrillEventById(eventId: string, accountId: string): Promise<DrillEvent | null> {
  if (!accountId || accountId.trim() === "") {
    throw new Error("Account ID is required for getDrillEventById.");
  }

  return authedFetch<DrillEvent | null>(`${DRILL_TRACKING_BASE_URL}/events/${eventId}`, {
    method: 'GET',
  }, accountId);
}

/**
 * Updates a Drill Event
 */
export async function updateDrillEvent(eventId: string, payload: Partial<CreateDrillEventPayload>, accountId: string): Promise<DrillEvent> {
  if (!accountId || accountId.trim() === "") {
    throw new Error("Account ID is required for updateDrillEvent.");
  }

  return authedFetch<DrillEvent>(`${DRILL_TRACKING_BASE_URL}/events/${eventId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }, accountId);
}

/**
 * Deletes a Drill Event
 */
export async function deleteDrillEvent(eventId: string, accountId: string): Promise<void> {
  if (!accountId || accountId.trim() === "") {
    throw new Error("Account ID is required for deleteDrillEvent.");
  }

  return authedFetch<void>(`${DRILL_TRACKING_BASE_URL}/events/${eventId}`, {
    method: 'DELETE',
  }, accountId);
}

// === DRILL SUBMISSIONS ===

/**
 * Submits a drill completion
 */
export async function submitDrillCompletion(payload: Omit<SubmitDrillCompletionPayload, 'accountId'>, accountId: string): Promise<DrillSubmission> {
  if (!accountId || accountId.trim() === "") {
    throw new Error("Account ID is required for submitDrillCompletion.");
  }

  const fullPayload: SubmitDrillCompletionPayload = {
    ...payload,
    accountId,
  };

  return authedFetch<DrillSubmission>(`${DRILL_TRACKING_BASE_URL}/submissions`, {
    method: 'POST',
    body: JSON.stringify(fullPayload),
  }, accountId);
}

/**
 * Fetches drill submissions for a specific event
 */
export async function getDrillSubmissionsForEvent(eventId: string, accountId: string): Promise<DrillSubmission[]> {
  if (!accountId || accountId.trim() === "") {
    throw new Error("Account ID is required for getDrillSubmissionsForEvent.");
  }

  return authedFetch<DrillSubmission[]>(`${DRILL_TRACKING_BASE_URL}/submissions/event/${eventId}`, {
    method: 'GET',
  }, accountId);
}

/**
 * Fetches all drill submissions for an account
 */
export async function getAllDrillSubmissions(accountId: string): Promise<DrillSubmission[]> {
  if (!accountId || accountId.trim() === "") {
    throw new Error("Account ID is required for getAllDrillSubmissions.");
  }

  return authedFetch<DrillSubmission[]>(`${DRILL_TRACKING_BASE_URL}/submissions`, {
    method: 'GET',
  }, accountId);
}

/**
 * Fetches a specific drill submission by ID
 */
export async function getDrillSubmissionById(submissionId: string, accountId: string): Promise<DrillSubmission | null> {
  if (!accountId || accountId.trim() === "") {
    throw new Error("Account ID is required for getDrillSubmissionById.");
  }

  return authedFetch<DrillSubmission | null>(`${DRILL_TRACKING_BASE_URL}/submissions/${submissionId}`, {
    method: 'GET',
  }, accountId);
}

/**
 * Updates a drill submission (for draft submissions)
 */
export async function updateDrillSubmission(submissionId: string, payload: Partial<SubmitDrillCompletionPayload>, accountId: string): Promise<DrillSubmission> {
  if (!accountId || accountId.trim() === "") {
    throw new Error("Account ID is required for updateDrillSubmission.");
  }

  return authedFetch<DrillSubmission>(`${DRILL_TRACKING_BASE_URL}/submissions/${submissionId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }, accountId);
}

/**
 * Reviews and approves/rejects a drill submission
 */
export async function reviewDrillSubmission(
  submissionId: string, 
  status: 'approved' | 'rejected' | 'needs-revision',
  reviewNotes?: string,
  accountId?: string
): Promise<DrillSubmission> {
  if (!accountId || accountId.trim() === "") {
    throw new Error("Account ID is required for reviewDrillSubmission.");
  }

  return authedFetch<DrillSubmission>(`${DRILL_TRACKING_BASE_URL}/submissions/${submissionId}/review`, {
    method: 'POST',
    body: JSON.stringify({ status, reviewNotes }),
  }, accountId);
}

// === EVALUATION TEMPLATES ===

/**
 * Creates an evaluation template
 */
export async function createEvaluationTemplate(payload: Omit<CreateEvaluationTemplatePayload, 'accountId'>, accountId: string): Promise<EvaluationTemplate> {
  if (!accountId || accountId.trim() === "") {
    throw new Error("Account ID is required for createEvaluationTemplate.");
  }

  const fullPayload: CreateEvaluationTemplatePayload = {
    ...payload,
    accountId,
  };

  return authedFetch<EvaluationTemplate>(`${DRILL_TRACKING_BASE_URL}/evaluation-templates`, {
    method: 'POST',
    body: JSON.stringify(fullPayload),
  }, accountId);
}

/**
 * Fetches evaluation templates for an account
 */
export async function getEvaluationTemplates(accountId: string): Promise<EvaluationTemplate[]> {
  if (!accountId || accountId.trim() === "") {
    throw new Error("Account ID is required for getEvaluationTemplates.");
  }

  return authedFetch<EvaluationTemplate[]>(`${DRILL_TRACKING_BASE_URL}/evaluation-templates`, {
    method: 'GET',
  }, accountId);
}

/**
 * Fetches evaluation templates for a specific hazard type
 */
export async function getEvaluationTemplatesByHazardType(hazardType: string, accountId: string): Promise<EvaluationTemplate[]> {
  if (!accountId || accountId.trim() === "") {
    throw new Error("Account ID is required for getEvaluationTemplatesByHazardType.");
  }

  return authedFetch<EvaluationTemplate[]>(`${DRILL_TRACKING_BASE_URL}/evaluation-templates/hazard/${hazardType}`, {
    method: 'GET',
  }, accountId);
}

// === CHECK-INS ===

/**
 * Records a check-in for a drill
 */
export async function recordCheckIn(
  submissionId: string,
  checkIn: Omit<CheckIn, 'id'>,
  accountId: string
): Promise<CheckIn> {
  if (!accountId || accountId.trim() === "") {
    throw new Error("Account ID is required for recordCheckIn.");
  }

  return authedFetch<CheckIn>(`${DRILL_TRACKING_BASE_URL}/submissions/${submissionId}/check-ins`, {
    method: 'POST',
    body: JSON.stringify(checkIn),
  }, accountId);
}

/**
 * Fetches check-ins for a drill submission
 */
export async function getCheckInsForSubmission(submissionId: string, accountId: string): Promise<CheckIn[]> {
  if (!accountId || accountId.trim() === "") {
    throw new Error("Account ID is required for getCheckInsForSubmission.");
  }

  return authedFetch<CheckIn[]>(`${DRILL_TRACKING_BASE_URL}/submissions/${submissionId}/check-ins`, {
    method: 'GET',
  }, accountId);
}

// === COMMENTS ===

/**
 * Adds a comment to a drill submission
 */
export async function addComment(
  submissionId: string,
  comment: Omit<Comment, 'id' | 'timestamp'>,
  accountId: string
): Promise<Comment> {
  if (!accountId || accountId.trim() === "") {
    throw new Error("Account ID is required for addComment.");
  }

  return authedFetch<Comment>(`${DRILL_TRACKING_BASE_URL}/submissions/${submissionId}/comments`, {
    method: 'POST',
    body: JSON.stringify(comment),
  }, accountId);
}

/**
 * Fetches comments for a drill submission
 */
export async function getCommentsForSubmission(submissionId: string, accountId: string): Promise<Comment[]> {
  if (!accountId || accountId.trim() === "") {
    throw new Error("Account ID is required for getCommentsForSubmission.");
  }

  return authedFetch<Comment[]>(`${DRILL_TRACKING_BASE_URL}/submissions/${submissionId}/comments`, {
    method: 'GET',
  }, accountId);
}

// === MEDIA UPLOADS ===

/**
 * Uploads media for a drill submission
 */
export async function uploadDrillMedia(
  submissionId: string,
  file: File,
  description?: string,
  accountId?: string
): Promise<MediaAttachment> {
  if (!accountId || accountId.trim() === "") {
    throw new Error("Account ID is required for uploadDrillMedia.");
  }

  const formData = new FormData();
  formData.append('file', file);
  if (description) {
    formData.append('description', description);
  }

  return authedFetch<MediaAttachment>(`${DRILL_TRACKING_BASE_URL}/submissions/${submissionId}/media`, {
    method: 'POST',
    body: formData,
  }, accountId);
}

/**
 * Deletes media from a drill submission
 */
export async function deleteDrillMedia(
  submissionId: string,
  mediaId: string,
  accountId: string
): Promise<void> {
  if (!accountId || accountId.trim() === "") {
    throw new Error("Account ID is required for deleteDrillMedia.");
  }

  return authedFetch<void>(`${DRILL_TRACKING_BASE_URL}/submissions/${submissionId}/media/${mediaId}`, {
    method: 'DELETE',
  }, accountId);
}

// === REPORTING ===

/**
 * Generates drill compliance report
 */
export async function generateComplianceReport(
  startDate: string,
  endDate: string,
  accountId: string,
  siteIds?: string[]
): Promise<any> {
  if (!accountId || accountId.trim() === "") {
    throw new Error("Account ID is required for generateComplianceReport.");
  }

  const params = new URLSearchParams({
    startDate,
    endDate,
    ...(siteIds && { siteIds: siteIds.join(',') })
  });

  return authedFetch<any>(`${DRILL_TRACKING_BASE_URL}/reports/compliance?${params}`, {
    method: 'GET',
  }, accountId);
}

/**
 * Generates drill performance report
 */
export async function generatePerformanceReport(
  startDate: string,
  endDate: string,
  accountId: string,
  drillTypes?: string[]
): Promise<any> {
  if (!accountId || accountId.trim() === "") {
    throw new Error("Account ID is required for generatePerformanceReport.");
  }

  const params = new URLSearchParams({
    startDate,
    endDate,
    ...(drillTypes && { drillTypes: drillTypes.join(',') })
  });

  return authedFetch<any>(`${DRILL_TRACKING_BASE_URL}/reports/performance?${params}`, {
    method: 'GET',
  }, accountId);
}

// === CALENDAR INTEGRATION ===

/**
 * Syncs drill events with Google Calendar
 */
export async function syncWithGoogleCalendar(eventId: string, accountId: string): Promise<{ googleCalId: string }> {
  if (!accountId || accountId.trim() === "") {
    throw new Error("Account ID is required for syncWithGoogleCalendar.");
  }

  return authedFetch<{ googleCalId: string }>(`${DRILL_TRACKING_BASE_URL}/events/${eventId}/calendar/google`, {
    method: 'POST',
  }, accountId);
}

/**
 * Syncs drill events with Microsoft Outlook
 */
export async function syncWithOutlook(eventId: string, accountId: string): Promise<{ outlookCalId: string }> {
  if (!accountId || accountId.trim() === "") {
    throw new Error("Account ID is required for syncWithOutlook.");
  }

  return authedFetch<{ outlookCalId: string }>(`${DRILL_TRACKING_BASE_URL}/events/${eventId}/calendar/outlook`, {
    method: 'POST',
  }, accountId);
}

// Legacy function for backward compatibility - removed duplicate