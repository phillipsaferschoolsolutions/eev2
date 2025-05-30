
// src/services/assignmentFunctionsService.ts
'use client'; // Marking as client component as it uses browser APIs like fetch and auth

import { auth } from '@/lib/firebase';
import type { User } from 'firebase/auth';
import type { AssignmentContentItem, AssignmentMetadata, FullAssignment, CreateAssignmentPayload, UpdateAssignmentPayload, CompletedAssignmentResponse, ByLocationPayload, WeatherLocationData } from './assignmentFunctionsService'; // Self-referencing for clarity on what types are defined here

// --- Base URL for Cloud Functions ---
// User confirmed: https://us-central1-webmvp-5b733.cloudfunctions.net/assignments
// Alternative Cloud Run URL provided by user: https://assignments-re4xxcez2a-uc.a.run.app
// We will use the canonical cloudfunctions.net URL.
const BASE_URL = 'https://us-central1-webmvp-5b733.cloudfunctions.net/assignments';

// --- Interfaces based on your summary ---
// (These can be expanded and moved to a dedicated types file later)

// Helper for common assignment fields, can be extended by more specific types
export interface AssignmentField {
  id: string;
  assignmentType?: string;
  assessmentName?: string;
  author?: string;
  description?: string;
  dueDate?: string; // ISO string or Firebase Timestamp
  // ... other common metadata fields
}

export interface AssignmentContentItem {
  questionId: string;
  questionLabel: string;
  type: string; // e.g., 'multiple-choice', 'text'
  options?: string[];
  deficiency?: string; // Added from /questionsbyschool response
  // ... other question-specific fields
}

export interface FullAssignment extends AssignmentField {
  content: AssignmentContentItem[];
  // ... any other fields returned by GET /
}

export interface AssignmentMetadata extends AssignmentField {
  // Fields returned by GET /assignmentlist & /tome
  // Add specific metadata fields here if known beyond AssignmentField
}

// For GET /:id
export interface FieldWithFlattenedOptions {
  // Define based on actual structure of 'fieldWithFlattenedOptions'
  [key: string]: any; // Placeholder
}
export interface AssignmentWithPermissions extends AssignmentField {
  questions: FieldWithFlattenedOptions[];
  // ... other fields from GET /:id
}

export interface CreateAssignmentPayload {
  assessmentName: string;
  assignmentType?: string;
  description?: string;
  content: AssignmentContentItem[];
  // ... other fields required for creation
}

