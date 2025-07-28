// src/services/resourceService.ts
'use client';

import { auth } from '@/lib/firebase';
import type { User } from 'firebase/auth';
import type { ResourceDocument, AccessControlPayload } from '@/types/Resource';

// IMPORTANT: Replace this with your actual Cloud Functions base URL for resources
const RESOURCES_BASE_URL = 'https://us-central1-webmvp-5b733.cloudfunctions.net/resources';

// --- Helper to get ID Token (consistent with other services) ---
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

// --- Generic Fetch Wrapper (consistent with other services) ---
async function authedFetch<T>(
  fullUrl: string,
  options: RequestInit = {},
  account?: string
): Promise<T> {
  const token = await getIdToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  } else {
    console.warn(`[CRITICAL] authedFetch (resourceService): No Authorization token available for endpoint: ${fullUrl}.`);
  }

  const trimmedaccount = account?.trim();
  if (trimmedaccount) {
    headers.set('account', trimmedaccount);
  } else {
     console.warn(`[CRITICAL] authedFetch (resourceService): 'account' header NOT SET for URL: ${fullUrl} because account parameter was: '${account}'. This may cause API errors.`);
  }

  // Automatically set Content-Type for non-FormData POST/PUT/PATCH etc.
  if (!(options.body instanceof FormData) && !headers.has('Content-Type') && options.method && !['GET', 'HEAD'].includes(options.method.toUpperCase())) {
    headers.set('Content-Type', 'application/json');
  }

  let response;
  try {
    response = await fetch(fullUrl, { ...options, headers });
  } catch (networkError: unknown) {
    console.error(`Network error for ${fullUrl} (resourceService):`, networkError);
    const errorMessage = networkError instanceof Error ? networkError.message : 'Failed to fetch';
    let detailedMessage = `Network Error: Could not connect to ${fullUrl}. (${errorMessage}). `;
    detailedMessage += "This could be due to a network issue, the backend service not being available, or a CORS policy blocking the request. ";
    detailedMessage += "Please ensure the backend function is deployed correctly and CORS is configured if necessary.";
    throw new Error(detailedMessage);
  }

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      console.log(`Raw error: ${e}`);
      errorData = { message: response.statusText || `HTTP error ${response.status}` };
    }
    console.error(`API Error ${response.status} for ${fullUrl} (resourceService):`, errorData);
    throw new Error(`API Error: ${response.status} ${errorData?.message || response.statusText}`);
  }
  
  const contentType = response.headers.get("content-type");
  if (response.status === 204) { return undefined as any as T; }
  if (contentType && contentType.includes("application/json")) { return response.json() as Promise<T>; }

  const textResponse = await response.text();
  // If response is OK but not explicitly application/json, try parsing as JSON anyway.
  // This handles cases where the backend might return JSON without the correct header.
  if (response.ok && textResponse) {
    try {
      return JSON.parse(textResponse) as T;
    } catch {
      console.warn(`Failed to parse non-JSON response as JSON for ${fullUrl}. Content-Type: ${contentType || 'none'}. Response text: ${textResponse.substring(0, 100)}...`);
    }
  }
  return [] as T; // Default to empty array or appropriate default if response wasn't JSON and couldn't be parsed.
}

/**
 * Uploads a new resource document.
 * The backend should handle file storage and Firestore metadata creation.
 * @param formData FormData containing the file and metadata (name, description, tags).
 * @param account The account ID for associating the resource.
 */
export async function uploadResourceDocument(formData: FormData, account: string): Promise<ResourceDocument> {
  // The backend will extract metadata from formData fields if needed.
  return authedFetch<ResourceDocument>(`${RESOURCES_BASE_URL}/upload`, { // Changed to /upload
    method: 'POST',
    body: formData, // FormData automatically sets Content-Type to multipart/form-data
  }, account) as Promise<ResourceDocument>;
}

/**
 * Fetches all resource documents for a given account.
 * @param account The account ID to filter resources by.
 */
export async function getResourceDocuments(account: string): Promise<ResourceDocument[]> {
  const result = await authedFetch<ResourceDocument[] | undefined>(`${RESOURCES_BASE_URL}/`, {
    method: 'GET',
  }, account);
  return result || [];
}

/**
 * Adds an audio note to a specific resource document.
 * The backend should handle audio file storage and update resource metadata.
 * @param resourceId The ID of the resource document.
 * @param audioBlob The audio data as a Blob.
 * @param account The account ID.
 * @returns The URL of the uploaded audio note or relevant metadata.
 */
export async function addAudioNoteToResource(resourceId: string, audioBlob: Blob, account: string): Promise<string> {
  const formData = new FormData();
  formData.append('audioFile', audioBlob, `audio_note_${resourceId}.webm`);
  // The backend will use resourceId from the path parameter.
  
  const response = await authedFetch<{ downloadURL: string }>(`${RESOURCES_BASE_URL}/${resourceId}/audio`, {
    method: 'POST',
    body: formData,
  }, account);
  return response.downloadURL; // Assuming backend returns the download URL
}

/**
 * Updates the access control permissions for a resource document.
 * @param resourceId The ID of the resource document.
 * @param permissions The new access control payload.
 * @param account The account ID.
 */
export async function updateResourcePermissions(resourceId: string, permissions: AccessControlPayload, account: string): Promise<void> {
  await authedFetch<void>(`${RESOURCES_BASE_URL}/${resourceId}/permissions`, {
    method: 'PUT',
    body: JSON.stringify(permissions),
  }, account);
}

/**
 * Triggers Gemini summary generation for a resource document.
 * The backend will fetch the document content, call Gemini, and save the summary.
 * @param resourceId The ID of the resource document.
 * @param account The account ID.
 * @returns The generated summary string.
 */
export async function generateResourceSummary(resourceId: string, account: string): Promise<string> {
  // This endpoint on the backend will orchestrate fetching the document, calling Genkit, and saving.
  const response = await authedFetch<{ summary: string }>(`${RESOURCES_BASE_URL}/${resourceId}/generate-summary`, {
    method: 'POST', // POST request to trigger an action
  }, account);
  return response.summary;
}

// Placeholder for future functions:
// export async function getResourceDocumentById(resourceId: string, account: string): Promise<ResourceDocument | null> { /* ... */ return null; }
// export async function updateResourceDocument(resourceId: string, updates: Partial<ResourceDocument>, account: string): Promise<void> { /* ... */ }
// export async function deleteResourceDocument(resourceId: string, account: string): Promise<void> { /* ... */ }
// export async function getResourceDocumentVersions(resourceId: string, account: string): Promise<any[]> { /* ... */ return []; }