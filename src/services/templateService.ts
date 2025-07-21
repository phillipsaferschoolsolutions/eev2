// src/services/templateService.ts
'use client';

import { auth, firestore } from '@/lib/firebase';
import type { User } from 'firebase/auth';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  orderBy,
} from 'firebase/firestore';
import type { ReportTemplate } from '@/types/Report';

// --- Helper to get ID Token (consistent with other services) ---
async function getIdToken(): Promise<string | null> {
  const currentUser: User | null = auth.currentUser;
  if (currentUser) {
    try {
      return await currentUser.getIdToken();
    } catch (error) {
      console.error("Error getting ID token for templateService:", error);
      return null;
    }
  }
  return null;
}

/**
 * Creates a new report template.
 * @param template The template object to create (without ID, createdAt, updatedAt).
 * @param accountId The account ID this template belongs to.
 * @param createdBy The email/ID of the user creating the template.
 * @returns The created ReportTemplate object with its new ID.
 */
export async function createTemplate(
  template: Omit<ReportTemplate, 'id' | 'createdAt' | 'updatedAt'>,
  accountId: string,
  createdBy: string
): Promise<ReportTemplate> {
  try {
    const templatesCollection = collection(firestore, 'reportTemplates');
    const docRef = await addDoc(templatesCollection, {
      ...template,
      accountId,
      createdBy,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    // Fetch the document to get the actual timestamps
    const docSnap = await getDoc(docRef);
    const docData = docSnap.data();
    
    return {
      id: docRef.id,
      ...template,
      accountId,
      createdBy,
      createdAt: docData?.createdAt,
      updatedAt: docData?.updatedAt,
    } as ReportTemplate;
  } catch (error) {
    console.error("Error creating template:", error);
    throw new Error(`Failed to create template: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Fetches all report templates for a given account.
 * @param accountId The account ID to filter templates by.
 * @returns An array of ReportTemplate objects.
 */
export async function getTemplates(accountId: string): Promise<ReportTemplate[]> {
  try {
    const templatesCollection = collection(firestore, 'reportTemplates');
    const q = query(
      templatesCollection,
      where('accountId', '==', accountId),
      orderBy('name', 'asc')
    );
    const querySnapshot = await getDocs(q);

    const templates: ReportTemplate[] = [];
    querySnapshot.forEach((doc) => {
      templates.push({
        id: doc.id,
        ...doc.data(),
      } as ReportTemplate);
    });
    return templates;
  } catch (error) {
    console.error("Error fetching templates:", error);
    throw new Error(`Failed to fetch templates: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Fetches a single report template by its ID.
 * @param templateId The ID of the template to fetch.
 * @returns The ReportTemplate object or null if not found.
 */
export async function getTemplateById(templateId: string): Promise<ReportTemplate | null> {
  try {
    const templateRef = doc(firestore, 'reportTemplates', templateId);
    const docSnap = await getDoc(templateRef);

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
      } as ReportTemplate;
    }
    return null;
  } catch (error) {
    console.error("Error fetching template by ID:", error);
    throw new Error(`Failed to fetch template: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Updates an existing report template.
 * @param templateId The ID of the template to update.
 * @param updates The partial ReportTemplate object with fields to update.
 */
export async function updateTemplate(templateId: string, updates: Partial<ReportTemplate>): Promise<void> {
  try {
    const templateRef = doc(firestore, 'reportTemplates', templateId);
    await updateDoc(templateRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating template:", error);
    throw new Error(`Failed to update template: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Deletes a report template.
 * @param templateId The ID of the template to delete.
 */
export async function deleteTemplate(templateId: string): Promise<void> {
  try {
    const templateRef = doc(firestore, 'reportTemplates', templateId);
    await deleteDoc(templateRef);
  } catch (error) {
    console.error("Error deleting template:", error);
    throw new Error(`Failed to delete template: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Replaces placeholders in template HTML content with actual data.
 * @param htmlContent The template HTML content with placeholders.
 * @param completionData The completion data from the assessment.
 * @param assignmentData The assignment data.
 * @param accountName The account name.
 * @param generatedBy The user who generated the report.
 * @returns The HTML content with placeholders replaced.
 */
export function replacePlaceholders(
  htmlContent: string,
  completionData: any,
  assignmentData: any,
  accountName: string,
  generatedBy: string
): string {
  let processedContent = htmlContent;

  // Assignment metadata placeholders
  processedContent = processedContent.replace(/\{\{assessmentName\}\}/g, assignmentData?.assessmentName || 'N/A');
  processedContent = processedContent.replace(/\{\{assignmentType\}\}/g, assignmentData?.assignmentType || 'N/A');
  processedContent = processedContent.replace(/\{\{assignmentDescription\}\}/g, assignmentData?.description || 'N/A');
  processedContent = processedContent.replace(/\{\{dueDate\}\}/g, assignmentData?.dueDate || 'N/A');
  processedContent = processedContent.replace(/\{\{author\}\}/g, assignmentData?.author || 'N/A');

  // Completion metadata placeholders
  processedContent = processedContent.replace(/\{\{completedBy\}\}/g, completionData?.completedBy || 'N/A');
  processedContent = processedContent.replace(/\{\{completionDate\}\}/g, completionData?.completionDate || completionData?.date || 'N/A');
  processedContent = processedContent.replace(/\{\{locationName\}\}/g, completionData?.locationName || 'N/A');
  processedContent = processedContent.replace(/\{\{selectedSchool\}\}/g, completionData?.selectedSchool || completionData?.locationName || 'N/A');

  // Report metadata placeholders
  processedContent = processedContent.replace(/\{\{reportGeneratedDate\}\}/g, new Date().toLocaleDateString());
  processedContent = processedContent.replace(/\{\{reportGeneratedBy\}\}/g, generatedBy);
  processedContent = processedContent.replace(/\{\{accountName\}\}/g, accountName);

  // Dynamic content placeholders (basic implementation)
  if (processedContent.includes('{{questionAnswers}}')) {
    const questionAnswersTable = generateQuestionAnswersTable(completionData, assignmentData);
    processedContent = processedContent.replace(/\{\{questionAnswers\}\}/g, questionAnswersTable);
  }

  if (processedContent.includes('{{deficiencyList}}')) {
    const deficiencyList = generateDeficiencyList(completionData, assignmentData);
    processedContent = processedContent.replace(/\{\{deficiencyList\}\}/g, deficiencyList);
  }

  if (processedContent.includes('{{photoGallery}}')) {
    const photoGallery = generatePhotoGallery(completionData);
    processedContent = processedContent.replace(/\{\{photoGallery\}\}/g, photoGallery);
  }

  if (processedContent.includes('{{commentsSection}}')) {
    const commentsSection = generateCommentsSection(completionData);
    processedContent = processedContent.replace(/\{\{commentsSection\}\}/g, commentsSection);
  }

  return processedContent;
}

/**
 * Generates an HTML table of questions and answers.
 */
function generateQuestionAnswersTable(completionData: any, assignmentData: any): string {
  if (!completionData?.content || !assignmentData?.questions) {
    return '<p>No question data available.</p>';
  }

  let tableHtml = `
    <table class="w-full border-collapse border border-gray-300">
      <thead>
        <tr class="bg-gray-100">
          <th class="border border-gray-300 p-2 text-left">Question</th>
          <th class="border border-gray-300 p-2 text-left">Answer</th>
        </tr>
      </thead>
      <tbody>
  `;

  assignmentData.questions.forEach((question: any) => {
    const answer = completionData.content[question.id] || 'No answer provided';
    tableHtml += `
      <tr>
        <td class="border border-gray-300 p-2">${question.label}</td>
        <td class="border border-gray-300 p-2">${answer}</td>
      </tr>
    `;
  });

  tableHtml += '</tbody></table>';
  return tableHtml;
}

/**
 * Generates an HTML list of identified deficiencies.
 */
function generateDeficiencyList(completionData: any, assignmentData: any): string {
  const deficiencies: string[] = [];

  if (completionData?.content && assignmentData?.questions) {
    assignmentData.questions.forEach((question: any) => {
      const answer = completionData.content[question.id];
      
      // Check if this answer represents a deficiency
      if (question.deficiencyValues && Array.isArray(question.deficiencyValues)) {
        if (question.deficiencyValues.includes(answer)) {
          deficiencies.push(`${question.label}: ${answer}`);
        }
      }
    });
  }

  if (deficiencies.length === 0) {
    return '<p>No deficiencies identified.</p>';
  }

  let listHtml = '<ul class="list-disc list-inside">';
  deficiencies.forEach(deficiency => {
    listHtml += `<li>${deficiency}</li>`;
  });
  listHtml += '</ul>';

  return listHtml;
}

/**
 * Generates an HTML gallery of uploaded photos.
 */
function generatePhotoGallery(completionData: any): string {
  if (!completionData?.uploadedPhotos || Object.keys(completionData.uploadedPhotos).length === 0) {
    return '<p>No photos uploaded.</p>';
  }

  let galleryHtml = '<div class="grid grid-cols-2 md:grid-cols-3 gap-4">';
  
  Object.entries(completionData.uploadedPhotos).forEach(([questionId, photoData]: [string, any]) => {
    if (photoData?.link) {
      galleryHtml += `
        <div class="border rounded-lg overflow-hidden">
          <img src="${photoData.link}" alt="Photo for question ${questionId}" class="w-full h-48 object-cover" />
          <div class="p-2">
            <p class="text-sm text-gray-600">${photoData.originalName || 'Uploaded photo'}</p>
            <p class="text-xs text-gray-500">${photoData.date || ''}</p>
          </div>
        </div>
      `;
    }
  });
  
  galleryHtml += '</div>';
  return galleryHtml;
}

/**
 * Generates an HTML section of comments.
 */
function generateCommentsSection(completionData: any): string {
  if (!completionData?.commentsData || Object.keys(completionData.commentsData).length === 0) {
    return '<p>No comments provided.</p>';
  }

  let commentsHtml = '<div class="space-y-4">';
  
  Object.entries(completionData.commentsData).forEach(([questionId, comment]: [string, any]) => {
    if (comment && comment.trim()) {
      commentsHtml += `
        <div class="border-l-4 border-blue-500 pl-4">
          <p class="font-medium">Question ${questionId}</p>
          <p class="text-gray-700 italic">"${comment}"</p>
        </div>
      `;
    }
  });
  
  commentsHtml += '</div>';
  return commentsHtml;
}