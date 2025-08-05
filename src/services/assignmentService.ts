
import { firestore } from '@/lib/firebase';
import type { Assignment, AssignmentAdmin, ShareWith } from '@/types/Assignment';
import { collection, getDocs, query, orderBy, type DocumentData, type QueryDocumentSnapshot } from 'firebase/firestore';

// Helper to convert Firestore doc to Assignment, including ID
const fromFirestore = (doc: QueryDocumentSnapshot<DocumentData>): Assignment => {
  const data = doc.data();
  return {
    id: doc.id,
    accountSubmittedFor: data.accountSubmittedFor,
    assessmentName: data.assessmentName || 'Unnamed Assignment', // Fallback for safety
    assignmentAdminArray: data.assignmentAdminArray as AssignmentAdmin[] | undefined,
    assignmentType: data.assignmentType,
    author: data.author,
    communityShare: data.communityShare === true, // Ensure boolean
    createdDate: data.createdDate,
    description: data.description,
    dueDate: data.dueDate,
    frequency: data.frequency,
    schoolSelectorId: data.schoolSelectorId,
    shareWith: data.shareWith as ShareWith | undefined,
    updatedAt: data.updatedAt,
    updatedBy: data.updatedBy,
    // Ensure all fields present in your Firestore docs are mapped here
  };
};

export async function getAssignments(): Promise<Assignment[]> {
  try {
    const assignmentsCollection = collection(firestore, 'assignments');
    // Optional: Order by a field, e.g., assessmentName or createdDate (if stored as Timestamp or sortable string)
    const q = query(assignmentsCollection, orderBy('assessmentName')); // Example: order by name
    const querySnapshot = await getDocs(q);
    
    const assignments = querySnapshot.docs.map(doc => fromFirestore(doc));
    return assignments;
  } catch (error) {
    console.error("Error fetching assignments: ", error);
    // Rethrow or return a custom error object for the UI to handle
    throw new Error(`Failed to fetch assignments: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Helper function to make authenticated requests to the assignments API
async function authedFetch(endpoint: string, options: RequestInit = {}) {
  const { auth } = await import('@/lib/firebase');
  
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }

  const token = await user.getIdToken();
  const account = localStorage.getItem('accountName');
  
  if (!account) {
    throw new Error('Account not found');
  }

  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5001/your-project/us-central1/assignmentsv2';
  
  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'account': account,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// Delete an assignment
export async function deleteAssignment(assignmentId: string): Promise<void> {
  await authedFetch(`/${assignmentId}`, {
    method: 'DELETE',
  });
}

// Rename an assignment
export async function renameAssignment(assignmentId: string, newName: string): Promise<{ message: string; assessmentName: string }> {
  return await authedFetch(`/${assignmentId}/rename`, {
    method: 'PATCH',
    body: JSON.stringify({ assessmentName: newName }),
  });
}

// Copy an assignment
export async function copyAssignment(assignmentId: string, newName?: string): Promise<{ message: string; newAssignmentId: string; assessmentName: string }> {
  return await authedFetch(`/${assignmentId}/copy`, {
    method: 'POST',
    body: JSON.stringify({ newAssessmentName: newName }),
  });
}
