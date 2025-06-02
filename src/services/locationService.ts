
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
    console.warn(`[CRITICAL] authedFetch (locationService): No Authorization token available for endpoint: ${fullUrl}. This will likely cause API errors.`);
  }

  const trimmedAccountName = accountName?.trim();
  if (trimmedAccountName) {
    headers.set('account', trimmedAccountName);
  } else {
    console.warn(`[CRITICAL] authedFetch (locationService): 'account' header NOT SET for URL: ${fullUrl} because accountName parameter was: '${accountName}'. This may cause API errors if the endpoint requires an account context.`);
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
    console.error(`Network error for ${fullUrl} (locationService):`, networkError);
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
    console.error(`API Error ${response.status} for ${fullUrl} (locationService):`, errorData);
    throw new Error(
      `API Error: ${response.status} ${errorData?.message || response.statusText}`
    );
  }

  const contentType = response.headers.get("content-type");
  if (response.status === 204) { // No Content
    return undefined as any as T;
  }

  const textResponse = await response.text();

  if (contentType && contentType.indexOf("application/json") !== -1) {
    try {
      const jsonData = JSON.parse(textResponse) as T;
      return jsonData;
    } catch(e) {
      console.error(`[authedFetch DEBUG (locationService)] Failed to parse JSON response from ${fullUrl} despite content-type. Error: ${e}. Raw text: ${textResponse}`);
      throw new Error(`API Error: Failed to parse JSON response from ${fullUrl}.`);
    }
  } else {
    if (textResponse) {
      try {
        if ((textResponse.startsWith('{') && textResponse.endsWith('}')) || (textResponse.startsWith('[') && textResponse.endsWith(']'))) {
          const jsonData = JSON.parse(textResponse) as T;
          return jsonData;
        }
      } catch (e) {
         console.error(`[authedFetch DEBUG (locationService)] Failed to parse non-JSON text response from ${fullUrl} as JSON despite structure match. Error: ${e}. Raw text: ${textResponse}`);
      }
      return textResponse as any as T;
    }
    return undefined as any as T;
  }
}

/**
 * Fetches all locations for the authorized account.
 * Uses GET / endpoint (root of LOCATIONS_BASE_URL).
 * Account name is passed in the 'account' header.
 */
export async function getLocationsForLookup(accountName: string): Promise<Location[]> {
  const trimmedAccountName = accountName?.trim();
  if (!trimmedAccountName) {
     throw new Error('Account name is required and cannot be empty to fetch locations.');
  }
  const result = await authedFetch<Location[] | undefined>(`${LOCATIONS_BASE_URL}/`, {}, trimmedAccountName);
  return result || [];
}

    