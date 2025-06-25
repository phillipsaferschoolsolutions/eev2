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
  deficiencyLabel?: string; // Description of what a deficiency means for this question
  deficiencyValues?: string[]; // For closed-ended: specific option values that are deficiencies
  aiDeficiencyCheck?: boolean; // For open-ended: flag to use AI to check for deficiency
  criticality?: 'low' | 'medium' | 'high';
  // Placeholder for future per-question assignment
  assignedTo?: {
    users?: string[]; // User IDs or emails
    sites?: string[]; // Site IDs or names
    jobTitles?: string[];
  };
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
  createdDate?: string; // Added based on details page
}

interface AssignmentContentItem { // This was an earlier, simpler version. We'll use AssignmentQuestion.
  questionId: string;
  questionLabel: string;
  type: string;
  options?: string[];
  deficiency?: string;
}

export interface FullAssignment extends AssignmentField {
  questions: AssignmentQuestion[]; // Standardized to 'questions'
}

export interface AssignmentMetadata extends AssignmentField {
  // Currently same as AssignmentField, can be expanded if metadata differs more
}

// Updated to reflect that 'questions' is an array of detailed AssignmentQuestion objects
export interface AssignmentWithPermissions extends AssignmentField {
  questions: AssignmentQuestion[];
  schoolSelectorId?: string; // Ensure this is part of the type
  completionDateId?: string; // Ensure this is part of the type
  completionTimeId?: string; // Ensure this is part of the type
}

interface CreateAssignmentPayload {
  assessmentName: string;
  assignmentType?: string;
  description?: string;
  questions: AssignmentQuestion[]; // Standardized to 'questions'
  accountSubmittedFor?: string;
  schoolSelectorId?: string; // Added to link the assignment to a location
}

// This payload will now accept a partial FullAssignment, allowing questions to be updated.
export type UpdateAssignmentPayload = Partial<FullAssignment>;


export interface CompletedAssignmentResponse {
  assignmentId: string;
  documentId: string;
  message: string;
}

export interface ByLocationPayload { location: string }

export interface WeatherLocationData {
    name: string;
    current?: {
      temp: number;
      feels_like?: number;
      uvi?: number;
      sunrise?: number;
      sunset?: number;
      weather?: { description: string; icon?: string }[];
      wind_speed: number;
      humidity: number;
    };
    main?: { // Added to match a potential structure from OpenWeatherMap
        temp: number;
        feels_like: number;
        humidity: number;
    };
    wind?: { // Added for consistency
        speed: number;
    };
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
  // Key is schoolName (or a location identifier)
  [schoolName: string]: {
    // Key is questionId
    [questionId: string]: SchoolQuestionAnswers;
  };
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

export interface SaveDataResponse {
  message: string;
}

export interface PendingAssignment {
  [key: string]: any;
}
export type PendingAssignmentsResponse = PendingAssignment[];

export interface DraftAssignmentPayload {
  assessmentName?: string;
  questions?: AssignmentQuestion[]; // Standardized to 'questions'
  [key: string]: any;
}
export interface PostPendingResponse {
  message: string;
}


const BASE_URL = 'https://us-central1-webmvp-5b733.cloudfunctions.net/assignments';
const ASSIGNMENTS_V2_BASE_URL = 'https://us-central1-webmvp-5b733.cloudfunctions.net/assignmentsv2';
const WIDGETS_BASE_URL = 'https://us-central1-webmvp-5b733.cloudfunctions.net/widgets'; // Use this for weather

// --- Helper to get ID Token ---
async function getIdToken(): Promise<string> {
    return new Promise((resolve, reject) => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            unsubscribe(); // Unsubscribe to avoid memory leaks
            if (user) {
                try {
                    const token = await user.getIdToken(true); // Force refresh
                    resolve(token);
                } catch (error) {
                    console.error("Error getting ID token:", error);
                    reject(new Error("Could not get Firebase ID token."));
                }
            } else {
                console.error("No user is authenticated.");
                reject(new Error("User not authenticated."));
            }
        });
    });
}

