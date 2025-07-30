// src/services/analysisService.ts
'use client';

import { auth } from '@/lib/firebase';
import type { User } from 'firebase/auth';
import type {
  WidgetSandboxData,
  RawResponse,
  RawResponsesPayload,
  AggregatedCompletionsPayload,
  AggregatedCompletionsResponse,
  SchoolsWithQuestionsResponse,
  SavedReportMetadata,
  TrendsResponse,
  CompletedAssignmentSummary, // Assuming you have a type for completed assignment summaries
} from '@/types/Analysis';

const ANALYSIS_BASE_URL = 'https://us-central1-webmvp-5b733.cloudfunctions.net/analysisv2';
const ANALYSIS_V2_BASE_URL = 'https://us-central1-webmvp-5b733.cloudfunctions.net/analysisv2';
const REPORT_STUDIO_BASE_URL = 'https://us-central1-webmvp-5b733.cloudfunctions.net/reportstudio';
const WIDGETS_BASE_URL = 'https://us-central1-webmvp-5b733.cloudfunctions.net/widgets'; // Corrected base URL for widgets

// --- Helper to get ID Token ---
async function getIdToken(): Promise<string | null> {
  const currentUser: User | null = auth.currentUser;
  if (currentUser) {
    try {
      return await currentUser.getIdToken(); // Let Firebase manage token caching
    } catch (error) {
      console.error("Error getting ID token for analysisService:", error);
      throw new Error("Could not get Firebase ID token.");
    }
  }
  throw new Error("User not authenticated.");
}

// --- Generic Fetch Wrapper for Analysis Service ---
async function authedFetch<T>(
  fullUrl: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getIdToken(); // Assumes getIdToken() is also present in the file
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  } else {
    console.warn(`[CRITICAL] authedFetch: No Authorization token available for endpoint: ${fullUrl}.`);
  }

  // Automatically get accountName from localStorage
  const accountName = localStorage.getItem('accountName');
  if (accountName) {
    headers.set('account', accountName);
  } else {
    // Only warn if it's not a call to the auth endpoint itself
    if (!fullUrl.includes('/auth')) {
        console.warn(`[CRITICAL] authedFetch: 'account' header not found in localStorage for URL: ${fullUrl}.`);
    }
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
    return undefined as T;
  }
  
  const textResponse = await response.text();
  try {
    return JSON.parse(textResponse);
  } catch {
    return textResponse as unknown as T; // Fallback for non-JSON responses
  }
}

/**
 * Fetches dashboard widget data (user activity or account completions).
 * Uses GET /sandbox from WIDGETS_BASE_URL
 */
export async function getDashboardWidgetsSandbox(accountName: string): Promise<WidgetSandboxData | null> {
  if (!accountName || accountName.trim() === "") {
    throw new Error("Account name is required for getDashboardWidgetsSandbox.");
  }
  // Ensure this uses the WIDGETS_BASE_URL and the /sandbox path
  const result = await authedFetch<WidgetSandboxData | undefined>(`${WIDGETS_BASE_URL}/sandbox`);
  return result || null;
}

/**
 * Fetches raw completion responses for a specific assignment, potentially with filters.
 * Uses POST /rawresponses/:assignmentId from ANALYSIS_BASE_URL
 */
