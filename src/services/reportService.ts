// src/services/reportService.ts
'use client';

import { auth } from '@/lib/firebase';
import type { User } from 'firebase/auth';
import { getCompletionDetails, getAssignmentById } from '@/services/assignmentFunctionsService';
import { generateReport, type GenerateReportInput, type GenerateReportOutput } from '@/ai/flows/generate-report-flow';
import html2pdf from 'html2pdf.js';

// --- Helper to get ID Token ---
async function getIdToken(): Promise<string | null> {
  const currentUser: User | null = auth.currentUser;
  if (currentUser) {
    try {
      return await currentUser.getIdToken(true); // Force refresh
    } catch (error) {
      console.error("Error getting ID token:", error);
      return null;
    }
  }
  return null;
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
      margin: [10, 10, 10, 10],
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
 * Converts the structured report data to HTML for display in the editor.
 * @param report The structured report data.
 * @returns HTML string representation of the report.
 */
export function reportToHtml(report: GenerateReportOutput): string {
  // This function converts the structured report data to HTML
  // You can customize this to match your desired report styling
  
  const html = `
    <div class="report-container">
      <div class="report-header">
        <h1>${report.title}</h1>
        <p class="report-company">Safer School Solutions, Inc.</p>
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
                  <td>${rec.severity}</td>
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
                  <td>${rec.severity}</td>
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
                  <td>${rec.severity}</td>
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
      </div>
    </div>
  `;
  
  return html;
}