// --- Helper to get accountName from localStorage, with polling ---
async function getAccountName(): Promise<string> {
    const POLL_INTERVAL = 100; // ms
    const MAX_WAIT_TIME = 3000; // ms
    let totalWaitTime = 0;

    return new Promise((resolve, reject) => {
        const intervalId = setInterval(() => {
            const accountName = localStorage.getItem('accountName');
            if (accountName) {
                clearInterval(intervalId);
                resolve(accountName);
            } else {
                totalWaitTime += POLL_INTERVAL;
                if (totalWaitTime >= MAX_WAIT_TIME) {
                    clearInterval(intervalId);
                    reject(new Error("accountName not found in localStorage after 3 seconds."));
                }
            }
        }, POLL_INTERVAL);
    });
}


// --- Generic Fetch Wrapper ---
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

// --- API Service Functions ---

/**
 * 1. GET /
 * Returns full assignment content for a given account.
 */
export async function getAllAssignmentsWithContent(): Promise<FullAssignment[]> {
  const result = await authedFetch<FullAssignment[] | undefined>(`${BASE_URL}/`);
  return result || [];
}

/**
 * 2. GET /assignmentlist
 * Returns metadata for all assignments tied to an account.
 */
export async function getAssignmentListMetadata(): Promise<AssignmentMetadata[]> {
  // CORRECTED: Explicitly define the full, correct URL for the original service
  const url = `${BASE_URL}/assignmentlist`;

  const result = await authedFetch<AssignmentMetadata[] | undefined>(url);
  return result || [];
}


/**
 * 16. GET /:id
 * Returns a full assignment by ID including permissions logic.
 */
export async function getAssignmentById(id: string, accountName: string): Promise<AssignmentWithPermissions | null> {
  if (!id) throw new Error('Assignment ID is required.');
  // CORRECTED: Ensure this function uses ASSIGNMENTS_V2_BASE_URL
  const url = `${ASSIGNMENTS_V2_BASE_URL}/${id}`;
  const result = await authedFetch<AssignmentWithPermissions | undefined>(url);
  return result || null;
}


/**
 * 18. POST /createassignment
 * Body: Full assignment object + questions array
 */
export async function createAssignment(payload: CreateAssignmentPayload, accountName: string): Promise<FullAssignment> {
   if (!accountName || accountName.trim() === "") {
    throw new Error("Account name is required for createAssignment.");
  }
  // Ensure accountSubmittedFor is present in payload, or set it from accountName
  const finalPayload = {
    ...payload,
    accountSubmittedFor: payload.accountSubmittedFor || accountName,
  };

  return authedFetch<FullAssignment>(`${ASSIGNMENTS_V2_BASE_URL}/createassignment`, { // Using V2 endpoint
    method: 'POST',
    body: JSON.stringify(finalPayload),
  });
}

/**
 * 22. PUT /:id
 * Updates an existing assignment. Body: Partial FullAssignment object (can include questions). Returns 200 OK.
 */
export async function updateAssignment(id: string, payload: UpdateAssignmentPayload, accountName: string): Promise<void> {
  if (!id) throw new Error('Assignment ID is required.');
   if (!accountName || accountName.trim() === "") {
    throw new Error("Account name is required for updateAssignment.");
  }
  // Ensure accountSubmittedFor is part of the payload if the backend needs it for updates
  const finalPayload = {
    ...payload,
    accountSubmittedFor: payload.accountSubmittedFor || accountName,
  };
  await authedFetch<void>(`${ASSIGNMENTS_V2_BASE_URL}/${id}`, { // Using V2 endpoint
    method: 'PUT',
    body: JSON.stringify(finalPayload), // Send the updated questions array here
  });
}

