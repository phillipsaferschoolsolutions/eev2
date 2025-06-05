// src/services/analysisService.ts
'use client';

import { auth } from '@/lib/firebase';
import type { User } from 'firebase/auth';
import type {
  WidgetSandboxData,
  RawResponse,
  RawResponsesPayload,
  SchoolsWithQuestionsResponse,
  SavedReportMetadata,
  LastCompletionsResponse,
  TrendsResponse,
  CompletedAssignmentSummary, // Assuming you have a type for completed assignment summaries
} from '@/types/Analysis';

const ANALYSIS_BASE_URL = 'https://us-central1-webmvp-5b733.cloudfunctions.net/analysisv2';
const ANALYSIS_V2_BASE_URL = 'https://us-central1-webmvp-5b733.cloudfunctions.net/analysisv2';
const WIDGETS_BASE_URL = 'https://us-central1-webmvp-5b733.cloudfunctions.net/widgets'; // Corrected base URL for widgets

// --- Helper to get ID Token ---
async function getIdToken(): Promise<string | null> {
  const currentUser: User | null = auth.currentUser;
  if (currentUser) {
    try {
      return await currentUser.getIdToken(true); // Force refresh
    } catch (error) {
      console.error("Error getting ID token for analysisService:", error);
      return null;
    }
  }
  return null;
}

// --- Generic Fetch Wrapper for Analysis Service ---
async function authedFetch<T>(
  fullUrl: string,
  options: RequestInit = {},
  accountName?: string
): Promise<T> {
  const token = await getIdToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  } else {
    console.warn(`[CRITICAL] analysisService.authedFetch: No Authorization token available for endpoint: ${fullUrl}. This will likely cause API errors.`);
  }

  const trimmedAccountName = accountName?.trim();
  if (trimmedAccountName) {
    headers.set('account', trimmedAccountName);
  } else {
     console.warn(`[CRITICAL] analysisService.authedFetch: 'account' header NOT SET for URL: ${fullUrl} because accountName parameter was: '${accountName}'. This may cause API errors if the endpoint requires an account context.`);
  }

  if (!(options.body instanceof FormData) && !headers.has('Content-Type') && options.method && !['GET', 'HEAD'].includes(options.method.toUpperCase())) {
    headers.set('Content-Type', 'application/json');
  }

  let response;
  try {
    response = await fetch(fullUrl, {
      ...options,
      headers,
    });
  } catch (networkError: any) {
    console.error(`Network error for ${fullUrl} (analysisService):`, networkError);
    let errorMessage = `Network Error: Could not connect to the server (${networkError.message || 'Failed to fetch'}). `;
    errorMessage += `Please check your internet connection. If the issue persists, it might be a CORS configuration problem on the server or the server endpoint (${fullUrl}) might be down or incorrect.`;
    throw new Error(errorMessage);
  }

  if (!response.ok) {
    let errorBodyText = await response.text().catch(() => "Could not retrieve error body.");
    let errorJson: any;
    let parsedMessage: string | null = null;

    if (errorBodyText) {
      try {
        errorJson = JSON.parse(errorBodyText);
        if (errorJson && typeof errorJson.message === 'string') {
          parsedMessage = errorJson.message;
        } else if (errorJson && typeof errorJson.error === 'string') { 
          parsedMessage = errorJson.error;
        } else if (errorJson && typeof errorJson === 'object' && Object.keys(errorJson).length > 0) {
          parsedMessage = JSON.stringify(errorJson); 
        } else if (errorJson && typeof errorJson === 'object' && Object.keys(errorJson).length === 0) {
          // If errorJson is an empty object, but errorBodyText was not, prefer errorBodyText for the message
          parsedMessage = (errorBodyText && errorBodyText !== '{}') ? errorBodyText : response.statusText || `Server responded with status ${response.status}`;
        }
      } catch (e) {
        if (errorBodyText.length > 150) { 
            parsedMessage = response.statusText || `Server responded with status ${response.status}`;
        } else {
            parsedMessage = errorBodyText || response.statusText || `Server responded with status ${response.status}`;
        }
      }
    }
    
    const finalErrorMessage = parsedMessage || response.statusText || `Server responded with status ${response.status}`;
    
    // Determine what to log as the error object
    let loggedErrorDetail = errorJson;
    if (errorJson && typeof errorJson === 'object' && Object.keys(errorJson).length === 0 && errorBodyText && errorBodyText !== '{}') {
        loggedErrorDetail = errorBodyText; 
    } else if (!errorJson && errorBodyText) {
        loggedErrorDetail = errorBodyText;
    }

    console.error(`API Error ${response.status} for ${fullUrl} (analysisService):`, loggedErrorDetail || "Empty or unparseable error response body");
    
    throw new Error(
      `API Error: ${response.status} ${finalErrorMessage} (from ${fullUrl})`
    );
  }

  const contentType = response.headers.get("content-type");
  if (response.status === 204) { // No Content
    return undefined as any as T;
  }

  const textResponse = await response.text();
  if (contentType && contentType.indexOf("application/json") !== -1) {
     try {
        return JSON.parse(textResponse) as T;
     } catch (e) {
        console.error(`analysisService.authedFetch: Failed to parse JSON for ${fullUrl}. Error: ${e}. Response text: ${textResponse}`);
        throw new Error(`API Error: Malformed JSON response from ${fullUrl}.`);
     }
  } else {
    // Attempt to parse if it looks like JSON, otherwise return as text
    if (textResponse) {
      if ((textResponse.startsWith('{') && textResponse.endsWith('}')) || (textResponse.startsWith('[') && textResponse.endsWith(']'))) {
        try {
          return JSON.parse(textResponse) as T;
        } catch (e) {
          // Not JSON, fall through
        }
      }
      return textResponse as any as T; // Return as text if not JSON or parse failed
    }
    return undefined as any as T; // Empty response
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
  const result = await authedFetch<WidgetSandboxData | undefined>(`${WIDGETS_BASE_URL}/sandbox`, {}, accountName);
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
    },
    accountName
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
    const result = await authedFetch<CompletedAssignmentSummary[] | undefined>(url, {}, accountName);
    console.log("Completed Assignments API response:", result);
    return result || null;
  } catch (error: any) {
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
    `${ANALYSIS_V2_BASE_URL}/schoolswithquestions/${encodedAssignmentId}/${period}`,
    {},
    accountName
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
    `${ANALYSIS_BASE_URL}/reporting`,
    {},
    accountName
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
  const result = await authedFetch<TrendsResponse | undefined>(`${WIDGETS_BASE_URL}/trends`, {}, accountName);
  return result || null;
}

    
