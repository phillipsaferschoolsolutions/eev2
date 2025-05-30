
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
    return currentUser.getIdToken();
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
  }
  if (accountName) { 
    headers.set('account', accountName); 
  }

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
  if (response.status === 204) { 
    return undefined as any as T;
  }
  if (contentType && contentType.indexOf("application/json") !== -1) {
    return response.json() as Promise<T>;
  } else {
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
  if (!accountName) throw new Error('Account name is required to fetch assignments.');
  // Explicitly type what authedFetch might return based on its implementation for 204/non-JSON success
  const result = await authedFetch<FullAssignment[] | undefined>('/', {}, accountName);
  return result || []; // Ensure an array is always returned, fulfilling the Promise<FullAssignment[]>
}

/**
 * 2. GET /assignmentlist
 * Returns metadata for all assignments tied to an account.
 * Account name is passed in the 'account' header.
 */
export async function getAssignmentListMetadata(accountName: string): Promise<AssignmentMetadata[]> {
  if (!accountName) throw new Error('Account name is required to fetch assignment list.');
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
  return result || null; // Return null if not found or no content
}

/**
 * 18. POST /createassignment
 * Body: Full assignment object + content array
 * Account name ('account' header) might be needed.
 */
export async function createAssignment(payload: CreateAssignmentPayload, accountName?: string): Promise<FullAssignment> { 
  // Assuming create always returns the full assignment or throws error
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
  await authedFetch<void>(`/${id}`, { // void for 200 OK no body expected by default
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
  await authedFetch<void>(`/${id}`, { // void for 200 OK no body
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
  // Assuming this endpoint returns JSON
  return authedFetch<CompletedAssignmentResponse>(`/completed/${id}`, {
    method: 'PUT',
    body: formData,
  }, accountName);
}

/**
 * 7. GET /tome OR /tome/:userEmail
 * Gets assignments assigned to the current or specified user. 
 * Account name ('account' header) might be needed for context.
 */
export async function getMyAssignments(accountName: string, userEmail?: string): Promise<AssignmentMetadata[]> {
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
    const result = await authedFetch<FullAssignment[] | undefined>('/bylocation', {
        method: 'POST',
        body: JSON.stringify(payload),
    }, accountName); 
    return result || [];
}


/**
 * 6. GET /header/:lat/:lng
 * Returns current weather + reverse-geolocation for user’s location.
 */
export async function getWeatherAndLocation(lat: number, lng: number, accountName?: string): Promise<WeatherLocationData | null> {
    const result = await authedFetch<WeatherLocationData | undefined>(`/header/${lat}/${lng}`, {}, accountName); 
    return result || null;
}

/**
 * 10. GET /types
 * Returns hardcoded list of assignment types.
 */
export async function getAssignmentTypes(accountName?: string): Promise<string[]> {
  const result = await authedFetch<string[] | undefined>('/types', {}, accountName);
  return result || [];
}

/**
 * 3. GET /questionsbyschool/:assignmentId/:period
 */
export async function getQuestionsBySchool(assignmentId: string, period: string, accountName: string): Promise<QuestionsBySchoolResponse | null> {
  if (!assignmentId || !period) throw new Error('Assignment ID and period are required.');
  const result = await authedFetch<QuestionsBySchoolResponse | undefined>(`/questionsbyschool/${assignmentId}/${period}`, {}, accountName);
  return result || null;
}

/**
 * 4. GET /schoolswithquestions/:assignmentId/:period
 */
export async function getSchoolsWithQuestions(assignmentId: string, period: string, accountName: string): Promise<SchoolsWithQuestionsResponse | null> {
  if (!assignmentId || !period) throw new Error('Assignment ID and period are required.');
  const result = await authedFetch<SchoolsWithQuestionsResponse | undefined>(`/schoolswithquestions/${assignmentId}/${period}`, {}, accountName);
  return result || null;
}

/**
 * 5. GET /dailysnapshot
 */
export async function getDailySnapshot(accountName: string): Promise<DailySnapshotResponse | null> {
  const result = await authedFetch<DailySnapshotResponse | undefined>('/dailysnapshot', {}, accountName);
  return result || null;
}

/**
 * 8. GET /dailysitesnapshot/tome/:userEmail
 */
export async function getDailySiteSnapshotForUser(userEmail: string, accountName: string): Promise<AssignmentMetadata | null> {
  if (!userEmail) throw new Error('User email is required.');
  const result = await authedFetch<AssignmentMetadata | undefined>(`/dailysitesnapshot/tome/${encodeURIComponent(userEmail)}`, {}, accountName);
  return result || null;
}

/**
 * 9. GET /dailysnapshot/:id/:period
 */
export async function getDailySnapshotByIdAndPeriod(id: string, period: string, accountName: string): Promise<DailySnapshotResponse | null> {
  if (!id || !period) throw new Error('Assignment ID and period are required.');
  const result = await authedFetch<DailySnapshotResponse | undefined>(`/dailysnapshot/${id}/${period}`, {}, accountName);
  return result || null;
}

/**
 * 12. GET /assignedTo/:userEmail
 */
export async function getAssignedToUser(userEmail: string, accountName: string): Promise<AssignedToUserResponse> {
  if (!userEmail) throw new Error('User email is required.');
  const result = await authedFetch<AssignedToUserResponse | undefined>(`/assignedTo/${encodeURIComponent(userEmail)}`, {}, accountName);
  return result || [];
}

/**
 * 13. GET /author/:userId
 */
export async function getAssignmentsByAuthor(userId: string, accountName: string): Promise<AssignmentMetadata[]> {
  if (!userId) throw new Error('User ID is required.');
  const result = await authedFetch<AssignmentMetadata[] | undefined>(`/author/${userId}`, {}, accountName);
  return result || [];
}

/**
 * 14. GET /completedByMe
 */
export async function getAssignmentsCompletedByMe(accountName: string): Promise<CompletedByMeResponse | null> {
  const result = await authedFetch<CompletedByMeResponse | undefined>('/completedByMe', {}, accountName);
  return result || null; // Or { completedAssignments: [] } if an empty object is preferred over null
}

/**
 * 15. GET /widgets/trends
 */
export async function getWidgetTrends(accountName: string): Promise<TrendsResponse | null> {
  const result = await authedFetch<TrendsResponse | undefined>('/widgets/trends', {}, accountName);
  return result || null;
}

/**
 * 19. POST /save_data/:id (multipart form-data)
 */
export async function saveDataCsv(id: string, csvFormData: FormData, accountName?: string): Promise<SaveDataResponse> {
  if (!id) throw new Error('ID is required.');
  return authedFetch<SaveDataResponse>(`/save_data/${id}`, {
    method: 'POST',
    body: csvFormData,
  }, accountName);
}

/**
 * 20. GET /pending/:id
 */
export async function getPendingSubmissions(id: string, accountName: string): Promise<PendingAssignmentsResponse> {
  if (!id) throw new Error('ID is required for pending submissions.'); 
  const result = await authedFetch<PendingAssignmentsResponse | undefined>(`/pending/${id}`, {}, accountName);
  return result || [];
}

/**
 * 21. POST /pending/:assignmentId
 */
export async function savePendingSubmission(assignmentId: string, payload: DraftAssignmentPayload, accountName?: string): Promise<PostPendingResponse> {
  if (!assignmentId) throw new Error('Assignment ID is required.');
  return authedFetch<PostPendingResponse>(`/pending/${assignmentId}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }, accountName);
}