/**
 * 23. DELETE /:id
 * Deletes an assignment by ID. Returns 200 OK.
 */
export async function deleteAssignment(id: string, accountName: string): Promise<void> {
  if (!id) throw new Error('Assignment ID is required.');
  if (!accountName || accountName.trim() === "") {
    throw new Error("Account name is required for deleteAssignment.");
  }
  await authedFetch<void>(`${BASE_URL}/${id}`, {
    method: 'DELETE',
  });
}

/**
 * SUBMIT COMPLETED: PUT /completed/:id (multipart form-data)
 * Uploads a completed assignment.
 * Uses ASSIGNMENTS_V2_BASE_URL for this specific endpoint.
 */
export async function submitCompletedAssignment(
  assignmentDocId: string,
  formDataPayload: FormData,
  accountName: string // Added accountName for the 'account' header
): Promise<CompletedAssignmentResponse> {
  if (!assignmentDocId) throw new Error('Assignment document ID is required.');
  if (!accountName || accountName.trim() === "") {
    throw new Error("Account name is required for submitCompletedAssignment.");
  }
  return authedFetch<CompletedAssignmentResponse>(`${ASSIGNMENTS_V2_BASE_URL}/completed/${assignmentDocId}`, {
    method: 'PUT',
    body: formDataPayload,
  });
}

/**
 * Saves a draft of a completed assignment.
 * @param assignmentId The ID of the assignment being drafted.
 * @param draftData The data to be saved as a draft.
 * @param accountName The account associated with this action.
 * @returns A promise that resolves with the server's response.
 */
export async function saveAssignmentDraft(assignmentId: string, draftData: any, accountName: string): Promise<any> {
  if (!assignmentId) {
    throw new Error("Assignment ID is required to save a draft.");
  }
  if (!accountName) {
    throw new Error("Account name is required to save a draft.");
  }

  // We'll use a new endpoint for drafts, e.g., /assignments/draft/:id
  // This will be a PUT request to update or create the draft.
  const url = `${ASSIGNMENTS_V2_BASE_URL}/draft/${assignmentId}`;

  return authedFetch<any>(url, {
    method: 'PUT',
    body: JSON.stringify(draftData),
  });
}

/**
 * Gets all saved drafts for the current user.
 * @param accountName The account associated with this action.
 * @returns A promise that resolves to an array of draft objects.
 */
export async function getMyDrafts(accountName: string): Promise<any[]> {
  if (!accountName) {
    throw new Error("Account name is required to get drafts.");
  }

  // This will call a new endpoint to list all of a user's drafts
  const url = `${ASSIGNMENTS_V2_BASE_URL}/drafts`; 

  const result = await authedFetch<any[]>(url, {
    method: 'GET',
  });
  return result || [];
}

/**
 * Deletes a specific assignment draft for the current user.
 * @param assignmentId The ID of the parent assignment.
 * @param draftId The ID of the draft document in the 'pending' subcollection.
 * @param accountName The account associated with this action.
 * @returns A promise that resolves when the deletion is successful.
 */
export async function deleteAssignmentDraft(assignmentId: string, draftId: string, accountName: string): Promise<void> {
  if (!assignmentId || !draftId) {
    throw new Error("Both Assignment ID and Draft ID are required to delete a draft.");
  }
  if (!accountName) {
    throw new Error("Account name is required to delete a draft.");
  }

  // This will call a new endpoint to delete a specific draft
  const url = `${ASSIGNMENTS_V2_BASE_URL}/draft/${assignmentId}/${draftId}`;

  return authedFetch<void>(url, {
    method: 'DELETE',
  });
}

/**
 * Gets a specific assignment draft for the current user.
 * @param assignmentId The ID of the assignment to get the draft for.
 * @param accountName The account associated with this action.
 * @returns A promise that resolves to the draft data object or null if not found.
 */
