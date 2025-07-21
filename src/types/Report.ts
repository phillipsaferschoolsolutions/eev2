// src/types/Report.ts

import type { Timestamp } from 'firebase/firestore';

/**
 * Represents a reusable report template.
 */
export interface ReportTemplate {
  id: string;           // Unique ID for the template document
  name: string;         // Display name of the template (e.g., "Standard Safety Audit Template")
  description?: string; // Optional description of the template's purpose
  htmlContent: string;  // The HTML content of the template, including placeholders (e.g., {{assessmentName}})
  accountId: string;    // The account ID this template belongs to
  createdBy: string;    // User email or ID who created the template
  createdAt: Timestamp; // Timestamp when the template was created
  updatedAt?: Timestamp; // Timestamp when the template was last updated
  isShared?: boolean;   // Whether this template is shared across the organization (true) or private (false)
}

/**
 * Payload for creating a new report template
 */
export interface CreateReportTemplatePayload {
  name: string;
  description?: string;
  htmlContent: string;
  isShared?: boolean;
}

/**
 * Payload for updating an existing report template
 */
export interface UpdateReportTemplatePayload {
  name?: string;
  description?: string;
  htmlContent?: string;
  isShared?: boolean;
}

/**
 * Available placeholders that can be used in report templates
 */
export const TEMPLATE_PLACEHOLDERS = {
  // Assignment metadata
  '{{assessmentName}}': 'Name of the assessment',
  '{{assignmentType}}': 'Type of assignment (e.g., Site Assessment)',
  '{{assignmentDescription}}': 'Description of the assignment',
  '{{dueDate}}': 'Due date of the assignment',
  '{{author}}': 'Author of the assignment',
  
  // Completion metadata
  '{{completedBy}}': 'Name/email of person who completed the assessment',
  '{{completionDate}}': 'Date when the assessment was completed',
  '{{locationName}}': 'Name of the location where assessment was conducted',
  '{{selectedSchool}}': 'Selected school/site for the assessment',
  
  // Report metadata
  '{{reportGeneratedDate}}': 'Date when the report was generated',
  '{{reportGeneratedBy}}': 'Name/email of person who generated the report',
  '{{accountName}}': 'Name of the account/organization',
  
  // Dynamic content placeholders
  '{{questionAnswers}}': 'Table of all questions and their answers',
  '{{deficiencyList}}': 'List of identified deficiencies',
  '{{photoGallery}}': 'Gallery of uploaded photos',
  '{{commentsSection}}': 'Section containing all comments',
} as const;

export type TemplatePlaceholder = keyof typeof TEMPLATE_PLACEHOLDERS;