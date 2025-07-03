// src/services/reportService.ts
'use client';

import { auth } from '@/lib/firebase';
import type { User } from 'firebase/auth';
import { getCompletionDetails, getAssignmentById } from '@/services/assignmentFunctionsService';
import { generateReport, type GenerateReportInput, type GenerateReportOutput } from '@/ai/flows/generate-report-flow';
import html2pdf from 'html2pdf.js';

// Import the robust getIdToken function from assignmentFunctionsService
import { getIdToken as getIdTokenRobust } from '@/services/assignmentFunctionsService';

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
 * @returns The generated report content.
 */
export async function generateReportForCompletion(
  assignmentId: string,
  completionId: string,
  accountName: string
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
  try {
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
 * Converts the structured report data to HTML for display in the editor.
 * @param report The structured report data.
 * @returns HTML string representation of the report.
 */
export function reportToHtml(report: GenerateReportOutput): string {
  // Extract metadata from the report or completion data if available
  const assignmentName = report.title || "Safety Assessment Report";
  const completedBy = ""; // This would need to be extracted from completionData
  const completionDate = ""; // This would need to be extracted from completionData
  
  // This function converts the structured report data to HTML with enhanced styling
  const html = `
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
            <p><strong>Completed By:</strong> ${completedBy || "Not specified"}</p>
            <p><strong>Completion Date:</strong> ${completionDate || "Not specified"}</p>
            <p><strong>Report Generated:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
        </div>
        
        <div class="report-section">
          <h2>Executive Summary</h2>
          <div>${report.executiveSummary}</div>
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
          <h2>Next Steps for Site Leadership</h2>
          <ol>
            ${report.nextSteps.map(step => `<li>${step}</li>`).join('')}
          </ol>
        </div>
        
        <div class="report-section">
          <h2>Appendices</h2>
          <div>${report.appendices}</div>
        </div>
        
        <div class="report-footer">
          <p>© ${new Date().getFullYear()} Safer School Solutions, Inc. All rights reserved.</p>
          <p>Generated by EagleEyED™ Safety Assessment Platform</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  return html;
}