export async function getAssignmentDraft(assignmentId: string, accountName: string): Promise<any | null> {
  if (!assignmentId) {
    throw new Error("Assignment ID is required to get a draft.");
  }
  if (!accountName) {
    throw new Error("Account name is required to get a draft.");
  }

  const url = `${ASSIGNMENTS_V2_BASE_URL}/draft/${assignmentId}`;

  try {
    const token = await getIdToken();
    const headers = new Headers();
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }
    if (accountName) {
        headers.set('account', accountName);
    }
    
    // Perform the fetch call directly here to inspect the response object
    const response = await fetch(url, {
      method: 'GET',
      headers: headers,
    });
    
    // GRACEFUL HANDLING: If a 404 is received, it's not an error, it just means no draft exists.
    if (response.status === 404) {
      console.log(`No draft found for assignment ${assignmentId}, which is a normal case.`);
      return null;
    }

    // If there's another type of error, throw it so it can be caught below.
    if (!response.ok) {
        const errorData = await response.text();
        console.error(`API Error ${response.status} for ${url}:`, errorData);
        throw new Error(`API Error: ${response.status} ${errorData || response.statusText}`);
    }

    // If the response is OK, parse and return the JSON.
    return await response.json();

  } catch (error) {
    // This will now only catch server errors or other unexpected issues
    console.error("An unexpected error occurred while fetching assignment draft:", error);
    // Re-throw so the UI can be notified of a real problem
    throw error;
  }
}


/**
 * Gets the details of a specific assignment completion.
 * @param assignmentId The ID of the parent assignment.
 * @param completionId The ID of the completion document.
 * @param accountName The account associated with this action.
 * @returns A promise that resolves to the completion data object.
 */
export async function getCompletionDetails(assignmentId: string, completionId: string, accountName: string): Promise<any> {
  if (!assignmentId || !completionId) {
    throw new Error("Both Assignment ID and Completion ID are required.");
  }
  if (!accountName) {
    throw new Error("Account name is required.");
  }

  // This will call a new endpoint to get a specific completion
  const url = `${ASSIGNMENTS_V2_BASE_URL}/${assignmentId}/completions/${completionId}`;

  const result = await authedFetch<any>(url, {
    method: 'GET',
  });
  return result;
}

/**
 * Fetches the most recent completions based on specified filters.
 * @param accountId The account to filter completions by.
 * @param assignmentId Optional. The specific assignment ID to filter by.
 * @param selectedSchool The school to filter completions by.
 * @param period The time period to look back for completions.
 * @returns A promise that resolves to an array of completion objects.
 */
export async function getLastCompletions(
  accountId: string, 
  assignmentId: string | null, 
  selectedSchool: string | null, // Allow null for "All Schools"
  period: string
): Promise<any[]> {
  if (!accountId) {
    throw new Error("Account ID is required to fetch last completions.");
  }

  // Build query parameters
  const params = new URLSearchParams();
  if (assignmentId) {
    params.append('assignmentId', assignmentId);
  }
  if (selectedSchool) {
    params.append('selectedSchool', selectedSchool);
  }
  params.append('timePeriod', period);

  // Use GET request with query parameters instead of POST with body
  const url = `${WIDGETS_BASE_URL}/completed-assignments?${params.toString()}`;

  try {
    const response = await authedFetch<{ status: string; data: any[] }>(url, {
      method: 'GET',
    });

    // IMPORTANT: Access the .data property from the response object
    if (response && response.status === 'success' && Array.isArray(response.data)) {
      return response.data;
    } else {
      console.warn("getLastCompletions returned an unexpected response format or status:", response);
      return [];
    }
  } catch (error) {
    console.error("Error in getLastCompletions service function:", error);
    throw error;
  }
}




/**
 * 7. GET /tome OR /tome/:userEmail
 * Gets assignments assigned to the current or specified user.
 */
