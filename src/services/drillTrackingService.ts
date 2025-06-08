
// src/services/drillTrackingService.ts
'use client';

import { auth } from '@/lib/firebase';
import type { User } from 'firebase/auth';
import type { DrillEvent } from '@/types/Drill'; // Assuming DrillEvent is the full type

// Define a base URL for your drill tracking Cloud Functions
const DRILL_TRACKING_BASE_URL = 'https://us-central1-webmvp-5b733.cloudfunctions.net/drillTracking'; // Adjust if your function group is named differently

// Payload for creating a new drill event
// This might be slightly different from the full DrillEvent type, e.g., excluding ID or timestamps managed by backend
export interface CreateDrillEventPayload {
  name: string;
  description?: string;
  accountId: string;
  startDate: string; // ISO string
  endDate: string; // ISO string
  requiredDrills: Array<{
    typeId: string;
    typeName: string;
    instructions?: string;
  }>;
  assignedToSites?: string[];
  // assignedToUsers?: string[]; // Add if you implement user assignment
  // recurrenceRule?: string; // For future
}

// --- Helper to get ID Token (consistent with other services) ---
async function getIdToken(): Promise<string | null> {
  const currentUser: User | null = auth.currentUser;
  if (currentUser) {
    try {
      return await currentUser.getIdToken();
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
  account?: string // account for header
): Promise<T> {
  const token = await getIdToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  } else {
    console.warn(`[CRITICAL] authedFetch (drillTrackingService): No Authorization token for ${fullUrl}.`);
  }

  const trimmedAccount = account?.trim();
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
  } catch (networkError: any) {
    console.error(`Network error for ${fullUrl} (drillTrackingService):`, networkError);
    throw new Error(`Network Error: Could not connect to ${fullUrl}. (${networkError.message || 'Failed to fetch'}). Check connection and CORS.`);
  }

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      errorData = { message: response.statusText || `HTTP error ${response.status}` };
    }
    console.error(`API Error ${response.status} for ${fullUrl} (drillTrackingService):`, errorData);
    throw new Error(`API Error: ${response.status} ${errorData?.message || response.statusText}`);
  }
  
  const contentType = response.headers.get("content-type");
  if (response.status === 204) { return undefined as any as T; } // No Content
  if (contentType && contentType.includes("application/json")) { return response.json() as Promise<T>; }
  
  const textResponse = await response.text();
  if (response.ok && textResponse) {
    try { return JSON.parse(textResponse) as T; }
    catch (e) { /* Not JSON, return as text */ }
    return textResponse as any as T;
  }
  return undefined as any as T; // Fallback for empty or non-parseable responses
}

/**
 * Creates a new Drill Event.
 * @param payload - The data for the new drill event.
 * @param accountName - The account ID for associating the drill event.
 * @returns The created DrillEvent object (or a confirmation).
 */
export async function createDrillEvent(payload: CreateDrillEventPayload, accountName: string): Promise<DrillEvent> { // Assuming backend returns the created event
  if (!accountName || accountName.trim() === "") {
    throw new Error("Account name is required for createDrillEvent.");
  }
  // For now, this is a placeholder. In a real scenario, you'd make a POST request.
  console.log("Attempting to create drill event with payload:", payload, "for account:", accountName);
  
  // Example of how the actual fetch might look:
  // return authedFetch<DrillEvent>(`${DRILL_TRACKING_BASE_URL}/events`, { // Assuming an '/events' endpoint
  //   method: 'POST',
  //   body: JSON.stringify(payload),
  // }, accountName);

  // Placeholder response:
  return new Promise((resolve) => {
    setTimeout(() => {
      const mockCreatedEvent: DrillEvent = {
        ...payload,
        id: `mock_event_${Date.now()}`,
        createdAt: new Date() as any, // Cast to any to bypass Timestamp type for mock
        updatedAt: new Date() as any, // Cast to any
        // accountId is already in payload
      };
      console.log("Mock drill event created:", mockCreatedEvent);
      resolve(mockCreatedEvent);
    }, 500);
  });
}

// Future functions:
// export async function getDrillEvents(accountId: string): Promise<DrillEvent[]> { /* ... */ }
// export async function getDrillEventById(eventId: string, accountId: string): Promise<DrillEvent | null> { /* ... */ }
// export async function updateDrillEvent(eventId: string, payload: Partial<CreateDrillEventPayload>, accountId: string): Promise<DrillEvent> { /* ... */ }
// export async function deleteDrillEvent(eventId: string, accountId: string): Promise<void> { /* ... */ }

// export async function submitDrillCompletion(payload: any, accountId: string): Promise<any> { /* ... */ }
// export async function getDrillCompletionsForEvent(eventId: string, accountId: string): Promise<any[]> { /* ... */ }
