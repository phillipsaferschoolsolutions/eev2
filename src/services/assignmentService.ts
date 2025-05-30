
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

// Placeholder for future functions
// export async function getAssignmentById(id: string): Promise<Assignment | null> { /* ... */ return null; }
// export async function addAssignment(assignmentData: Omit<Assignment, 'id'>): Promise<string> { /* ... */ return ""; }
// export async function updateAssignment(id: string, assignmentData: Partial<Assignment>): Promise<void> { /* ... */ }
// export async function deleteAssignment(id: string): Promise<void> { /* ... */ }
