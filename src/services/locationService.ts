
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
      throw new Error("Could not get Firebase ID token.");
    }
  }
  throw new Error("User not authenticated.");
}

// --- Generic Fetch Wrapper (copied from assignmentFunctionsService) ---
async function authedFetch<T>(
  fullUrl: string,
  options: RequestInit = {},
  account?: string
): Promise<T> {
  const token = await getIdToken(); // Assumes getIdToken() is also present in the file
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  } else {
    console.warn(`[CRITICAL] authedFetch: No Authorization token available for endpoint: ${fullUrl}.`);
  }

  // Automatically get accountName from localStorage
  const accountName = account || localStorage.getItem('accountName');
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

// Re-export the Location type for convenience
export type { Location };

/**
 * Fetches a specific location by ID.
 */
export async function getLocationById(id: string, accountName: string): Promise<Location | null> {
  if (!id) throw new Error('Location ID is required.');
  if (!accountName || accountName.trim() === "") {
    throw new Error("Account name is required to fetch a location.");
  }
  
  try {
    const result = await authedFetch<Location>(`${LOCATIONS_BASE_URL}/${id}`, {
      method: 'GET',
    }, accountName);
    return result;
  } catch (error) {
    console.error(`Error fetching location ${id}:`, error);
    return null;
  }
}

/**
 * Creates a new location.
 */
export async function createLocation(location: Omit<Location, 'id'>, accountName: string): Promise<Location> {
  if (!accountName || accountName.trim() === "") {
    throw new Error("Account name is required to create a location.");
  }
  
  return authedFetch<Location>(`${LOCATIONS_BASE_URL}/`, {
    method: 'POST',
    body: JSON.stringify(location),
  }, accountName);
}

/**
 * Updates an existing location.
 */
export async function updateLocation(id: string, location: Location, accountName: string): Promise<void> {
  if (!id) throw new Error('Location ID is required.');
  if (!accountName || accountName.trim() === "") {
    throw new Error("Account name is required to update a location.");
  }
  
  await authedFetch<void>(`${LOCATIONS_BASE_URL}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(location),
  }, accountName);
}

/**
 * Deletes a location.
 */
export async function deleteLocation(id: string, accountName: string): Promise<void> {
  if (!id) throw new Error('Location ID is required.');
  if (!accountName || accountName.trim() === "") {
    throw new Error("Account name is required to delete a location.");
  }
  
  await authedFetch<void>(`${LOCATIONS_BASE_URL}/single/${id}`, {
    method: 'DELETE',
  }, accountName);
}

    