export interface UpdateAssignmentPayload {
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

export interface ByLocationPayload { location: string }

export interface WeatherLocationData {
    name: string; // location name
    [key: string]: any; // Placeholder for OpenWeatherMap data
}

// --- New Interfaces for added functions ---

// For GET /questionsbyschool/:assignmentId/:period (Endpoint 3)
export interface QuestionsBySchoolResponse {
  counts: Record<string, Record<string, Record<string, number>>>; // questionId -> school -> responseValue -> count
  content: Array<{ questionLabel: string, questionId: string, deficiency?: string }>; // deficiency might be optional
}

// For GET /schoolswithquestions/:assignmentId/:period (Endpoint 4)
export interface SchoolQuestionAnswers {
  [answer: string]: number;
  questionLabel: string;
}
export interface SchoolsWithQuestionsResponse {
  [schoolName: string]: Record<string, SchoolQuestionAnswers>;
}

// For GET /dailysnapshot (Endpoint 5) & GET /dailysnapshot/:id/:period (Endpoint 9)
export interface DailySnapshotResponse {
  [questionId: string]: {
    [answer: string]: number;
    questionLabel: string;
  };
}

// For GET /assignedTo/:userEmail (Endpoint 12)
export interface AssignmentWithCompletions extends AssignmentMetadata {
  completed: Array<any>; // TODO: Specify type for completed items if known
}
export type AssignedToUserResponse = AssignmentWithCompletions[];

// For GET /completedByMe (Endpoint 14)
export interface CompletedByMeItem {
  id: string; // document id of the completion
  assignmentId: string;
  [key: string]: any; // Placeholder for actual response fields
}
export interface CompletedByMeResponse {
  completedAssignments: CompletedByMeItem[];
}

// For GET /widgets/trends (Endpoint 15)
export interface TrendsResponse {
  week: number;
  month: number;
  year: number;
  streak: number;
  streakMessage: string;
}

// For POST /save_data/:id (Endpoint 19)
export interface SaveDataResponse {
  message: string;
}

// For GET /pending/:id (Endpoint 20)
export interface PendingAssignment {
  // Define more specifically if possible based on "Draft assignment object"
  [key: string]: any; // Placeholder
}
export type PendingAssignmentsResponse = PendingAssignment[];

// For POST /pending/:assignmentId (Endpoint 21)
export interface DraftAssignmentPayload {
  assessmentName?: string;
  content?: AssignmentContentItem[];
  [key: string]: any; // Placeholder for other draft fields
}
export interface PostPendingResponse {
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
  if (!(options.body instanceof FormData) && !headers.has('Content-Type') && options.method && !['GET', 'HEAD'].includes(options.method.toUpperCase())) {
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
      errorData = { message: response.statusText };
    }
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
    // For non-JSON responses (like simple text from some messages or empty 200 OK)
    // If you expect text: return response.text() as any as T;
    return undefined as any as T; // Adjust if text responses are expected
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
export async function createAssignment(payload: CreateAssignmentPayload): Promise<FullAssignment> { // Endpoint returns { ...assignment }
  return authedFetch<FullAssignment>('/createassignment', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * 22. PUT /:id
 * Updates metadata of an existing assignment. Body: Partial assignment object. Returns 200 OK.
 */
export async function updateAssignment(id: string, payload: Partial<UpdateAssignmentPayload>): Promise<void> {
  if (!id) throw new Error('Assignment ID is required.');
  await authedFetch<void>(`/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

/**
 * 23. DELETE /:id
 * Deletes an assignment by ID. Returns 200 OK.
 */
export async function deleteAssignment(id: string): Promise<void> {
  if (!id) throw new Error('Assignment ID is required.');
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
  return authedFetch<CompletedAssignmentResponse>(`/completed/${id}`, {
    method: 'PUT',
    body: formData,
  });
}

/**
 * 7. GET /tome OR /tome/:userEmail
 * Gets assignments assigned to the current or specified user.
 */
export async function getMyAssignments(userEmail?: string): Promise<AssignmentMetadata[]> {
  const endpoint = userEmail ? `/tome/${encodeURIComponent(userEmail)}` : '/tome';
  return authedFetch<AssignmentMetadata[]>(endpoint);
}

/**
 * 11. POST /bylocation
 * Body: { location: string }
 * Returns: All assignments shared with that location.
 */
export async function getAssignmentsByLocation(payload: ByLocationPayload): Promise<FullAssignment[]> {
    return authedFetch<FullAssignment[]>('/bylocation', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

/**
 * 6. GET /header/:lat/:lng
 * Returns current weather + reverse-geolocation for user’s location.
 */
export async function getWeatherAndLocation(lat: number, lng: number): Promise<WeatherLocationData> {
    return authedFetch<WeatherLocationData>(`/header/${lat}/${lng}`);
}

// --- Newly Added Functions ---

/**
 * 10. GET /types
 * Returns hardcoded list of assignment types.
 */
export async function getAssignmentTypes(): Promise<string[]> {
  return authedFetch<string[]>('/types');
}

/**
 * 3. GET /questionsbyschool/:assignmentId/:period
 * Tallies question responses per school within a given period (“today” or all time).
 */
export async function getQuestionsBySchool(assignmentId: string, period: string): Promise<QuestionsBySchoolResponse> {
  if (!assignmentId || !period) throw new Error('Assignment ID and period are required.');
  return authedFetch<QuestionsBySchoolResponse>(`/questionsbyschool/${assignmentId}/${period}`);
}

/**
 * 4. GET /schoolswithquestions/:assignmentId/:period
 * Returns counts of question answers grouped by school.
 */
export async function getSchoolsWithQuestions(assignmentId: string, period: string): Promise<SchoolsWithQuestionsResponse> {
  if (!assignmentId || !period) throw new Error('Assignment ID and period are required.');
  return authedFetch<SchoolsWithQuestionsResponse>(`/schoolswithquestions/${assignmentId}/${period}`);
}

/**
 * 5. GET /dailysnapshot
 * Tallies answers for assignments of type “dailySnapshot” by current user.
 */
export async function getDailySnapshot(): Promise<DailySnapshotResponse> {
  return authedFetch<DailySnapshotResponse>('/dailysnapshot');
}

/**
 * 8. GET /dailysitesnapshot/tome/:userEmail
 * Gets daily site snapshot metadata assigned to a user.
 */
export async function getDailySiteSnapshotForUser(userEmail: string): Promise<AssignmentMetadata> {
  if (!userEmail) throw new Error('User email is required.');
  return authedFetch<AssignmentMetadata>(`/dailysitesnapshot/tome/${encodeURIComponent(userEmail)}`);
}

/**
 * 9. GET /dailysnapshot/:id/:period
 * Tallies daily snapshot responses for a given assignment and period.
 */
export async function getDailySnapshotByIdAndPeriod(id: string, period: string): Promise<DailySnapshotResponse> {
  if (!id || !period) throw new Error('Assignment ID and period are required.');
  return authedFetch<DailySnapshotResponse>(`/dailysnapshot/${id}/${period}`);
}

/**
 * 12. GET /assignedTo/:userEmail
 * Returns all assignments assigned to a user (with completions).
 */
export async function getAssignedToUser(userEmail: string): Promise<AssignedToUserResponse> {
  if (!userEmail) throw new Error('User email is required.');
  return authedFetch<AssignedToUserResponse>(`/assignedTo/${encodeURIComponent(userEmail)}`);
}

/**
 * 13. GET /author/:userId
 * Returns assignments authored by a specific user.
 */
export async function getAssignmentsByAuthor(userId: string): Promise<AssignmentMetadata[]> {
  if (!userId) throw new Error('User ID is required.');
  return authedFetch<AssignmentMetadata[]>(`/author/${userId}`);
}

/**
 * 14. GET /completedByMe
 * Returns all assignments completed by the current user.
 */
export async function getAssignmentsCompletedByMe(): Promise<CompletedByMeResponse> {
  return authedFetch<CompletedByMeResponse>('/completedByMe');
}

/**
 * 15. GET /widgets/trends
 * Returns weekly/monthly/yearly DSS completion trends and streaks.
 */
export async function getWidgetTrends(): Promise<TrendsResponse> {
  return authedFetch<TrendsResponse>('/widgets/trends');
}

/**
 * 19. POST /save_data/:id (multipart form-data)
 * Uploads a CSV of completed assignment entries. Body: CSV file.
 */
export async function saveDataCsv(id: string, csvFormData: FormData): Promise<SaveDataResponse> {
  if (!id) throw new Error('ID is required.');
  return authedFetch<SaveDataResponse>(`/save_data/${id}`, {
    method: 'POST',
    body: csvFormData,
  });
}

/**
 * 20. GET /pending/:id
 * Retrieves pending submissions for current user.
 */
export async function getPendingSubmissions(id: string): Promise<PendingAssignmentsResponse> {
  if (!id) throw new Error('ID is required for pending submissions.'); // Assuming 'id' is an assignmentId or similar context
  return authedFetch<PendingAssignmentsResponse>(`/pending/${id}`);
}

/**
 * 21. POST /pending/:assignmentId
 * Body: Draft assignment object
 */
export async function savePendingSubmission(assignmentId: string, payload: DraftAssignmentPayload): Promise<PostPendingResponse> {
  if (!assignmentId) throw new Error('Assignment ID is required.');
  return authedFetch<PostPendingResponse>(`/pending/${assignmentId}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
