
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
    return undefined as any as T;
  }
  
  const textResponse = await response.text();
  try {
    return JSON.parse(textResponse);
  } catch (e) {
    return textResponse as any as T; // Fallback for non-JSON responses
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

    