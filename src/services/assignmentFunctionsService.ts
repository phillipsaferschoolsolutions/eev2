
// src/services/assignmentFunctionsService.ts
'use client'; 

import { auth } from '@/lib/firebase';
import type { User } from 'firebase/auth';
// Ensure all defined types are exported or used internally
export type { AssignmentContentItem, FullAssignment, AssignmentMetadata, CreateAssignmentPayload, UpdateAssignmentPayload, CompletedAssignmentResponse, ByLocationPayload, WeatherLocationData, QuestionsBySchoolResponse, SchoolsWithQuestionsResponse, DailySnapshotResponse, AssignedToUserResponse, CompletedByMeItem, CompletedByMeResponse, TrendsResponse, SaveDataResponse, PendingAssignment, PendingAssignmentsResponse, DraftAssignmentPayload, PostPendingResponse, AssignmentWithPermissions, AssignmentField };


const BASE_URL = 'https://us-central1-webmvp-5b733.cloudfunctions.net/assignments';

// --- Interfaces based on your summary ---
interface AssignmentField {
  id: string;
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

interface AssignmentContentItem {
  questionId: string;
  questionLabel: string;
  type: string; 
  options?: string[];
  deficiency?: string; 
}

interface FullAssignment extends AssignmentField {
  content: AssignmentContentItem[];
}

interface AssignmentMetadata extends AssignmentField {
  // Currently same as AssignmentField, can be expanded if metadata differs more
}

interface FieldWithFlattenedOptions {
  [key: string]: any; 
}
interface AssignmentWithPermissions extends AssignmentField {
  questions: FieldWithFlattenedOptions[];
}

interface CreateAssignmentPayload {
  assessmentName: string;
  assignmentType?: string;
  description?: string;
  content: AssignmentContentItem[];
  accountSubmittedFor?: string;
}

interface UpdateAssignmentPayload {
  assessmentName?: string;
  assignmentType?: string;
  description?: string;
  dueDate?: string;
}

interface CompletedAssignmentResponse {
  assignmentId: string;
  documentId: string; 
  message: string;
}

interface ByLocationPayload { location: string }

interface WeatherLocationData {
    name: string; 
    [key: string]: any; 
}

interface QuestionsBySchoolResponse {
  counts: Record<string, Record<string, Record<string, number>>>; 
  content: Array<{ questionLabel: string, questionId: string, deficiency?: string }>; 
}

interface SchoolQuestionAnswers {
  [answer: string]: number;
  questionLabel: string;
}
interface SchoolsWithQuestionsResponse {
  [schoolName: string]: Record<string, SchoolQuestionAnswers>;
}

interface DailySnapshotResponse {
  [questionId: string]: {
    [answer: string]: number;
    questionLabel: string;
  };
}

interface AssignmentWithCompletions extends AssignmentMetadata {
  completed: Array<any>; 
}
type AssignedToUserResponse = AssignmentWithCompletions[];

interface CompletedByMeItem {
  id: string; 
  assignmentId: string;
  [key: string]: any; 
}
interface CompletedByMeResponse {
  completedAssignments: CompletedByMeItem[];
}

interface TrendsResponse {
  week: number;
  month: number;
  year: number;
  streak: number;
  streakMessage: string;
}

interface SaveDataResponse {
  message: string;
}

interface PendingAssignment {
  [key: string]: any; 
}
type PendingAssignmentsResponse = PendingAssignment[];

interface DraftAssignmentPayload {
  assessmentName?: string;
  content?: AssignmentContentItem[];
  [key: string]: any; 
}
interface PostPendingResponse {
  message: string;
}


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
  endpoint: string,
  options: RequestInit = {},
  accountName?: string 
): Promise<T> {
  const token = await getIdToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  } else {
    console.warn(`authedFetch: No token available for endpoint: ${endpoint}`);
  }
  
  const trimmedAccountName = accountName?.trim();
  if (trimmedAccountName) {
    headers.set('account', trimmedAccountName); // Explicitly lowercase 'account' key
  } else {
     // Only warn if the specific endpoint is known to strictly require the account header
     if (endpoint === '/assignmentlist' || endpoint === '/') { 
        console.warn(`authedFetch: accountName is missing or empty for endpoint: ${endpoint}. The 'account' header will not be set.`);
     }
  }

  // TEMPORARY DEBUG LOGGING:
  console.log(`[TEMP DEBUG] authedFetch to endpoint: ${BASE_URL}${endpoint}`);
  console.log(`[TEMP DEBUG] Using token: ${token ? 'Exists (not logging full token for security)' : 'MISSING'}`);
  console.log(`[TEMP DEBUG] Account name for 'account' header: '${trimmedAccountName || 'Not Provided'}'`);
  const headersObjectForLogging: Record<string, string> = {};
  headers.forEach((value, key) => {
    // For security, avoid logging the full Authorization token.
    if (key.toLowerCase() === 'authorization' && value.toLowerCase().startsWith('bearer ')) {
      headersObjectForLogging[key] = 'Bearer [REDACTED]';
    } else {
      headersObjectForLogging[key] = value;
    }
  });
  console.log(`[TEMP DEBUG] Final headers being sent:`, headersObjectForLogging);


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
      // If response is not JSON, use statusText
      errorData = { message: response.statusText || `HTTP error ${response.status}` };
    }
    console.error(`API Error ${response.status} for ${endpoint}:`, errorData);
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
    // Handle cases where response might be text but expected as JSON by the caller
    const textResponse = await response.text();
    if (textResponse) {
      console.warn(`authedFetch: Response from ${endpoint} was not JSON (Content-Type: ${contentType}). Body: "${textResponse.substring(0,100)}..."`);
      // Attempt to parse if it looks like JSON, to handle cases where content-type might be wrong
      if ((textResponse.startsWith('{') && textResponse.endsWith('}')) || (textResponse.startsWith('[') && textResponse.endsWith(']'))) {
        try {
          return JSON.parse(textResponse) as T;
        } catch (e) {
           console.error(`authedFetch: Failed to parse non-JSON text response from ${endpoint} as JSON despite structure match. Error: ${e}`);
           // Depending on T, you might want to throw or return textResponse as any
        }
      }
      // If T is expected to be string, this is fine. Otherwise, it could lead to type issues.
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
  if (!accountName || accountName.trim() === '') {
     throw new Error('Account name is required and cannot be empty to fetch assignments.');
  }
  const result = await authedFetch<FullAssignment[] | undefined>('/', {}, accountName);
  return result || []; 
}

