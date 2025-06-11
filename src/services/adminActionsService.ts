
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

  // The 'account' header is automatically added by the authedFetch in assignmentFunctionsService.
  // We should replicate that behavior here for consistency if admin endpoints need it.
  const accountName = localStorage.getItem('accountName');
    if (accountName) {
        headers.set('account', accountName);
    } else {
        console.warn(`[CRITICAL] authedFetch (adminService): 'account' header not found in localStorage for URL: ${fullUrl}.`);
    }

  if (!(options.body instanceof FormData) && !headers.has('Content-Type') && options.method && !['GET', 'HEAD'].includes(options.method.toUpperCase())) {
    headers.set('Content-Type', 'application/json');
  }
  
  const response = await fetch(fullUrl, { ...options, headers });

  if (!response.ok) {
    const errorData = await response.text();
    console.error(`API Error ${response.status} for ${fullUrl} (adminService):`, errorData);
    throw new Error(`API Error: ${response.status} ${errorData || response.statusText}`);
  }

  if (response.status === 204) {
    return undefined as any as T;
  }

  return response.json() as Promise<T>;
  
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

    