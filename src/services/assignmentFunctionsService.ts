
// src/services/assignmentFunctionsService.ts
'use client';

import { auth } from '@/lib/firebase';
import type { User } from 'firebase/auth';

// --- Interfaces based on your summary and NewItem component ---

// More detailed question structure
export interface AssignmentQuestion {
  id: string; // Unique ID for the question itself
  questionId?: string; //  Might be redundant if 'id' is the question's unique key
  label: string; // The question text
  component: string; // Type of input: 'text', 'textarea', 'radio', 'checkbox', 'select', 'number', 'email', 'photoUpload', etc.
  options?: string | string[]; // Semicolon-separated string or array of strings for radio/select/checkbox groups
  required?: boolean;
  comment?: boolean; // Allow text comments
  photoUpload?: boolean; // Allow file/image uploads
  pageNumber?: number;
  conditional?: {
    field: string; // ID of the question this one depends on
    value: string | string[]; // Value(s) of the dependent question that trigger this one
  };
  deficiency?: string; // Value that constitutes a deficiency
  deficiencyLabel?: string; // Label for reporting deficiency
  criticality?: 'low' | 'medium' | 'high';
  // Add any other fields from NewItem that are part of the question definition
}


interface AssignmentField {
  id: string; // Firestore document ID
  assignmentId?: string; // Another potential identifier, often the primary business key
  assignmentType?: string;
  assessmentName?: string;
  author?: string;
  description?: string;
  dueDate?: string;
  accountSubmittedFor?: string;
  status?: string;
  frequency?: string;
  communityShare?: boolean;
  schoolSelectorId?: string | boolean;
}

interface AssignmentContentItem { // This was an earlier, simpler version. We'll use AssignmentQuestion.
  questionId: string;
  questionLabel: string;
  type: string;
  options?: string[];
  deficiency?: string;
}

interface FullAssignment extends AssignmentField {
  content: AssignmentQuestion[]; // Changed to AssignmentQuestion
}

export interface AssignmentMetadata extends AssignmentField {
  // Currently same as AssignmentField, can be expanded if metadata differs more
}

// Updated to reflect that 'questions' is an array of detailed AssignmentQuestion objects
export interface AssignmentWithPermissions extends AssignmentField {
  questions: AssignmentQuestion[];
}

interface CreateAssignmentPayload {
  assessmentName: string;
  assignmentType?: string;
  description?: string;
  content: AssignmentQuestion[]; // Changed to AssignmentQuestion
  accountSubmittedFor?: string;
}

interface UpdateAssignmentPayload {
  assessmentName?: string;
  assignmentType?: string;
  description?: string;
  dueDate?: string;
}

export interface CompletedAssignmentResponse {
  assignmentId: string;
  documentId: string;
  message: string;
}

export interface ByLocationPayload { location: string }

export interface WeatherLocationData {
    name: string;
    [key: string]: any;
}

export interface QuestionsBySchoolResponse {
  counts: Record<string, Record<string, Record<string, number>>>;
  content: Array<{ questionLabel: string, questionId: string, deficiency?: string }>;
}
export interface SchoolQuestionAnswers {
  [answer: string]: number;
  questionLabel: string;
}
export interface SchoolsWithQuestionsResponse {
  [schoolName: string]: Record<string, SchoolQuestionAnswers>;
}

export interface DailySnapshotResponse {
  [questionId: string]: {
    [answer: string]: number;
    questionLabel: string;
  };
}

export interface AssignmentWithCompletions extends AssignmentMetadata {
  completed: Array<any>;
}
export type AssignedToUserResponse = AssignmentWithCompletions[];

export interface CompletedByMeItem {
  id: string;
  assignmentId: string;
  [key: string]: any;
}
export interface CompletedByMeResponse {
  completedAssignments: CompletedByMeItem[];
}

export interface TrendsResponse {
  week: number;
  month: number;
  year: number;
  streak: number;
  streakMessage: string;
}

export interface SaveDataResponse {
  message: string;
}

export interface PendingAssignment {
  [key: string]: any;
}
export type PendingAssignmentsResponse = PendingAssignment[];

export interface DraftAssignmentPayload {
  assessmentName?: string;
  content?: AssignmentQuestion[]; // Changed to AssignmentQuestion
  [key: string]: any;
}
export interface PostPendingResponse {
  message: string;
}


const BASE_URL = 'https://us-central1-webmvp-5b733.cloudfunctions.net/assignments';
const ASSIGNMENTS_V2_BASE_URL = 'https://us-central1-webmvp-5b733.cloudfunctions.net/assignmentsv2';


// --- Helper to get ID Token ---
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

