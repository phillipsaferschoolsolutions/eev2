
// src/services/adminActionsService.ts
'use client';

import { auth } from '@/lib/firebase';
import type { User } from 'firebase/auth';
import type { District } from '@/types/Admin';

// IMPORTANT: Replace this with the actual base URL for your admin actions Cloud Functions
const ADMIN_ACTIONS_BASE_URL = 'https://us-central1-webmvp-5b733.cloudfunctions.net/adminActions';

// --- Helper to get ID Token ---
async function getIdToken(): Promise<string | null> {
  const currentUser: User | null = auth.currentUser;
  if (currentUser) {
    try {
      return await currentUser.getIdToken(true); // Force refresh
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
  options: RequestInit = {},
  currentAccountName?: string // For passing the 'account' header if needed by specific admin endpoints
): Promise<T> {
  const token = await getIdToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  } else {
    console.warn(`authedFetch (adminActions): No token available for endpoint: ${fullUrl}`);
    // Depending on backend, some admin actions might not require a token if they are public,
    // but switching accounts certainly would.
  }

  // If the specific admin action needs the current account context in a header
  const trimmedAccountName = currentAccountName?.trim();
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
  
  const textResponse = await response.text();
  if (contentType && contentType.indexOf("application/json") !== -1) {
     try {
        return JSON.parse(textResponse) as T;
     } catch (e) {
        console.error(`authedFetch (adminActions): Failed to parse JSON for ${fullUrl}. Error: ${e}. Response text: ${textResponse}`);
        throw new Error(`API Error: Malformed JSON response from ${fullUrl}.`);
     }
  } else {
    if (textResponse) {
      // Attempt to parse if it looks like JSON, even if content-type is wrong
      if ((textResponse.startsWith('{') && textResponse.endsWith('}')) || (textResponse.startsWith('[') && textResponse.endsWith(']'))) {
        try {
          return JSON.parse(textResponse) as T;
        } catch (e) {
          // Not JSON, return as text
        }
      }
      return textResponse as any as T; // Return as text if not JSON
    }
    return undefined as any as T; // Empty response
  }
}

/**
 * Fetches the list of districts/accounts available for a superAdmin.
 */
export async function getDistrictsForSuperAdmin(): Promise<District[]> {
  // This endpoint might or might not need the 'account' header depending on backend logic.
  // Assuming for now it only needs Authorization.
  const result = await authedFetch<District[] | undefined>(`${ADMIN_ACTIONS_BASE_URL}/districts`);
  return result || [];
}

interface SwitchAccountPayload {
  account: string; // The name of the new account/district to switch to
}

interface SwitchAccountResponse {
  message: string;
  // Potentially new user profile data or just a success status
  updatedProfile?: Partial<UserProfile>; 
}

/**
 * Sends a request to the backend to switch the user's active account.
 * @param newAccountName The name of the district/account to switch to.
 * @param currentAccountName The user's current account (might be needed by backend for context or logging)
 */
export async function switchUserAccount(newAccountName: string, currentAccountName?: string): Promise<SwitchAccountResponse> {
  if (!newAccountName) {
    throw new Error('New account name is required to switch accounts.');
  }
  const payload: SwitchAccountPayload = { account: newAccountName };
  // The endpoint for switching account context is assumed to be '/switchAccount'
  // The 'currentAccountName' is passed to authedFetch to be included in headers if the backend needs it.
  return authedFetch<SwitchAccountResponse>(`${ADMIN_ACTIONS_BASE_URL}/switchAccount`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }, currentAccountName);
}
