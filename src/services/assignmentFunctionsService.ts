
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
    headers.set('account', accountName); // Changed header name to 'account'
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
    // For non-JSON responses (like 200 OK for DELETE/PUT with no body), 
    // return a success marker or handle as appropriate.
    // For now, returning undefined for non-JSON success, adjust if specific functions expect other types.
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
  return authedFetch<FullAssignment[]>('/', {}, accountName);
}

/**
 * 2. GET /assignmentlist
 * Returns metadata for all assignments tied to an account.
 * Account name is passed in the 'account' header.
 */
export async function getAssignmentListMetadata(accountName: string): Promise<AssignmentMetadata[]> {
  if (!accountName) throw new Error('Account name is required to fetch assignment list.');
  return authedFetch<AssignmentMetadata[]>('/assignmentlist', {}, accountName);
}

/**
 * 16. GET /:id
 * Returns a full assignment by ID including permissions logic.
 * Account name ('account' header) might be needed for permission checks.
 */
export async function getAssignmentById(id: string, accountName?: string): Promise<AssignmentWithPermissions> {
  if (!id) throw new Error('Assignment ID is required.');
  return authedFetch<AssignmentWithPermissions>(`/${id}`, {}, accountName);
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
  return authedFetch<AssignmentMetadata[]>(endpoint, {}, accountName);
}

/**
 * 11. POST /bylocation
 * Body: { location: string } - This 'location' is the filter criteria.
 * The account header ('account': accountName) is still needed for auth/context.
 */
export async function getAssignmentsByLocation(payload: ByLocationPayload, accountName: string): Promise<FullAssignment[]> {
    return authedFetch<FullAssignment[]>('/bylocation', {
        method: 'POST',
        body: JSON.stringify(payload),
    }, accountName); 
}


/**
 * 6. GET /header/:lat/:lng
 * Returns current weather + reverse-geolocation for user’s location.
 * Account header ('account') might not be needed if this is a general utility endpoint. Assuming not for now.
 */
export async function getWeatherAndLocation(lat: number, lng: number, accountName?: string): Promise<WeatherLocationData> {
    return authedFetch<WeatherLocationData>(`/header/${lat}/${lng}`, {}, accountName); 
}

/**
 * 10. GET /types
 * Returns hardcoded list of assignment types.
 * Account name ('account' header) might be needed.
 */
export async function getAssignmentTypes(accountName?: string): Promise<string[]> {
  return authedFetch<string[]>('/types', {}, accountName);
}

/**
 * 3. GET /questionsbyschool/:assignmentId/:period
 * Account name ('account' header) needed.
 */
export async function getQuestionsBySchool(assignmentId: string, period: string, accountName: string): Promise<QuestionsBySchoolResponse> {
  if (!assignmentId || !period) throw new Error('Assignment ID and period are required.');
  return authedFetch<QuestionsBySchoolResponse>(`/questionsbyschool/${assignmentId}/${period}`, {}, accountName);
}

/**
 * 4. GET /schoolswithquestions/:assignmentId/:period
 * Account name ('account' header) needed.
 */
export async function getSchoolsWithQuestions(assignmentId: string, period: string, accountName: string): Promise<SchoolsWithQuestionsResponse> {
  if (!assignmentId || !period) throw new Error('Assignment ID and period are required.');
  return authedFetch<SchoolsWithQuestionsResponse>(`/schoolswithquestions/${assignmentId}/${period}`, {}, accountName);
}

/**
 * 5. GET /dailysnapshot
 * Account name ('account' header) needed.
 */
export async function getDailySnapshot(accountName: string): Promise<DailySnapshotResponse> {
  return authedFetch<DailySnapshotResponse>('/dailysnapshot', {}, accountName);
}

/**
 * 8. GET /dailysitesnapshot/tome/:userEmail
 * Account name ('account' header) needed.
 */
export async function getDailySiteSnapshotForUser(userEmail: string, accountName: string): Promise<AssignmentMetadata> {
  if (!userEmail) throw new Error('User email is required.');
  return authedFetch<AssignmentMetadata>(`/dailysitesnapshot/tome/${encodeURIComponent(userEmail)}`, {}, accountName);
}

/**
 * 9. GET /dailysnapshot/:id/:period
 * Account name ('account' header) needed.
 */
export async function getDailySnapshotByIdAndPeriod(id: string, period: string, accountName: string): Promise<DailySnapshotResponse> {
  if (!id || !period) throw new Error('Assignment ID and period are required.');
  return authedFetch<DailySnapshotResponse>(`/dailysnapshot/${id}/${period}`, {}, accountName);
}

/**
 * 12. GET /assignedTo/:userEmail
 * Account name ('account' header) needed.
 */
export async function getAssignedToUser(userEmail: string, accountName: string): Promise<AssignedToUserResponse> {
  if (!userEmail) throw new Error('User email is required.');
  return authedFetch<AssignedToUserResponse>(`/assignedTo/${encodeURIComponent(userEmail)}`, {}, accountName);
}

/**
 * 13. GET /author/:userId
 * Account name ('account' header) needed.
 */
export async function getAssignmentsByAuthor(userId: string, accountName: string): Promise<AssignmentMetadata[]> {
  if (!userId) throw new Error('User ID is required.');
  return authedFetch<AssignmentMetadata[]>(`/author/${userId}`, {}, accountName);
}

/**
 * 14. GET /completedByMe
 * Account name ('account' header) needed.
 */
export async function getAssignmentsCompletedByMe(accountName: string): Promise<CompletedByMeResponse> {
  return authedFetch<CompletedByMeResponse>('/completedByMe', {}, accountName);
}

/**
 * 15. GET /widgets/trends
 * Account name ('account' header) needed.
 */
export async function getWidgetTrends(accountName: string): Promise<TrendsResponse> {
  return authedFetch<TrendsResponse>('/widgets/trends', {}, accountName);
}

/**
 * 19. POST /save_data/:id (multipart form-data)
 * Account name ('account' header) might be needed.
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
 * Account name ('account' header) needed.
 */
export async function getPendingSubmissions(id: string, accountName: string): Promise<PendingAssignmentsResponse> {
  if (!id) throw new Error('ID is required for pending submissions.'); 
  return authedFetch<PendingAssignmentsResponse>(`/pending/${id}`, {}, accountName);
}

/**
 * 21. POST /pending/:assignmentId
 * Account name ('account' header) might be needed.
 */
export async function savePendingSubmission(assignmentId: string, payload: DraftAssignmentPayload, accountName?: string): Promise<PostPendingResponse> {
  if (!assignmentId) throw new Error('Assignment ID is required.');
  return authedFetch<PostPendingResponse>(`/pending/${assignmentId}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }, accountName);
}

// Placeholder for function 24 if needed
// export async function someOtherFunction(...) { ... }