// --- Generic Fetch Wrapper ---
async function authedFetch<T>(
  fullUrl: string, // Changed to accept fullUrl directly
  options: RequestInit = {},
  accountName?: string
): Promise<T> {
  const token = await getIdToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  } else {
    console.warn(`authedFetch: No token available for endpoint: ${fullUrl}`);
  }

  const trimmedAccountName = accountName?.trim();
  if (trimmedAccountName) {
    headers.set('account', trimmedAccountName);
  }


  if (!(options.body instanceof FormData) && !headers.has('Content-Type') && options.method && !['GET', 'HEAD'].includes(options.method.toUpperCase())) {
    headers.set('Content-Type', 'application/json');
  }

  let response;
  try {
    response = await fetch(fullUrl, { // Use fullUrl directly
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
  if (response.status === 204) {
    return undefined as any as T;
  }

  if (contentType && contentType.indexOf("application/json") !== -1) {
    return response.json() as Promise<T>;
  } else {
    const textResponse = await response.text();
    if (textResponse) {
      try {
        if ((textResponse.startsWith('{') && textResponse.endsWith('}')) || (textResponse.startsWith('[') && textResponse.endsWith(']'))) {
          return JSON.parse(textResponse) as T;
        }
      } catch (e) {
         console.error(`authedFetch: Failed to parse non-JSON text response from ${fullUrl} as JSON despite structure match. Error: ${e}`);
      }
      return textResponse as any as T;
    }
    return undefined as any as T;
  }
}

// --- API Service Functions ---

/**
 * 1. GET /
 * Returns full assignment content for a given account.
 * Account name is passed in the 'account' header.
 */
export async function getAllAssignmentsWithContent(accountName: string): Promise<FullAssignment[]> {
  const trimmedAccountName = accountName?.trim();
  if (!trimmedAccountName) {
     throw new Error('Account name is required and cannot be empty to fetch assignments.');
  }
  const result = await authedFetch<FullAssignment[] | undefined>(`${BASE_URL}/`, {}, trimmedAccountName);
  return result || [];
}

/**
 * 2. GET /assignmentlist
 * Returns metadata for all assignments tied to an account.
 * Account name is passed in the 'account' header.
 */
export async function getAssignmentListMetadata(accountName: string): Promise<AssignmentMetadata[]> {
  const trimmedAccountName = accountName?.trim();
  if (!trimmedAccountName) {
     throw new Error('Account name is required and cannot be empty for getAssignmentListMetadata.');
  }
  const result = await authedFetch<AssignmentMetadata[] | undefined>(`${BASE_URL}/assignmentlist`, {}, trimmedAccountName);
  return result || [];
}

/**
 * 16. GET /:id
 * Returns a full assignment by ID including permissions logic.
 * Account name ('account' header) might be needed for permission checks.
 */
export async function getAssignmentById(id: string, accountName?: string): Promise<AssignmentWithPermissions | null> {
  if (!id) throw new Error('Assignment ID is required.');
  const result = await authedFetch<AssignmentWithPermissions | undefined>(`${BASE_URL}/${id}`, {}, accountName);
  return result || null;
}

/**
 * 18. POST /createassignment
 * Body: Full assignment object + content array
 * Account name ('account' header) might be needed.
 */
export async function createAssignment(payload: CreateAssignmentPayload, accountName?: string): Promise<FullAssignment> {
  return authedFetch<FullAssignment>(`${BASE_URL}/createassignment`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }, accountName);
}

/**
 * 22. PUT /:id
 * Updates metadata of an existing assignment. Body: Partial assignment object. Returns 200 OK.
 * Account name ('account' header) might be needed.
 */
export async function updateAssignment(id: string, payload: Partial<UpdateAssignmentPayload>, accountName?: string): Promise<void> {
  if (!id) throw new Error('Assignment ID is required.');
  await authedFetch<void>(`${BASE_URL}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }, accountName);
}

/**
 * 23. DELETE /:id
 * Deletes an assignment by ID. Returns 200 OK.
 * Account name ('account' header) might be needed.
 */
export async function deleteAssignment(id: string, accountName?: string): Promise<void> {
  if (!id) throw new Error('Assignment ID is required.');
  await authedFetch<void>(`${BASE_URL}/${id}`, {
    method: 'DELETE',
  }, accountName);
}

/**
 * NEW: /completednew/:id (multipart form-data, but answers JSON contains file URLs)
 * This uses the ASSIGNMENTS_V2_BASE_URL
 * Uploads a completed assignment.
 * Account name ('account' header) might be needed.
 */
export async function submitCompletedAssignment(id: string, formData: FormData, accountName?: string): Promise<CompletedAssignmentResponse> {
  if (!id) throw new Error('Assignment ID is required.');
  return authedFetch<CompletedAssignmentResponse>(`${ASSIGNMENTS_V2_BASE_URL}/completednew/${id}`, {
    method: 'PUT',
    body: formData, // Content-Type will be set by browser for FormData
  }, accountName);
}

/**
 * 7. GET /tome OR /tome/:userEmail
 * Gets assignments assigned to the current or specified user.
 * Account name ('account' header) might be needed for context.
 */
export async function getMyAssignments(accountName: string, userEmail?: string): Promise<AssignmentMetadata[]> {
   const trimmedAccountName = accountName?.trim();
   if (!trimmedAccountName) {
     throw new Error('Account name is required and cannot be empty for getMyAssignments.');
  }
  if (!userEmail) {
      throw new Error('User email is required for getMyAssignments.');
  }
  const endpoint = `/tome/${encodeURIComponent(userEmail)}`;
  const result = await authedFetch<AssignmentMetadata[] | undefined>(`${BASE_URL}${endpoint}`, {}, trimmedAccountName);
  return result || [];
}

/**
 * 11. POST /bylocation
 * Body: { location: string } - This 'location' is the filter criteria.
 * The account header ('account': accountName) is still needed for auth/context.
 */
export async function getAssignmentsByLocation(payload: ByLocationPayload, accountName: string): Promise<FullAssignment[]> {
    const trimmedAccountName = accountName?.trim();
    if (!trimmedAccountName) {
     throw new Error('Account name is required and cannot be empty for getAssignmentsByLocation.');
    }
    const result = await authedFetch<FullAssignment[] | undefined>(`${BASE_URL}/bylocation`, {
        method: 'POST',
        body: JSON.stringify(payload),
    }, trimmedAccountName);
    return result || [];
}


/**
 * 6. GET /header/:lat/:lng
 * Returns current weather + reverse-geolocation for user’s location.
 * Account header may or may not be needed depending on backend.
 */
export async function getWeatherAndLocation(lat: number, lng: number, accountName?: string): Promise<WeatherLocationData | null> {
    const result = await authedFetch<WeatherLocationData | undefined>(`${BASE_URL}/header/${lat}/${lng}`, {}, accountName);
    return result || null;
}

/**
 * 10. GET /types
 * Returns hardcoded list of assignment types.
 * Account header may or may not be needed depending on backend.
 */
export async function getAssignmentTypes(accountName?: string): Promise<string[]> {
  const result = await authedFetch<string[] | undefined>(`${BASE_URL}/types`, {}, accountName);
  return result || [];
}

/**
 * 3. GET /questionsbyschool/:assignmentId/:period
 * Account header is likely needed.
 */
export async function getQuestionsBySchool(assignmentId: string, period: string, accountName: string): Promise<QuestionsBySchoolResponse | null> {
  const trimmedAccountName = accountName?.trim();
  if (!trimmedAccountName) {
     throw new Error('Account name is required and cannot be empty for getQuestionsBySchool.');
  }
  if (!assignmentId || !period) throw new Error('Assignment ID and period are required.');
  const result = await authedFetch<QuestionsBySchoolResponse | undefined>(`${BASE_URL}/questionsbyschool/${assignmentId}/${period}`, {}, trimmedAccountName);
  return result || null;
}

/**
 * 4. GET /schoolswithquestions/:assignmentId/:period
 * Account header is likely needed.
 */
export async function getSchoolsWithQuestions(assignmentId: string, period: string, accountName: string): Promise<SchoolsWithQuestionsResponse | null> {
  const trimmedAccountName = accountName?.trim();
  if (!trimmedAccountName) {
     throw new Error('Account name is required and cannot be empty for getSchoolsWithQuestions.');
  }
  if (!assignmentId || !period) throw new Error('Assignment ID and period are required.');
  const result = await authedFetch<SchoolsWithQuestionsResponse | undefined>(`${BASE_URL}/schoolswithquestions/${assignmentId}/${period}`, {}, trimmedAccountName);
  return result || null;
}

/**
 * 5. GET /dailysnapshot
 * Account header is likely needed.
 */
export async function getDailySnapshot(accountName: string): Promise<DailySnapshotResponse | null> {
  const trimmedAccountName = accountName?.trim();
  if (!trimmedAccountName) {
     throw new Error('Account name is required and cannot be empty for getDailySnapshot.');
  }
  const result = await authedFetch<DailySnapshotResponse | undefined>(`${BASE_URL}/dailysnapshot`, {}, trimmedAccountName);
  return result || null;
}

/**
 * 8. GET /dailysitesnapshot/tome/:userEmail
 * Account header is likely needed.
 */
export async function getDailySiteSnapshotForUser(userEmail: string, accountName: string): Promise<AssignmentMetadata | null> {
  const trimmedAccountName = accountName?.trim();
  if (!trimmedAccountName) {
     throw new Error('Account name is required and cannot be empty for getDailySiteSnapshotForUser.');
  }
  if (!userEmail) throw new Error('User email is required.');
  const result = await authedFetch<AssignmentMetadata | undefined>(`${BASE_URL}/dailysitesnapshot/tome/${encodeURIComponent(userEmail)}`, {}, trimmedAccountName);
  return result || null;
}

/**
 * 9. GET /dailysnapshot/:id/:period
 * Account header is likely needed.
 */
export async function getDailySnapshotByIdAndPeriod(id: string, period: string, accountName: string): Promise<DailySnapshotResponse | null> {
  const trimmedAccountName = accountName?.trim();
  if (!trimmedAccountName) {
     throw new Error('Account name is required and cannot be empty for getDailySnapshotByIdAndPeriod.');
  }
  if (!id || !period) throw new Error('Assignment ID and period are required.');
  const result = await authedFetch<DailySnapshotResponse | undefined>(`${BASE_URL}/dailysnapshot/${id}/${period}`, {}, trimmedAccountName);
  return result || null;
}

/**
 * 12. GET /assignedTo/:userEmail
 * Account header is likely needed.
 */
export async function getAssignedToUser(userEmail: string, accountName: string): Promise<AssignedToUserResponse> {
  const trimmedAccountName = accountName?.trim();
  if (!trimmedAccountName) {
     throw new Error('Account name is required and cannot be empty for getAssignedToUser.');
  }
  if (!userEmail) throw new Error('User email is required.');
  const result = await authedFetch<AssignedToUserResponse | undefined>(`${BASE_URL}/assignedTo/${encodeURIComponent(userEmail)}`, {}, trimmedAccountName);
  return result || [];
}

/**
 * 13. GET /author/:userId
 * Account header is likely needed.
 */
export async function getAssignmentsByAuthor(userId: string, accountName: string): Promise<AssignmentMetadata[]> {
  const trimmedAccountName = accountName?.trim();
  if (!trimmedAccountName) {
     throw new Error('Account name is required and cannot be empty for getAssignmentsByAuthor.');
  }
  if (!userId) throw new Error('User ID is required.');
  const result = await authedFetch<AssignmentMetadata[] | undefined>(`${BASE_URL}/author/${userId}`, {}, trimmedAccountName);
  return result || [];
}

/**
 * 14. GET /completedByMe
 * Account header is likely needed.
 */
export async function getAssignmentsCompletedByMe(accountName: string): Promise<CompletedByMeResponse | null> {
  const trimmedAccountName = accountName?.trim();
  if (!trimmedAccountName) {
     throw new Error('Account name is required and cannot be empty for getAssignmentsCompletedByMe.');
  }
  const result = await authedFetch<CompletedByMeResponse | undefined>(`${BASE_URL}/completedByMe`, {}, trimmedAccountName);
  return result || null;
}

/**
 * 15. GET /widgets/trends
 * Account header is likely needed.
 */
export async function getWidgetTrends(accountName: string): Promise<TrendsResponse | null> {
  const trimmedAccountName = accountName?.trim();
  if (!trimmedAccountName) {
     throw new Error('Account name is required and cannot be empty for getWidgetTrends.');
  }
  const result = await authedFetch<TrendsResponse | undefined>(`${BASE_URL}/widgets/trends`, {}, trimmedAccountName);
  return result || null;
}

/**
 * 19. POST /save_data/:id (multipart form-data)
 * Account header may or may not be needed.
 */
export async function saveDataCsv(id: string, csvFormData: FormData, accountName?: string): Promise<SaveDataResponse> {
  if (!id) throw new Error('ID is required.');
  return authedFetch<SaveDataResponse>(`${BASE_URL}/save_data/${id}`, {
    method: 'POST',
    body: csvFormData,
  }, accountName);
}

/**
 * 20. GET /pending/:id
 * Account header is likely needed.
 */
export async function getPendingSubmissions(id: string, accountName: string): Promise<PendingAssignmentsResponse> {
  const trimmedAccountName = accountName?.trim();
  if (!trimmedAccountName) {
     throw new Error('Account name is required and cannot be empty for getPendingSubmissions.');
  }
  if (!id) throw new Error('ID is required for pending submissions.');
  const result = await authedFetch<PendingAssignmentsResponse | undefined>(`${BASE_URL}/pending/${id}`, {}, trimmedAccountName);
  return result || [];
}

/**
 * 21. POST /pending/:assignmentId
 * Account header is likely needed.
 */
export async function savePendingSubmission(assignmentId: string, payload: DraftAssignmentPayload, accountName: string): Promise<PostPendingResponse> {
  const trimmedAccountName = accountName?.trim();
  if (!trimmedAccountName) {
     throw new Error('Account name is required and cannot be empty for savePendingSubmission.');
  }
  if (!assignmentId) throw new Error('Assignment ID is required.');
  return authedFetch<PostPendingResponse>(`${BASE_URL}/pending/${assignmentId}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }, trimmedAccountName);
}