export async function getMyAssignments(accountName: string, userEmail?: string): Promise<AssignmentMetadata[]> {
  if (!accountName || accountName.trim() === "") {
    throw new Error("Account name is required for getMyAssignments.");
  }
  if (!userEmail) {
      throw new Error('User email is required for getMyAssignments.');
  }
  const endpoint = `/tome/${encodeURIComponent(userEmail)}`;
  const result = await authedFetch<AssignmentMetadata[] | undefined>(`${BASE_URL}${endpoint}`);
  return result || [];
}

/**
 * 11. POST /bylocation
 * Body: { location: string } - This 'location' is the filter criteria.
 */
export async function getAssignmentsByLocation(payload: ByLocationPayload, accountName: string): Promise<FullAssignment[]> {
    if (!accountName || accountName.trim() === "") {
        throw new Error("Account name is required for getAssignmentsByLocation.");
    }
    const result = await authedFetch<FullAssignment[] | undefined>(`${BASE_URL}/bylocation`, {
        method: 'POST',
        body: JSON.stringify(payload),
    });
    return result || [];
}


/**
 * 6. GET /header/:lat/:lng (This now uses WIDGETS_BASE_URL)
 * Returns current weather + reverse-geolocation for user's location.
 */
export async function getWeatherAndLocation(lat: number, lng: number): Promise<WeatherLocationData | null> {
    if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
        console.warn('Invalid lat/lng provided to getWeatherAndLocation. Aborting fetch.');
        return null;
    }
    // This function will get accountName from localStorage via authedFetch
    const result = await authedFetch<WeatherLocationData | undefined>(`${WIDGETS_BASE_URL}/header/${lat}/${lng}`);
    return result || null;
}

/**
 * 10. GET /types
 * Returns hardcoded list of assignment types.
 */
export async function getAssignmentTypes(accountName: string): Promise<string[]> {
  if (!accountName || accountName.trim() === "") {
    throw new Error("Account name is required for getAssignmentTypes.");
  }
  const result = await authedFetch<string[] | undefined>(`${BASE_URL}/types`);
  return result || [];
}

/**
 * 3. GET /questionsbyschool/:assignmentId/:period
 */
export async function getQuestionsBySchool(assignmentId: string, period: string, accountName: string): Promise<QuestionsBySchoolResponse | null> {
  if (!assignmentId || !period) throw new Error('Assignment ID and period are required.');
  if (!accountName || accountName.trim() === "") {
    throw new Error("Account name is required for getQuestionsBySchool.");
  }
  const result = await authedFetch<QuestionsBySchoolResponse | undefined>(`${BASE_URL}/questionsbyschool/${assignmentId}/${period}`);
  return result || null;
}

/**
 * 4. GET /schoolswithquestions/:assignmentId/:period
 */
export async function getSchoolsWithQuestions(assignmentId: string, period: string, accountName: string): Promise<SchoolsWithQuestionsResponse | null> {
  if (!assignmentId || !period) throw new Error('Assignment ID and period are required.');
  if (!accountName || accountName.trim() === "") {
    throw new Error("Account name is required for getSchoolsWithQuestions.");
  }
  const result = await authedFetch<SchoolsWithQuestionsResponse | undefined>(`${BASE_URL}/schoolswithquestions/${assignmentId}/${period}`);
  return result || null;
}

/**
 * 5. GET /dailysnapshot
 */
export async function getDailySnapshot(accountName: string): Promise<DailySnapshotResponse | null> {
  if (!accountName || accountName.trim() === "") {
    throw new Error("Account name is required for getDailySnapshot.");
  }
  const result = await authedFetch<DailySnapshotResponse | undefined>(`${BASE_URL}/dailysnapshot`);
  return result || null;
}

/**
 * 8. GET /dailysitesnapshot/tome/:userEmail
 */