/**
 * 2. GET /assignmentlist
 * Returns metadata for all assignments tied to an account.
 * Account name is passed in the 'account' header.
 */
export async function getAssignmentListMetadata(accountName: string): Promise<AssignmentMetadata[]> {
  if (!accountName || accountName.trim() === '') {
     throw new Error('Account name is required and cannot be empty to fetch assignment list.');
  }
  const result = await authedFetch<AssignmentMetadata[] | undefined>('/assignmentlist', {}, accountName);
  return result || [];
}

/**
 * 16. GET /:id
 * Returns a full assignment by ID including permissions logic.
 * Account name ('account' header) might be needed for permission checks.
 */
export async function getAssignmentById(id: string, accountName?: string): Promise<AssignmentWithPermissions | null> {
  if (!id) throw new Error('Assignment ID is required.');
  const result = await authedFetch<AssignmentWithPermissions | undefined>(`/${id}`, {}, accountName);
  return result || null; 
}

/**
 * 18. POST /createassignment
 * Body: Full assignment object + content array
 * Account name ('account' header) might be needed.
 */
export async function createAssignment(payload: CreateAssignmentPayload, accountName?: string): Promise<FullAssignment> { 
  return authedFetch<FullAssignment>('/createassignment', {
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
  await authedFetch<void>(`/${id}`, { 
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
  await authedFetch<void>(`/${id}`, { 
    method: 'DELETE',
  }, accountName);
}

/**
 * 17. PUT /completed/:id (multipart form-data)
 * Uploads a completed assignment. Supports image uploads.
 * Account name ('account' header) might be needed.
 */
export async function submitCompletedAssignment(id: string, formData: FormData, accountName?: string): Promise<CompletedAssignmentResponse> {
  if (!id) throw new Error('Assignment ID is required.');
  return authedFetch<CompletedAssignmentResponse>(`/completed/${id}`, {
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
   if (!accountName || accountName.trim() === '') {
     throw new Error('Account name is required and cannot be empty for getMyAssignments.');
  }
  const endpoint = userEmail ? `/tome/${encodeURIComponent(userEmail)}` : '/tome';
  const result = await authedFetch<AssignmentMetadata[] | undefined>(endpoint, {}, accountName);
  return result || [];
}

/**
 * 11. POST /bylocation
 * Body: { location: string } - This 'location' is the filter criteria.
 * The account header ('account': accountName) is still needed for auth/context.
 */
export async function getAssignmentsByLocation(payload: ByLocationPayload, accountName: string): Promise<FullAssignment[]> {
    if (!accountName || accountName.trim() === '') {
     throw new Error('Account name is required and cannot be empty for getAssignmentsByLocation.');
    }
    const result = await authedFetch<FullAssignment[] | undefined>('/bylocation', {
        method: 'POST',
        body: JSON.stringify(payload),
    }, accountName); 
    return result || [];
}


/**
 * 6. GET /header/:lat/:lng
 * Returns current weather + reverse-geolocation for user’s location.
 * Account header may or may not be needed depending on backend.
 */
export async function getWeatherAndLocation(lat: number, lng: number, accountName?: string): Promise<WeatherLocationData | null> {
    const result = await authedFetch<WeatherLocationData | undefined>(`/header/${lat}/${lng}`, {}, accountName); 
    return result || null;
}

/**
 * 10. GET /types
 * Returns hardcoded list of assignment types.
 * Account header may or may not be needed depending on backend.
 */
export async function getAssignmentTypes(accountName?: string): Promise<string[]> {
  const result = await authedFetch<string[] | undefined>('/types', {}, accountName);
  return result || [];
}

/**
 * 3. GET /questionsbyschool/:assignmentId/:period
 * Account header is likely needed.
 */
export async function getQuestionsBySchool(assignmentId: string, period: string, accountName: string): Promise<QuestionsBySchoolResponse | null> {
  if (!accountName || accountName.trim() === '') {
     throw new Error('Account name is required and cannot be empty for getQuestionsBySchool.');
  }
  if (!assignmentId || !period) throw new Error('Assignment ID and period are required.');
  const result = await authedFetch<QuestionsBySchoolResponse | undefined>(`/questionsbyschool/${assignmentId}/${period}`, {}, accountName);
  return result || null;
}

/**
 * 4. GET /schoolswithquestions/:assignmentId/:period
 * Account header is likely needed.
 */
export async function getSchoolsWithQuestions(assignmentId: string, period: string, accountName: string): Promise<SchoolsWithQuestionsResponse | null> {
  if (!accountName || accountName.trim() === '') {
     throw new Error('Account name is required and cannot be empty for getSchoolsWithQuestions.');
  }
  if (!assignmentId || !period) throw new Error('Assignment ID and period are required.');
  const result = await authedFetch<SchoolsWithQuestionsResponse | undefined>(`/schoolswithquestions/${assignmentId}/${period}`, {}, accountName);
  return result || null;
}

/**
 * 5. GET /dailysnapshot
 * Account header is likely needed.
 */
export async function getDailySnapshot(accountName: string): Promise<DailySnapshotResponse | null> {
  if (!accountName || accountName.trim() === '') {
     throw new Error('Account name is required and cannot be empty for getDailySnapshot.');
  }
  const result = await authedFetch<DailySnapshotResponse | undefined>('/dailysnapshot', {}, accountName);
  return result || null;
}

/**
 * 8. GET /dailysitesnapshot/tome/:userEmail
 * Account header is likely needed.
 */
export async function getDailySiteSnapshotForUser(userEmail: string, accountName: string): Promise<AssignmentMetadata | null> {
  if (!accountName || accountName.trim() === '') {
     throw new Error('Account name is required and cannot be empty for getDailySiteSnapshotForUser.');
  }
  if (!userEmail) throw new Error('User email is required.');
  const result = await authedFetch<AssignmentMetadata | undefined>(`/dailysitesnapshot/tome/${encodeURIComponent(userEmail)}`, {}, accountName);
  return result || null;
}

/**
 * 9. GET /dailysnapshot/:id/:period
 * Account header is likely needed.
 */
export async function getDailySnapshotByIdAndPeriod(id: string, period: string, accountName: string): Promise<DailySnapshotResponse | null> {
  if (!accountName || accountName.trim() === '') {
     throw new Error('Account name is required and cannot be empty for getDailySnapshotByIdAndPeriod.');
  }
  if (!id || !period) throw new Error('Assignment ID and period are required.');
  const result = await authedFetch<DailySnapshotResponse | undefined>(`/dailysnapshot/${id}/${period}`, {}, accountName);
  return result || null;
}

/**
 * 12. GET /assignedTo/:userEmail
 * Account header is likely needed.
 */
export async function getAssignedToUser(userEmail: string, accountName: string): Promise<AssignedToUserResponse> {
  if (!accountName || accountName.trim() === '') {
     throw new Error('Account name is required and cannot be empty for getAssignedToUser.');
  }
  if (!userEmail) throw new Error('User email is required.');
  const result = await authedFetch<AssignedToUserResponse | undefined>(`/assignedTo/${encodeURIComponent(userEmail)}`, {}, accountName);
  return result || [];
}

/**
 * 13. GET /author/:userId
 * Account header is likely needed.
 */
export async function getAssignmentsByAuthor(userId: string, accountName: string): Promise<AssignmentMetadata[]> {
  if (!accountName || accountName.trim() === '') {
     throw new Error('Account name is required and cannot be empty for getAssignmentsByAuthor.');
  }
  if (!userId) throw new Error('User ID is required.');
  const result = await authedFetch<AssignmentMetadata[] | undefined>(`/author/${userId}`, {}, accountName);
  return result || [];
}

/**
 * 14. GET /completedByMe
 * Account header is likely needed.
 */
export async function getAssignmentsCompletedByMe(accountName: string): Promise<CompletedByMeResponse | null> {
  if (!accountName || accountName.trim() === '') {
     throw new Error('Account name is required and cannot be empty for getAssignmentsCompletedByMe.');
  }
  const result = await authedFetch<CompletedByMeResponse | undefined>('/completedByMe', {}, accountName);
  return result || null;
}

/**
 * 15. GET /widgets/trends
 * Account header is likely needed.
 */
export async function getWidgetTrends(accountName: string): Promise<TrendsResponse | null> {
  if (!accountName || accountName.trim() === '') {
     throw new Error('Account name is required and cannot be empty for getWidgetTrends.');
  }
  const result = await authedFetch<TrendsResponse | undefined>('/widgets/trends', {}, accountName);
  return result || null;
}

/**
 * 19. POST /save_data/:id (multipart form-data)
 * Account header may or may not be needed.
 */
export async function saveDataCsv(id: string, csvFormData: FormData, accountName?: string): Promise<SaveDataResponse> {
  if (!id) throw new Error('ID is required.');
  return authedFetch<SaveDataResponse>(`/save_data/${id}`, {
    method: 'POST',
    body: csvFormData, // Content-Type will be set by browser for FormData
  }, accountName);
}

/**
 * 20. GET /pending/:id
 * Account header is likely needed.
 */
export async function getPendingSubmissions(id: string, accountName: string): Promise<PendingAssignmentsResponse> {
  if (!accountName || accountName.trim() === '') {
     throw new Error('Account name is required and cannot be empty for getPendingSubmissions.');
  }
  if (!id) throw new Error('ID is required for pending submissions.'); 
  const result = await authedFetch<PendingAssignmentsResponse | undefined>(`/pending/${id}`, {}, accountName);
  return result || [];
}

/**
 * 21. POST /pending/:assignmentId
 * Account header is likely needed.
 */
export async function savePendingSubmission(assignmentId: string, payload: DraftAssignmentPayload, accountName: string): Promise<PostPendingResponse> {
  if (!accountName || accountName.trim() === '') {
     throw new Error('Account name is required and cannot be empty for savePendingSubmission.');
  }
  if (!assignmentId) throw new Error('Assignment ID is required.');
  return authedFetch<PostPendingResponse>(`/pending/${assignmentId}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }, accountName);
}

    