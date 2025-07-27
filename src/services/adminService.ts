// src/services/adminService.ts
"use client";
import { auth } from "@/lib/firebase";
import type { User } from "firebase/auth";
import type { UserProfile } from "@/types/User";

// Define a new base URL for your admin-related Cloud Functions
const ADMIN_BASE_URL = "https://us-central1-webmvp-5b733.cloudfunctions.net/admin"; // Assuming you will group admin endpoints under /admin

// --- Helper to get ID Token ---
async function getIdToken(): Promise<string | null> {
  const currentUser: User | null = auth.currentUser;
  if (currentUser) {
    try {
      return await currentUser.getIdToken(true);
    } catch (error) {
      console.error("Error getting ID token for adminService:", error);
      throw new Error("Could not get Firebase ID token.");
    }
  }
  throw new Error("User not authenticated.");
}

// --- Generic Fetch Wrapper ---
async function authedFetch<T>(
  fullUrl: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getIdToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  } else {
    console.warn(`[CRITICAL] authedFetch (adminService): No Authorization token for ${fullUrl}.`);
  }

  const accountName = localStorage.getItem('accountName');
  if (accountName) {
      headers.set('account', accountName);
  } else {
      console.warn(`[CRITICAL] authedFetch (adminService): 'account' header not found for URL: ${fullUrl}.`);
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
  
  const textResponse = await response.text();
  console.log("Raw server response:", textResponse); // Log the raw response

  if (!textResponse) {
    return null as unknown as T;
  }
  try {
    const json = JSON.parse(textResponse);
    return json;
  } catch {
    console.error("Failed to parse JSON response:", textResponse);
    throw new Error("Failed to parse server response.");
  }
}

/**
 * Fetches a paginated list of users.
 * Requires admin privileges on the backend.
 * @param page The page number to fetch.
 * @param limit The number of users per page.
 * @returns A promise that resolves to the paginated user data object.
 */
export async function getUsers(page: number, limit: number): Promise<{ users: UserProfile[], totalPages: number, totalUsers: number }> {
  // Construct the URL with query parameters
  const url = `${ADMIN_BASE_URL}/users/paginated?page=${page}&limit=${limit}`;
  
  try {
    const response = await authedFetch<{ users: UserProfile[], totalPages: number, totalUsers: number }>(url, {
      method: 'GET',
    });
    return response || { users: [], totalPages: 0, totalUsers: 0 };
  } catch (error) {
    console.error("Error fetching paginated users:", error);
    throw error;
  }
}

/**
 * Updates a user's permission and records an audit log.
 * @param userId The UID of the user to update.
 * @param newPermission The new permission level to set.
 * @param signature The electronic signature of the admin making the change.
 * @returns A promise that resolves when the action is complete.
 */
export async function updateUserPermission(userId: string, newPermission: string, signature: string): Promise<any> {
}
export async function updateUserPermission(userId: string, newPermission: string, signature: string): Promise<unknown> {
  const url = `${ADMIN_BASE_URL}/users/${userId}/permission`;
  
  try {
    const response = await authedFetch<unknown>(url, {
      method: 'PUT',
      body: JSON.stringify({ newPermission, signature }),
    });
    return response;
  } catch (error) {
    console.error(`Error updating permission for user ${userId}:`, error);
    throw error;
  }
}


// Future admin functions like updateUser, deleteUser, etc., will go here.