export async function getDailySiteSnapshotForUser(userEmail: string, accountName: string): Promise<AssignmentMetadata | null> {
  if (!userEmail) throw new Error('User email is required.');
  if (!accountName || accountName.trim() === "") {
    throw new Error("Account name is required for getDailySiteSnapshotForUser.");
  }
  const result = await authedFetch<AssignmentMetadata | undefined>(`${BASE_URL}/dailysitesnapshot/tome/${encodeURIComponent(userEmail)}`);
  return result || null;
}

/**
 * 9. GET /dailysnapshot/:id/:period
 */
export async function getDailySnapshotByIdAndPeriod(id: string, period: string, accountName: string): Promise<DailySnapshotResponse | null> {
  if (!id || !period) throw new Error('Assignment ID and period are required.');
  if (!accountName || accountName.trim() === "") {
    throw new Error("Account name is required for getDailySnapshotByIdAndPeriod.");
  }
  const result = await authedFetch<DailySnapshotResponse | undefined>(`${BASE_URL}/dailysnapshot/${id}/${period}`);
  return result || null;
}

/**
 * 12. GET /assignedTo/:userEmail
 */
export async function getAssignedToUser(userEmail: string, accountName: string): Promise<AssignedToUserResponse> {
  if (!userEmail) throw new Error('User email is required.');
  if (!accountName || accountName.trim() === "") {
    throw new Error("Account name is required for getAssignedToUser.");
  }
  const result = await authedFetch<AssignedToUserResponse | undefined>(`${BASE_URL}/assignedTo/${encodeURIComponent(userEmail)}`);
  return result || [];
}

/**
 * 13. GET /author/:userId
 */
export async function getAssignmentsByAuthor(userId: string, accountName: string): Promise<AssignmentMetadata[]> {
  if (!userId) throw new Error('User ID is required.');
  if (!accountName || accountName.trim() === "") {
    throw new Error("Account name is required for getAssignmentsByAuthor.");
  }
  const result = await authedFetch<AssignmentMetadata[] | undefined>(`${BASE_URL}/author/${userId}`);
  return result || [];
}

/**
 * 14. GET /completedByMe
 */
export async function getAssignmentsCompletedByMe(accountName: string): Promise<CompletedByMeResponse | null> {
  if (!accountName || accountName.trim() === "") {
    throw new Error("Account name is required for getAssignmentsCompletedByMe.");
  }
  const result = await authedFetch<CompletedByMeResponse | undefined>(`${BASE_URL}/completedByMe`);
  return result || null; // Return null if undefined
}

/**
 * 19. POST /save_data/:id (multipart form-data)
 */
export async function saveDataCsv(id: string, csvFormData: FormData, accountName: string): Promise<SaveDataResponse> {
  if (!id) throw new Error('ID is required.');
  if (!accountName || accountName.trim() === "") {
    throw new Error("Account name is required for saveDataCsv.");
  }
  return authedFetch<SaveDataResponse>(`${BASE_URL}/save_data/${id}`, {
    method: 'POST',
    body: csvFormData,
  });
}

/**
 * 20. GET /pending/:id
 */
export async function getPendingSubmissions(id: string, accountName: string): Promise<PendingAssignmentsResponse> {
  if (!id) throw new Error('ID is required for pending submissions.');
  if (!accountName || accountName.trim() === "") {
    throw new Error("Account name is required for getPendingSubmissions.");
  }
  const result = await authedFetch<PendingAssignmentsResponse | undefined>(`${BASE_URL}/pending/${id}`);
  return result || [];
}

/**
 * 21. POST /pending/:assignmentId
 */
export async function savePendingSubmission(assignmentId: string, payload: DraftAssignmentPayload, accountName: string): Promise<PostPendingResponse> {
  if (!assignmentId) throw new Error('Assignment ID is required.');
  if (!accountName || accountName.trim() === "") {
    throw new Error("Account name is required for savePendingSubmission.");
  }
  return authedFetch<PostPendingResponse>(`${BASE_URL}/pending/${assignmentId}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}