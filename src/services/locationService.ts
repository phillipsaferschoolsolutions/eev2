
// src/services/locationService.ts
'use client';

import { auth } from '@/lib/firebase';
import type { User } from 'firebase/auth';
import type { Location } from '@/types/Location';

const LOCATIONS_BASE_URL = 'https://us-central1-webmvp-5b733.cloudfunctions.net/locations';

// --- Helper to get ID Token (copied from assignmentFunctionsService) ---
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

// --- Generic Fetch Wrapper (copied from assignmentFunctionsService) ---
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
    console.warn(`authedFetch: No token available for endpoint: ${fullUrl}`);
  }

  const trimmedAccountName = accountName?.trim();
  if (trimmedAccountName) {
    headers.set('account', trimmedAccountName);
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
    console.error(`Network error for ${fullUrl}:`, networkError);
    let errorMessage = `Network Error: Could not connect to the server (${networkError.message || 'Failed to fetch'}). `;
    errorMessage += `Please check your internet connection. If the issue persists, it might be a CORS configuration problem on the server or the server endpoint (${fullUrl}) might be down or incorrect.`;
    throw new Error(errorMessage);
  }

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      errorData = { message: response.statusText || `HTTP error ${response.status}` };
    }
    console.error(`API Error ${response.status} for ${fullUrl}:`, errorData);
    throw new Error(
      `API Error: ${response.status} ${errorData?.message || response.statusText}`
    );
  }

  const contentType = response.headers.get("content-type");
  if (response.status === 204) { // No Content
    return undefined as any as T;
  }

  if (contentType && contentType.indexOf("application/json") !== -1) {
    return response.json() as Promise<T>;
  } else {
    const textResponse = await response.text();
    if (textResponse) {
      try {
         // Attempt to parse if it looks like JSON, even if content-type is not set
        if ((textResponse.startsWith('{') && textResponse.endsWith('}')) || (textResponse.startsWith('[') && textResponse.endsWith(']'))) {
          return JSON.parse(textResponse) as T;
        }
      } catch (e) {
         console.error(`authedFetch: Failed to parse non-JSON text response from ${fullUrl} as JSON despite structure match. Error: ${e}`);
      }
      // If not parseable as JSON or not structured like JSON, return as text
      return textResponse as any as T;
    }
    // If response is empty and not 204, this might be an issue or intended.
    return undefined as any as T;
  }
}

/**
 * Fetches all locations for the authorized account (lookup version).
 * Uses GET /lookup endpoint.
 * Account name is passed in the 'account' header.
 */
export async function getLocationsForLookup(accountName: string): Promise<Location[]> {
  const trimmedAccountName = accountName?.trim();
  if (!trimmedAccountName) {
     throw new Error('Account name is required and cannot be empty to fetch locations.');
  }
  // Assuming the /lookup endpoint is at the root of LOCATIONS_BASE_URL
  const result = await authedFetch<Location[] | undefined>(`${LOCATIONS_BASE_URL}/lookup`, {}, trimmedAccountName);
  return result || []; // Return empty array if undefined
}

// Add other location service functions here as needed, for example:
// export async function getLocationById(id: string, accountName: string): Promise<Location | null> { ... }
// export async function createOrUpdateLocation(locationData: Partial<Location>, accountName: string): Promise<Location> { ... }