export async function getRawResponses(
  assignmentId: string,
  filters: RawResponsesPayload['filters'],
  accountName: string
): Promise<RawResponse[]> {
  if (!accountName || accountName.trim() === "") {
    throw new Error("Account name is required for getRawResponses.");
  }
  if (!assignmentId) {
    throw new Error("Assignment ID is required for getRawResponses.");
  }
  const payload: Partial<RawResponsesPayload> = { filters };
  const encodedAssignmentId = encodeURIComponent(assignmentId);
  const result = await authedFetch<RawResponse[] | undefined>(
    `${ANALYSIS_BASE_URL}/rawresponses/${encodedAssignmentId}`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
  return result || [];
}

/**
 * Fetches the last few completed assignments using a Collection Group Query.
 * Calls the new Firebase Cloud Function 'getCompletedAssignments'.
 */
export async function getLastCompletions(
  accountName: string,
  accountId?: string, // Use optional accountId as per the new function
  assignmentId?: string, // Optional assignmentId for filtering
  timePeriod?: string // Optional timePeriod for filtering
): Promise<CompletedAssignmentSummary[] | null> { // Return array of summaries
  if (!accountName || accountName.trim() === "") {
    throw new Error("Account name is required for getLastCompletions.");
  }

  const queryParams = new URLSearchParams();
  if (accountId) queryParams.append('accountId', accountId);
  if (assignmentId) queryParams.append('assignmentId', assignmentId);
  if (timePeriod) queryParams.append('timePeriod', timePeriod);

  const url = `${WIDGETS_BASE_URL}/completed-assignments?${queryParams.toString()}`;

  console.log("Calling getCompletedAssignments API at:", url);
  try {
    const result = await authedFetch<CompletedAssignmentSummary[] | undefined>(url, {
      method: 'GET',
    });
    console.log("Completed Assignments API response:", result);
    return result || null;
  } catch (error: unknown) {
    console.error("Error in getLastCompletions:", error);
    return null;
  }
}
 


/**
 * Fetches response tallies by question for each school in an assignment.
 * Uses GET /schoolswithquestions/:assignmentId/:period from ANALYSIS_V2_BASE_URL
 */
export async function getCommonResponsesForAssignment(
  assignmentId: string,
  period: string,
  accountName: string
): Promise<SchoolsWithQuestionsResponse | null> {
  if (!accountName || accountName.trim() === "") {
    throw new Error("Account name is required for getCommonResponsesForAssignment.");
  }
  if (!assignmentId || !period) {
    throw new Error("Assignment ID and period are required for getCommonResponsesForAssignment.");
  }
  const encodedAssignmentId = encodeURIComponent(assignmentId);
  const result = await authedFetch<SchoolsWithQuestionsResponse | undefined>(
    `${ANALYSIS_V2_BASE_URL}/schoolswithquestions/${encodedAssignmentId}/${period}`
  );
  return result || null;
}

/**
 * Fetches aggregated completion data for pivot table and visualization.
 * Uses POST /aggregated-completions from REPORT_STUDIO_BASE_URL
 */
export async function getAggregatedCompletions(
  payload: AggregatedCompletionsPayload,
  accountName: string
): Promise<AggregatedCompletionsResponse | null> {
  if (!accountName || accountName.trim() === "") {
    throw new Error("Account name is required for getAggregatedCompletions.");
  }
  
  const result = await authedFetch<AggregatedCompletionsResponse | undefined>(
    `${REPORT_STUDIO_BASE_URL}/aggregated-completions`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
  
  return result || null;
}

/**
 * Fetches a list of previously generated/saved reports for the current account.
 * Uses GET /reporting from ANALYSIS_BASE_URL
 */
export async function getSavedReports(accountName: string): Promise<SavedReportMetadata[]> {
  if (!accountName || accountName.trim() === "") {
    throw new Error("Account name is required for getSavedReports.");
  }
  const result = await authedFetch<SavedReportMetadata[] | undefined>(
    `${ANALYSIS_BASE_URL}/reporting`
  );
  return result || [];
}

/**
 * Fetches widget trends data (week, month, year completions, streak).
 * Uses GET /trends from WIDGETS_BASE_URL
 */
export async function getWidgetTrends(accountName: string): Promise<TrendsResponse | null> {
  if (!accountName || accountName.trim() === "") {
    throw new Error("Account name is required for getWidgetTrends.");
  }
  // Corrected to use WIDGETS_BASE_URL and /trends path
  const result = await authedFetch<TrendsResponse | undefined>(`${WIDGETS_BASE_URL}/trends`);
  return result || null;
}

    
