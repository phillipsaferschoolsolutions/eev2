
// src/services/drillTrackingService.ts
'use client';

import { auth } from '@/lib/firebase';
import type { User } from 'firebase/auth';
import type { DrillEvent } from '@/types/Drill'; // Assuming DrillEvent is the full type

// Define a base URL for your drill tracking Cloud Functions
// This should match how you export your Express app in functions/index.js
// For example, if you export `exports.drillTracking = functions.https.onRequest(drillTrackingApp);`
// then the base URL will be `https://us-central1-YOUR-PROJECT-ID.cloudfunctions.net/drillTracking`
const DRILL_TRACKING_BASE_URL = 'https://us-central1-webmvp-5b733.cloudfunctions.net/drillTracking';

// Payload for creating a new drill event
export interface CreateDrillEventPayload {
  name: string;
  description?: string;
  accountId: string; // This will be set by the service from userProfile
  startDate: string; // ISO string
  endDate: string; // ISO string
  requiredDrills: Array<{
    typeId: string;
    typeName: string;
    instructions?: string;
  }>;
  assignedToSites?: string[];
}

// --- Helper to get ID Token (consistent with other services) ---
async function getIdToken(): Promise<string | null> {
  const currentUser: User | null = auth.currentUser;
  if (currentUser) {
    try {
      return await currentUser.getIdToken(); // Consider force refresh: currentUser.getIdToken(true)
    } catch (error) {
      console.error("Error getting ID token for drillTrackingService:", error);
      return null;
    }
  }
  return null;
}

// --- Generic Fetch Wrapper (consistent with other services) ---
async function authedFetch<T>(
  fullUrl: string,
  options: RequestInit = {},
  accountForHeader?: string // account for header
): Promise<T> {
  const token = await getIdToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  } else {
    console.warn(`[CRITICAL] authedFetch (drillTrackingService): No Authorization token for ${fullUrl}.`);
    // Potentially throw new Error("User not authenticated for API request.");
  }

  const trimmedAccount = accountForHeader?.trim();
  if (trimmedAccount) {
    headers.set('account', trimmedAccount);
  } else {
     console.warn(`[CRITICAL] authedFetch (drillTrackingService): 'account' header NOT SET for ${fullUrl}. Ensure 'accountForHeader' parameter is passed if required.`);
  }

  if (!(options.body instanceof FormData) && !headers.has('Content-Type') && options.method && !['GET', 'HEAD'].includes(options.method.toUpperCase())) {
    headers.set('Content-Type', 'application/json');
  }

  let response;
  try {
    response = await fetch(fullUrl, { ...options, headers });
  } catch (networkError: any) {
    console.error(`Network error for ${fullUrl} (drillTrackingService):`, networkError);
    throw new Error(`Network Error: Could not connect to ${fullUrl}. (${networkError.message || 'Failed to fetch'}). Check connection and CORS.`);
  }

  if (!response.ok) {
    let errorData;
    let errorText = await response.text();
    try {
      errorData = JSON.parse(errorText);
    } catch (e) {
      errorData = { message: errorText || response.statusText || `HTTP error ${response.status}` };
    }
    console.error(`API Error ${response.status} for ${fullUrl} (drillTrackingService):`, errorData);
    throw new Error(`API Error: ${response.status} ${errorData?.message || errorText || response.statusText}`);
  }
  
  const contentType = response.headers.get("content-type");
  if (response.status === 204) { return undefined as any as T; } // No Content
  
  const textResponse = await response.text(); // Get text first
  if (contentType && contentType.includes("application/json")) { 
    try {
      return JSON.parse(textResponse) as Promise<T>; 
    } catch (e) {
      // If parsing fails but content-type was JSON, it's an issue.
      console.error(`Failed to parse JSON response for ${fullUrl} despite content-type header. Raw: ${textResponse.substring(0,100)}...`);
      throw new Error(`Malformed JSON response from ${fullUrl}.`);
    }
  }
  
  // If not JSON, but there's text, return it (handles plain text or unexpected responses)
  if (textResponse) {
    return textResponse as any as T;
  }
  
  return undefined as any as T; // Fallback for empty responses or truly no content
}

/**
 * Creates a new Drill Event by calling the backend endpoint.
 * @param payload - The data for the new drill event, excluding accountId which is taken from current user.
 * @param accountName - The account ID for associating the drill event, used for the 'account' header.
 * @returns The created DrillEvent object (or a confirmation).
 */
export async function createDrillEvent(payload: Omit<CreateDrillEventPayload, 'accountId'>, accountName: string): Promise<DrillEvent> {
  if (!accountName || accountName.trim() === "") {
    throw new Error("Account name is required for createDrillEvent client-side call.");
  }

  const fullPayload: CreateDrillEventPayload = {
    ...payload,
    accountId: accountName, // Add accountId to the payload sent to the backend
  };

  return authedFetch<DrillEvent>(`${DRILL_TRACKING_BASE_URL}/createDrillEvent`, {
    method: 'POST',
    body: JSON.stringify(fullPayload),
  }, accountName); // Pass accountName for the 'account' header
}

// Future functions:
// export async function getDrillEvents(accountId: string): Promise<DrillEvent[]> { /* ... */ }
// export async function getDrillEventById(eventId: string, accountId: string): Promise<DrillEvent | null> { /* ... */ }
// export async function updateDrillEvent(eventId: string, payload: Partial<CreateDrillEventPayload>, accountId: string): Promise<DrillEvent> { /* ... */ }
// export async function deleteDrillEvent(eventId: string, accountId: string): Promise<void> { /* ... */ }

// export async function submitDrillCompletion(payload: any, accountId: string): Promise<any> { /* ... */ }
// export async function getDrillCompletionsForEvent(eventId: string, accountId: string): Promise<any[]> { /* ... */ }

