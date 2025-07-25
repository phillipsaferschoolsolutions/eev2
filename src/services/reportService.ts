// src/services/reportService.ts
'use client';

import { auth } from '@/lib/firebase';
import type { User } from 'firebase/auth';
import { getCompletionDetails, getAssignmentById } from '@/services/assignmentFunctionsService';
import { generateReport, type GenerateReportInput, type GenerateReportOutput } from '@/ai/flows/generate-report-flow';

// Import the robust getIdToken function from assignmentFunctionsService
import { getIdToken as getIdTokenRobust } from '@/services/assignmentFunctionsService';

// Define types for prompt settings
export interface PromptSettings {
  customPrompt: string;
  promptMode: 'replace' | 'extend';
}

export interface GenerateReportOptions {
  customPrompt?: string;
  promptMode?: string;
}

// --- Generic Fetch Wrapper ---
async function authedFetch<T>(
  fullUrl: string,
  options: RequestInit = {},
  accountName?: string
): Promise<T> {
  const token = await getIdTokenRobust(); // Use the robust getIdToken function
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  } else {
    console.warn(`[CRITICAL] authedFetch (reportService): No Authorization token available for endpoint: ${fullUrl}.`);
  }

  // Set account header if provided
  if (accountName) {
    headers.set('account', accountName);
  } else {
    // Try to get from localStorage as fallback
    const storedAccount = localStorage.getItem('accountName');
    if (storedAccount) {
      headers.set('account', storedAccount);
    } else {
      console.warn(`[CRITICAL] authedFetch (reportService): 'account' header not found for URL: ${fullUrl}.`);
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

/**
 * Generates a report for a specific completion using AI.
 * @param assignmentId The ID of the assignment.
 * @param completionId The ID of the completion.
 * @param accountName The account name.
 * @param options Optional settings for report generation including custom prompt.
 * @returns The generated report content.
 */
export async function generateReportForCompletion(
  assignmentId: string,
  completionId: string,
  accountName: string,
  options?: GenerateReportOptions
): Promise<GenerateReportOutput> {
  if (!assignmentId || !completionId || !accountName) {
    throw new Error("Assignment ID, Completion ID, and Account Name are all required.");
  }

  try {
    // Fetch the completion data
    const completionData = await getCompletionDetails(assignmentId, completionId, accountName);
    if (!completionData) {
      throw new Error("Completion data not found.");
    }

    // Fetch the assignment data
    const assignmentData = await getAssignmentById(assignmentId, accountName);
    if (!assignmentData) {
      throw new Error("Assignment data not found.");
    }

    // Prepare input for the AI flow
    const input: GenerateReportInput = {
      completionData,
      assignmentData,
      accountName,
    };

    // Add custom prompt options if provided
    if (options?.customPrompt) {
      input.customPrompt = options.customPrompt;
      input.promptMode = options.promptMode as 'replace' | 'extend';
    }

    // Call the AI flow to generate the report
    const report = await generateReport(input);
    return report;
  } catch (error) {
    console.error("Error generating report:", error);
    throw new Error(`Failed to generate report: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Converts HTML content to a PDF file and initiates download.
 * @param htmlContent The HTML content to convert.
 * @param fileName The name of the PDF file.
 */
export async function exportToPdf(htmlContent: string, fileName: string = 'safety-assessment-report.pdf'): Promise<void> {
  // Only import html2pdf on the client side to avoid SSR issues
  if (typeof window === 'undefined') {
    throw new Error('PDF export is only available in the browser environment.');
  }

  try {
    // Dynamic import to avoid SSR issues
    const html2pdf = (await import('html2pdf.js')).default;
    
    const options = {
      margin: [15, 15, 15, 15],
      filename: fileName,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    await html2pdf().from(htmlContent).set(options).save();
  } catch (error) {
    console.error("Error exporting to PDF:", error);
    throw new Error(`Failed to export to PDF: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Converts HTML content to a DOCX file and initiates download.
 * Note: This is a placeholder. Full HTML to DOCX conversion is complex and may require server-side processing.
 * @param htmlContent The HTML content to convert.
 * @param fileName The name of the DOCX file.
 */
export async function exportToDocx(htmlContent: string, fileName: string = 'safety-assessment-report.docx'): Promise<void> {
  try {
    // This is a placeholder. In a production environment, you would likely:
    // 1. Send the HTML to a server-side endpoint
    // 2. Use a library like docx-html or mammoth to convert HTML to DOCX
    // 3. Return the DOCX file for download
    
    // For now, we'll just show an alert
    alert("DOCX export functionality is under development. Please use PDF export for now.");
    
    // In the future, this might look like:
    // const response = await fetch('/api/convert-to-docx', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ html: htmlContent, fileName }),
    // });
    // if (!response.ok) throw new Error('Failed to convert to DOCX');
    // const blob = await response.blob();
    // const url = URL.createObjectURL(blob);
    // const a = document.createElement('a');
    // a.href = url;
    // a.download = fileName;
    // document.body.appendChild(a);
    // a.click();
    // document.body.removeChild(a);
    // URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error exporting to DOCX:", error);
    throw new Error(`Failed to export to DOCX: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Saves a generated report to Firestore via the backend.
 * @param reportName The name of the report.
 * @param htmlContent The HTML content of the report.
 * @param assignmentId The ID of the assignment the report is based on.
 * @param completionId The ID of the completion the report is based on.
 * @param accountName The account ID.
 * @returns A promise that resolves with the saved report's ID.
 */
export async function saveReport(
  reportName: string,
  htmlContent: string,
  assignmentId: string,
  completionId: string,
  accountName: string
): Promise<{ id: string; message: string }> {
  if (!reportName || !htmlContent || !assignmentId || !completionId || !accountName) {
    throw new Error("All report details (name, content, assignmentId, completionId, accountName) are required to save a report.");
  }

  const payload = {
    reportName,
    htmlContent,
    assignmentId,
    completionId,
  };

  // Use the reportstudio Firebase function endpoint
  const REPORT_STUDIO_BASE_URL = 'https://us-central1-webmvp-5b733.cloudfunctions.net/reportstudio';

  const result = await authedFetch<{ id: string; message: string }>(`${REPORT_STUDIO_BASE_URL}/savereport`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }, accountName);

  return result;
}

/**
 * Fetches saved reports for the current account.
 * @param accountName The account ID.
 * @returns A promise that resolves with an array of saved report metadata.
 */
export async function getSavedReports(accountName: string): Promise<any[]> {
  if (!accountName) {
    throw new Error("Account name is required to fetch saved reports.");
  }

  const REPORT_STUDIO_BASE_URL = 'https://us-central1-webmvp-5b733.cloudfunctions.net/reportstudio';
  
  const result = await authedFetch<any[]>(`${REPORT_STUDIO_BASE_URL}/reports`, {
    method: 'GET',
  }, accountName);

  return result || [];
}

/**
 * Fetches a specific saved report by ID.
 * @param reportId The ID of the report to fetch.
 * @param accountName The account ID.
 * @returns A promise that resolves with the report data.
 */
export async function getReportById(reportId: string, accountName: string): Promise<any> {
  if (!reportId || !accountName) {
    throw new Error("Report ID and account name are required to fetch a report.");
  }

  const REPORT_STUDIO_BASE_URL = 'https://us-central1-webmvp-5b733.cloudfunctions.net/reportstudio';
  
  const result = await authedFetch<any>(`${REPORT_STUDIO_BASE_URL}/reports/${reportId}`, {
    method: 'GET',
  }, accountName);

  return result;
}

/**
 * Deletes a specific saved report by ID.
 * @param reportId The ID of the report to delete.
 * @param accountName The account ID.
 * @returns A promise that resolves when the report is successfully deleted.
 */
export async function deleteReport(reportId: string, accountName: string): Promise<{ message: string }> {
  if (!reportId || !accountName) {
    throw new Error("Report ID and account name are required to delete a report.");
  }

  const REPORT_STUDIO_BASE_URL = 'https://us-central1-webmvp-5b733.cloudfunctions.net/reportstudio';
  
  const result = await authedFetch<{ message: string }>(`${REPORT_STUDIO_BASE_URL}/reports/${reportId}`, {
    method: 'DELETE',
  }, accountName);

  return result;
}

/**
 * Fetches the custom prompt settings for an account.
 * @param accountName The account ID.
 * @returns A promise that resolves with the prompt settings.
 */
export async function getPromptSettings(accountName: string): Promise<PromptSettings | null> {
  if (!accountName) {
    throw new Error("Account name is required to fetch prompt settings.");
  }

  const REPORT_STUDIO_BASE_URL = 'https://us-central1-webmvp-5b733.cloudfunctions.net/reportstudio';
  
  try {
    const result = await authedFetch<PromptSettings>(`${REPORT_STUDIO_BASE_URL}/prompt-settings`, {
      method: 'GET',
    }, accountName);
    
    return result;
  } catch (error) {
    console.error("Error fetching prompt settings:", error);
    return null;
  }
}

/**
 * Saves custom prompt settings for an account.
 * @param accountName The account ID.
 * @param settings The prompt settings to save.
 * @returns A promise that resolves when the settings are successfully saved.
 */
export async function savePromptSettings(accountName: string, settings: PromptSettings): Promise<{ message: string }> {
  if (!accountName) {
    throw new Error("Account name is required to save prompt settings.");
  }

  const REPORT_STUDIO_BASE_URL = 'https://us-central1-webmvp-5b733.cloudfunctions.net/reportstudio';
  
  const result = await authedFetch<{ message: string }>(`${REPORT_STUDIO_BASE_URL}/prompt-settings`, {
    method: 'POST',
    body: JSON.stringify(settings),
  }, accountName);

  return result;
}

/**
 * Generates a comprehensive table of questions and responses for the appendix.
 */
function generateQuestionResponseTable(completionData: any, assignmentData: any): string {
  if (!completionData?.content || !assignmentData?.questions) {
    return '<p>No question and response data available.</p>';
  }

  let tableHtml = `
    <table class="question-response-table">
      <thead>
        <tr>
          <th class="question-cell">Question</th>
          <th class="response-cell">Response</th>
          <th class="comment-cell">Comments</th>
          <th class="photo-cell">Photo</th>
        </tr>
      </thead>
      <tbody>
  `;

  assignmentData.questions.forEach((question: any, index: number) => {
    const answer = completionData.content[question.id];
    const comment = completionData.commentsData?.[question.id];
    const photo = completionData.uploadedPhotos?.[question.id];
    
    // Format the answer based on its type
    let formattedAnswer = 'No response';
    if (answer !== null && answer !== undefined && answer !== '') {
      if (typeof answer === 'boolean') {
        formattedAnswer = answer ? 'Yes' : 'No';
      } else if (Array.isArray(answer)) {
        formattedAnswer = answer.join(', ');
      } else {
        formattedAnswer = String(answer);
      }
    }
    
    tableHtml += `
      <tr>
        <td class="question-cell">
          <strong>Q${index + 1}:</strong> ${question.label}
          ${question.required ? '<span style="color: #d32f2f;"> *</span>' : ''}
          <br><small style="color: #666;">Type: ${question.component}</small>
        </td>
        <td class="response-cell">
          ${formattedAnswer === 'No response' ? '<span class="no-response">No response</span>' : formattedAnswer}
        </td>
        <td class="comment-cell">
          ${comment ? `"${comment}"` : '<span class="no-response">No comment</span>'}
        </td>
        <td class="photo-cell">
          ${photo?.link ? `<img src="${photo.link}" alt="Photo for question ${index + 1}" title="${photo.originalName || 'Uploaded photo'}" />` : '<span class="no-response">No photo</span>'}
        </td>
      </tr>
    `;
  });

  tableHtml += '</tbody></table>';
  return tableHtml;
}

/**
 * Converts the structured report data to HTML for display in the editor.
 * @param report The structured report data.
 * @param accountName The account name to replace placeholders with.
 * @param generatedBy The user who generated the report.
 * @param completionData The completion data for generating the appendix.
 * @param assignmentData The assignment data for generating the appendix.
 * @returns HTML string representation of the report.
 */
export function reportToHtml(
  report: GenerateReportOutput, 
  accountName: string, 
  generatedBy: string,
  completionData?: any,
  assignmentData?: any
): string {
  // Extract metadata from the report or completion data if available
  const assignmentName = report.title || "Safety Assessment Report";
  const completedBy = completionData?.completedBy || "Not specified";
  const completionDate = completionData?.completionDate || completionData?.date || "Not specified";
  
  // This function converts the structured report data to HTML with enhanced styling
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${assignmentName}</title>
      <style>
        /* Base Styles */
        body {
          font-family: 'Arial', 'Helvetica', sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          background-color: #fff;
        }
        
        .report-container {
          max-width: 1000px;
          margin: 0 auto;
          padding: 20px;
          background-color: #fff;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        /* Header Styles */
        .report-header {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #3F51B5;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        
        .logo-container {
          margin-bottom: 15px;
        }
        
        .logo-container img {
          max-width: 200px;
          height: auto;
        }
        
        .report-title {
          font-size: 28px;
          font-weight: bold;
          color: #3F51B5;
          margin: 10px 0;
        }
        
        .report-company {
          font-size: 18px;
          font-weight: bold;
          color: #5C6BC0;
          margin-bottom: 5px;
        }
        
        .report-metadata {
          background-color: #E8EAF6;
          padding: 15px;
          border-radius: 5px;
          margin-top: 15px;
          width: 100%;
          box-sizing: border-box;
        }
        
        .report-metadata p {
          margin: 5px 0;
          font-size: 14px;
        }
        
        /* Section Styles */
        .report-section {
          margin-bottom: 40px;
        }
        
        .report-section h2 {
          color: #3F51B5;
          font-size: 24px;
          border-bottom: 2px solid #E8EAF6;
          padding-bottom: 10px;
          margin-bottom: 20px;
        }
        
        /* Domain Section Styles */
        .domain-section {
          margin-bottom: 30px;
          background-color: #fafafa;
          padding: 20px;
          border-radius: 5px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }
        
        .domain-section h3 {
          color: #5C6BC0;
          font-size: 20px;
          margin-bottom: 15px;
          border-left: 4px solid #5C6BC0;
          padding-left: 10px;
        }
        
        .domain-section h4 {
          font-weight: bold;
          font-size: 16px;
          margin-top: 20px;
          margin-bottom: 10px;
          color: #3F51B5;
        }
        
        /* Lists */
        ul, ol {
          margin-top: 10px;
          margin-bottom: 20px;
        }
        
        ul li, ol li {
          margin-bottom: 8px;
        }
        
        /* Tables */
        .recommendations-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 15px;
          font-size: 14px;
        }
        
        .recommendations-table th,
        .recommendations-table td {
          border: 1px solid #ddd;
          padding: 12px;
          text-align: left;
        }
        
        .recommendations-table th {
          background-color: #E8EAF6;
          color: #3F51B5;
          font-weight: bold;
        }
        
        .recommendations-table tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        
        .recommendations-table tr:hover {
          background-color: #f1f1f1;
        }
        
        /* Question Response Table Styles */
        .question-response-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 15px;
          font-size: 12px;
        }
        
        .question-response-table th,
        .question-response-table td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
          vertical-align: top;
        }
        
        .question-response-table th {
          background-color: #E8EAF6;
          color: #3F51B5;
          font-weight: bold;
          font-size: 13px;
        }
        
        .question-response-table tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        
        .question-response-table .question-cell {
          width: 40%;
          font-weight: 500;
        }
        
        .question-response-table .response-cell {
          width: 30%;
        }
        
        .question-response-table .comment-cell {
          width: 20%;
          font-style: italic;
          color: #666;
        }
        
        .question-response-table .photo-cell {
          width: 10%;
          text-align: center;
        }
        
        .question-response-table img {
          max-width: 100px;
          max-height: 100px;
          object-fit: cover;
          border-radius: 4px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .no-response {
          color: #999;
          font-style: italic;
        }
        
        /* Severity indicators */
        .severity-critical {
          color: #d32f2f;
          font-weight: bold;
        }
        
        .severity-medium {
          color: #f57c00;
          font-weight: bold;
        }
        
        .severity-low {
          color: #388e3c;
          font-weight: bold;
        }
        
        /* Footer */
        .report-footer {
          margin-top: 40px;
          text-align: center;
          font-size: 12px;
          color: #666;
          padding-top: 20px;
          border-top: 1px solid #E8EAF6;
        }
        
        /* Print-specific styles */
        @media print {
          body {
            font-size: 12pt;
          }
          
          .report-container {
            box-shadow: none;
            padding: 0;
          }
          
          .domain-section {
            page-break-inside: avoid;
            box-shadow: none;
          }
          
          .recommendations-table {
            page-break-inside: avoid;
          }
          
          .question-response-table {
            page-break-inside: avoid;
          }
          
          .report-section {
            page-break-after: always;
          }
          
          .report-section:last-child {
            page-break-after: avoid;
          }
        }
      </style>
    </head>
    <body>
      <div class="report-container">
        <div class="report-header">
          <div class="logo-container">
            <img src="/LogoTransV4.png" alt="EagleEyED Logo" />
          </div>
          <h1 class="report-title">${assignmentName}</h1>
          <div class="report-company">Safer School Solutions, Inc.</div>
          <div class="report-metadata">
            <p><strong>Assignment:</strong> ${assignmentName}</p>
            <p><strong>Completed By:</strong> ${completedBy}</p>
            <p><strong>Completion Date:</strong> ${completionDate}</p>
            <p><strong>Report Generated:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
        </div>
        
        <div class="report-section">
          <h2>Executive Summary</h2>
          <div>${report.executiveSummary}</div>
        </div>
        
        <div class="report-section">
          <h2>Methodology and Scope</h2>
          <div>${report.methodology}</div>
        </div>
        
        <div class="report-section">
          <h2>Risk Assessment Matrix</h2>
          <div>${report.riskAssessment.riskMatrix}</div>
          
          <h3>Critical Risks</h3>
          <ul>
            ${report.riskAssessment.criticalRisks.map(risk => `<li class="severity-critical">${risk}</li>`).join('')}
          </ul>
          
          <h3>Moderate Risks</h3>
          <ul>
            ${report.riskAssessment.moderateRisks.map(risk => `<li class="severity-medium">${risk}</li>`).join('')}
          </ul>
          
          <h3>Low Risks</h3>
          <ul>
            ${report.riskAssessment.lowRisks.map(risk => `<li class="severity-low">${risk}</li>`).join('')}
          </ul>
        </div>
        
        <div class="report-section">
          <h2>Compliance Evaluation</h2>
          <div>${report.complianceEvaluation.overview}</div>
          
          <h3>Standards and Regulations Reviewed</h3>
          <ul>
            ${report.complianceEvaluation.standardsReviewed.map(standard => `<li>${standard}</li>`).join('')}
          </ul>
          
          <h3>Compliance Strengths</h3>
          <ul>
            ${report.complianceEvaluation.complianceStrengths.map(strength => `<li class="severity-low">${strength}</li>`).join('')}
          </ul>
          
          <h3>Compliance Gaps</h3>
          <ul>
            ${report.complianceEvaluation.complianceGaps.map(gap => `<li class="severity-critical">${gap}</li>`).join('')}
          </ul>
        </div>
        
        <div class="report-section">
          <h2>Detailed Assessment by Domain</h2>
          
          <div class="domain-section">
            <h3>People (Staff, Training, Supervision)</h3>
            
            <h4>Strengths</h4>
            <ul>
              ${report.domains.people.strengths.map(strength => `<li>${strength}</li>`).join('')}
            </ul>
            
            <h4>Areas for Improvement</h4>
            <ul>
              ${report.domains.people.improvements.map(improvement => `<li>${improvement}</li>`).join('')}
            </ul>
            
            <h4>Site-Specific Observations</h4>
            <div>${report.domains.people.observations}</div>
            
            <h4>Recommendations</h4>
            <table class="recommendations-table">
              <thead>
                <tr>
                  <th>Recommendation</th>
                  <th>Severity</th>
                  <th>Timeline</th>
                  <th>Reference</th>
                </tr>
              </thead>
              <tbody>
                ${report.domains.people.recommendations.map(rec => `
                  <tr>
                    <td>${rec.recommendation}</td>
                    <td class="severity-${rec.severity.toLowerCase()}">${rec.severity}</td>
                    <td>${rec.timeline}</td>
                    <td>${rec.reference || ''}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          
          <div class="domain-section">
            <h3>Process (Procedures, Protocols, Plans)</h3>
            
            <h4>Strengths</h4>
            <ul>
              ${report.domains.process.strengths.map(strength => `<li>${strength}</li>`).join('')}
            </ul>
            
            <h4>Areas for Improvement</h4>
            <ul>
              ${report.domains.process.improvements.map(improvement => `<li>${improvement}</li>`).join('')}
            </ul>
            
            <h4>Site-Specific Observations</h4>
            <div>${report.domains.process.observations}</div>
            
            <h4>Recommendations</h4>
            <table class="recommendations-table">
              <thead>
                <tr>
                  <th>Recommendation</th>
                  <th>Severity</th>
                  <th>Timeline</th>
                  <th>Reference</th>
                </tr>
              </thead>
              <tbody>
                ${report.domains.process.recommendations.map(rec => `
                  <tr>
                    <td>${rec.recommendation}</td>
                    <td class="severity-${rec.severity.toLowerCase()}">${rec.severity}</td>
                    <td>${rec.timeline}</td>
                    <td>${rec.reference || ''}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          
          <div class="domain-section">
            <h3>Technology & Infrastructure (Physical Security, Equipment)</h3>
            
            <h4>Strengths</h4>
            <ul>
              ${report.domains.technology.strengths.map(strength => `<li>${strength}</li>`).join('')}
            </ul>
            
            <h4>Areas for Improvement</h4>
            <ul>
              ${report.domains.technology.improvements.map(improvement => `<li>${improvement}</li>`).join('')}
            </ul>
            
            <h4>Site-Specific Observations</h4>
            <div>${report.domains.technology.observations}</div>
            
            <h4>Recommendations</h4>
            <table class="recommendations-table">
              <thead>
                <tr>
                  <th>Recommendation</th>
                  <th>Severity</th>
                  <th>Timeline</th>
                  <th>Reference</th>
                </tr>
              </thead>
              <tbody>
                ${report.domains.technology.recommendations.map(rec => `
                  <tr>
                    <td>${rec.recommendation}</td>
                    <td class="severity-${rec.severity.toLowerCase()}">${rec.severity}</td>
                    <td>${rec.timeline}</td>
                    <td>${rec.reference || ''}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
        
        <div class="report-section">
          <h2>Detailed Findings and Analysis</h2>
          
          <h3>Safety Metrics and Performance Indicators</h3>
          <div>${report.detailedFindings.safetyMetrics}</div>
          
          <h3>Benchmark Comparison</h3>
          <div>${report.detailedFindings.benchmarkComparison}</div>
          
          <h3>Trend Analysis</h3>
          <div>${report.detailedFindings.trendAnalysis}</div>
          
          <h3>Incident Analysis</h3>
          <div>${report.detailedFindings.incidentAnalysis}</div>
        </div>
        
        <div class="report-section">
          <h2>Comprehensive Action Plan</h2>
          
          <h3>Immediate Actions (0-30 Days)</h3>
          <table class="recommendations-table">
            <thead>
              <tr>
                <th>Action</th>
                <th>Timeline</th>
                <th>Responsibility</th>
                <th>Resources Required</th>
              </tr>
            </thead>
            <tbody>
              ${report.actionPlan.immediateActions.map(action => `
                <tr>
                  <td>${action.action}</td>
                  <td class="severity-critical">${action.timeline}</td>
                  <td>${action.responsibility}</td>
                  <td>${action.resources}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <h3>Short-Term Actions (30-90 Days)</h3>
          <table class="recommendations-table">
            <thead>
              <tr>
                <th>Action</th>
                <th>Timeline</th>
                <th>Responsibility</th>
                <th>Resources Required</th>
              </tr>
            </thead>
            <tbody>
              ${report.actionPlan.shortTermActions.map(action => `
                <tr>
                  <td>${action.action}</td>
                  <td class="severity-medium">${action.timeline}</td>
                  <td>${action.responsibility}</td>
                  <td>${action.resources}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <h3>Long-Term Strategic Actions (90+ Days)</h3>
          <table class="recommendations-table">
            <thead>
              <tr>
                <th>Action</th>
                <th>Timeline</th>
                <th>Responsibility</th>
                <th>Resources Required</th>
              </tr>
            </thead>
            <tbody>
              ${report.actionPlan.longTermActions.map(action => `
                <tr>
                  <td>${action.action}</td>
                  <td class="severity-low">${action.timeline}</td>
                  <td>${action.responsibility}</td>
                  <td>${action.resources}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        <div class="report-section">
          <h2>Next Steps for Site Leadership</h2>
          <ol>
            ${report.nextSteps.map(step => `<li>${step}</li>`).join('')}
          </ol>
        </div>
        
        <div class="report-section">
          <h2>Appendices</h2>
          <div>${report.appendices}</div>
          
          <h3>Appendix A: Complete Question and Response Details</h3>
          ${generateQuestionResponseTable(completionData, assignmentData)}
        </div>
        
        <div class="report-section">
          <h2>Conclusion</h2>
          <div>${report.conclusion}</div>
        </div>
        
        <div class="report-footer">
          <p>© ${new Date().getFullYear()} Safer School Solutions, Inc. All rights reserved.</p>
          <p>Generated by EagleEyED™ Safety Assessment Platform</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  // Final pass: Replace any remaining accountName and reportGeneratedBy placeholders
  // that might have been inserted by the AI model
  html = html.replace(/\{\{\{?accountName\}?\}\}/g, accountName);
  html = html.replace(/\[Account Name\]/g, accountName);
  html = html.replace(/\{\{\{?reportGeneratedBy\}?\}\}/g, generatedBy);
  
  return html;
}