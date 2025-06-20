
// src/services/adminActionsService.ts
'use client';

import { auth } from '@/lib/firebase';
import type { User } from 'firebase/auth';
import type { District } from '@/types/Admin';
import type { UserProfile } from '@/types/User';

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
    console.warn(`[CRITICAL] authedFetch (adminActionsService): No Authorization token available for endpoint: ${fullUrl}. This will likely cause API errors.`);
  }

  const trimmedAccountName = currentAccountName?.trim();
  if (trimmedAccountName) {
    headers.set('account', trimmedAccountName);
  } else {
    console.warn(`[CRITICAL] authedFetch (adminActionsService): 'account' header NOT SET for URL: ${fullUrl} because currentAccountName parameter was: '${currentAccountName}'. This may cause API errors if the endpoint requires an account context.`);
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
    console.error(`Network error for ${fullUrl} (adminActionsService):`, networkError);
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
    console.error(`API Error ${response.status} for ${fullUrl} (adminActionsService):`, errorData);
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
        console.error(`authedFetch (adminActionsService): Failed to parse JSON for ${fullUrl}. Error: ${e}. Response text: ${textResponse}`);
        throw new Error(`API Error: Malformed JSON response from ${fullUrl}.`);
     }
  } else {
    if (textResponse) {
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
 * @param currentAccountName The superAdmin's currently active account name, passed in the 'account' header.
 */
export async function getDistrictsForSuperAdmin(currentAccountName: string): Promise<District[]> {
  if (!currentAccountName || currentAccountName.trim() === "") {
    throw new Error("Current account name is required to fetch districts for superAdmin.");
  }
  const result = await authedFetch<District[] | undefined>(`${ADMIN_ACTIONS_BASE_URL}/districts`, {}, currentAccountName);
  return result || [];
}

interface SwitchAccountPayload {
  account: string; // This is the account NAME to switch to
}

interface SwitchAccountResponse {
  message: string;
  updatedProfile?: Partial<UserProfile>;
}

/**
 * Sends a request to the backend to switch the user's active account.
 * @param newAccountName The NAME of the district/account to switch to. This name will be sent in the payload.
 * @param currentAccountNameForHeader The user's current account (passed in the 'account' header for context/auth)
 */
export async function switchUserAccount(newAccountName: string, currentAccountNameForHeader: string): Promise<SwitchAccountResponse> {
  if (!newAccountName || newAccountName.trim() === "") {
    throw new Error('New account NAME is required to switch accounts.');
  }
  if (!currentAccountNameForHeader || currentAccountNameForHeader.trim() === "") {
    throw new Error('Current account name for request header is required for the switchUserAccount request.');
  }
  const payload: SwitchAccountPayload = { account: newAccountName };

  return authedFetch<SwitchAccountResponse>(`${ADMIN_ACTIONS_BASE_URL}/districts`, { // POST to /districts endpoint
    method: 'POST',
    body: JSON.stringify(payload),
  }, currentAccountNameForHeader);
}

    