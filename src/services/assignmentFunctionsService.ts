
// src/services/assignmentFunctionsService.ts
'use client'; // Marking as client component as it uses browser APIs like fetch and auth

import { auth } from '@/lib/firebase';
import type { User } from 'firebase/auth';

// TODO: Consider making this an environment variable
const BASE_URL = 'https://us-central1-webmvp-5b733.cloudfunctions.net/assignments';

// --- Interfaces based on your summary ---
// (These can be expanded and moved to a dedicated types file later)

interface AssignmentField {
  // Define common assignment fields based on your Firestore structure or function returns
  id: string;
  assignmentType?: string;
  assessmentName?: string;
  author?: string;
  description?: string;
  dueDate?: string; // ISO string or Firebase Timestamp
  // ... other common metadata fields
}

export interface AssignmentContentItem {
  // Define the structure of items in the 'content' array
  questionId: string;
  questionLabel: string;
  type: string; // e.g., 'multiple-choice', 'text'
  options?: string[];
  // ... other question-specific fields
}

export interface FullAssignment extends AssignmentField {
  content: AssignmentContentItem[];
  // ... any other fields returned by GET /
}

export interface AssignmentMetadata extends AssignmentField {
  // Fields returned by GET /assignmentlist
}

export interface AssignmentWithPermissions extends AssignmentField {
  questions: any[]; // Define more specific type later: fieldWithFlattenedOptions
  // ... other fields from GET /:id
}

export interface CreateAssignmentPayload {
  // Define the expected body for POST /createassignment
  assessmentName: string;
  assignmentType?: string;
  description?: string;
  content: AssignmentContentItem[]; // Assuming content is part of creation
  // ... other fields required for creation
}

export interface UpdateAssignmentPayload {
  // Define the expected body for PUT /:id (partial update)
  assessmentName?: string;
  assignmentType?: string;
  description?: string;
  dueDate?: string;
  // ... other updatable fields
}

export interface CompletedAssignmentResponse {
  assignmentId: string;
  documentId: string; // ID of the completion document
  message: string;
}

// --- Helper to get ID Token ---
async function getIdToken(): Promise<string | null> {
  const currentUser: User | null = auth.currentUser;
  if (currentUser) {
    return currentUser.getIdToken();
  }
  return null;
}

// --- Generic Fetch Wrapper ---
async function authedFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getIdToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  // Do NOT set Content-Type for FormData, browser does it.
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }


  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      // Not a JSON response
      errorData = { message: response.statusText };
    }
    throw new Error(
      `API Error: ${response.status} ${errorData?.message || response.statusText}`
    );
  }

  // Handle cases where response might be empty (e.g., 200 OK for DELETE, 204 No Content)
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.indexOf("application/json") !== -1) {
    return response.json() as Promise<T>;
  } else {
    // For non-JSON responses (like simple text or empty 200/204)
    // If you expect text: await response.text()
    // For empty, we can cast to T if T allows undefined/null or is void
    return undefined as any as T; // Adjust as per expected void/text responses
  }
}

// --- API Service Functions ---

/**
 * 1. GET /
 * Returns full assignment content for a given account (derived from auth token).
 */
export async function getAllAssignmentsWithContent(): Promise<FullAssignment[]> {
  return authedFetch<FullAssignment[]>('/');
}

/**
 * 2. GET /assignmentlist
 * Returns metadata for all assignments tied to an account.
 */
export async function getAssignmentListMetadata(): Promise<AssignmentMetadata[]> {
  return authedFetch<AssignmentMetadata[]>('/assignmentlist');
}

/**
 * 16. GET /:id
 * Returns a full assignment by ID including permissions logic.
 */
export async function getAssignmentById(id: string): Promise<AssignmentWithPermissions> {
  if (!id) throw new Error('Assignment ID is required.');
  return authedFetch<AssignmentWithPermissions>(`/${id}`);
}

/**
 * 18. POST /createassignment
 * Body: Full assignment object + content array
 */
export async function createAssignment(payload: CreateAssignmentPayload): Promise<FullAssignment> {
  return authedFetch<FullAssignment>('/createassignment', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * 22. PUT /:id
 * Updates metadata of an existing assignment.
 * Body: Partial assignment object
 */
export async function updateAssignment(id: string, payload: Partial<UpdateAssignmentPayload>): Promise<void> {
  if (!id) throw new Error('Assignment ID is required.');
  // Assuming 200 OK with no body, or adapt if it returns the updated object
  await authedFetch<void>(`/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

/**
 * 23. DELETE /:id
 * Deletes an assignment by ID.
 */
export async function deleteAssignment(id: string): Promise<void> {
  if (!id) throw new Error('Assignment ID is required.');
  // Assuming 200 OK with no body
  await authedFetch<void>(`/${id}`, {
    method: 'DELETE',
  });
}

/**
 * 17. PUT /completed/:id (multipart form-data)
 * Uploads a completed assignment. Supports image uploads.
 * Body: FormData with content, metadata fields, and optional file attachments
 */
export async function submitCompletedAssignment(id: string, formData: FormData): Promise<CompletedAssignmentResponse> {
  if (!id) throw new Error('Assignment ID is required.');
  // Note: Content-Type header is NOT set manually for FormData.
  // The browser will set it correctly, including the boundary.
  return authedFetch<CompletedAssignmentResponse>(`/completed/${id}`, {
    method: 'PUT',
    body: formData, // formData should be prepared by the caller
  });
}

// --- Placeholder for other functions from your list ---
// We can implement these as needed. Examples:

// 7. GET /tome OR /tome/:userEmail
export async function getMyAssignments(userEmail?: string): Promise<AssignmentMetadata[]> {
  const endpoint = userEmail ? `/tome/${encodeURIComponent(userEmail)}` : '/tome';
  return authedFetch<AssignmentMetadata[]>(endpoint);
}

// 11. POST /bylocation
interface ByLocationPayload { location: string }
export async function getAssignmentsByLocation(payload: ByLocationPayload): Promise<FullAssignment[]> {
    return authedFetch<FullAssignment[]>('/bylocation', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

// 6. GET /header/:lat/:lng
export interface WeatherLocationData {
    name: string; // location name
    // ... other OpenWeatherData fields
    [key: string]: any; // Placeholder for OpenWeatherMap data
}
export async function getWeatherAndLocation(lat: number, lng: number): Promise<WeatherLocationData> {
    return authedFetch<WeatherLocationData>(`/header/${lat}/${lng}`);
}


// TODO: Implement other functions from the list as needed:
// GET /questionsbyschool/:assignmentId/:period
// GET /schoolswithquestions/:assignmentId/:period
// GET /dailysnapshot
// GET /dailysitesnapshot/tome/:userEmail
// GET /dailysnapshot/:id/:period
// GET /types
// GET /assignedTo/:userEmail
// GET /author/:userId
// GET /completedByMe
// GET /widgets/trends
// POST /save_data/:id (multipart form-data for CSV)
// GET /pending/:id
// POST /pending/:assignmentId

// Remember to define appropriate TypeScript interfaces for their payloads and responses.
