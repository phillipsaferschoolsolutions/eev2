'use server';
/**
 * @fileOverview AI flow to generate a comprehensive safety assessment report.
 *
 * - generateReport - A function that generates a detailed report from completion data.
 * - GenerateReportInput - The input type for the generateReport function.
 * - GenerateReportOutput - The return type for the generateReport function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateReportInputSchema = z.object({
  completionData: z.record(z.any()).describe('The full completion data including questions, answers, and metadata.'),
  assignmentData: z.record(z.any()).describe('The assignment data including questions and metadata.'),
  accountName: z.string().describe('The account name for the report.'),
  customPrompt: z.string().optional().describe('Optional custom prompt to use for report generation.'),
  promptMode: z.enum(['replace', 'extend']).optional().describe('How to use the custom prompt: replace or extend the default.'),
});
export type GenerateReportInput = z.infer<typeof GenerateReportInputSchema>;

const DomainSection = z.object({
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  observations: z.string(),
  recommendations: z.array(z.object({
    recommendation: z.string(),
    severity: z.enum(['Critical', 'Medium', 'Low']),
    timeline: z.enum(['30 days', '60 days', '90 days', 'Long Term (120+ days)']),
    reference: z.string().optional(),
  })),
});

const GenerateReportOutputSchema = z.object({
  title: z.string().describe('The title of the report.'),
  reportName: z.string().describe('A concise, descriptive name for the report, suitable for a file name or list entry.'), // New field
  executiveSummary: z.string().describe('A concise summary of key findings.'),
  domains: z.object({
    people: DomainSection.describe('Staff, training, supervision aspects.'),
    process: DomainSection.describe('Procedures, protocols, plans aspects.'),
    technology: DomainSection.describe('Physical security, equipment, infrastructure aspects.'),
  }),
  nextSteps: z.array(z.string()).describe('Prioritized next steps for site leadership.'),
  appendices: z.string().describe('Methodology and question references.'),
});
export type GenerateReportOutput = z.infer<typeof GenerateReportOutputSchema>;

export async function generateReport(
  input: GenerateReportInput
): Promise<GenerateReportOutput> {
  return generateReportFlow(input);
}

const generateReportPrompt = ai.definePrompt({
  name: 'generateReportPrompt',
  input: { schema: GenerateReportInputSchema },
  output: { schema: GenerateReportOutputSchema },
  prompt: (input) => {
    // Default prompt
    const defaultPrompt = `You are an expert school safety assessment analyst at Safer School Solutions, Inc. Your task is to generate a comprehensive safety assessment report based on the provided completion data from a school safety inspection.

School Safety Assessment Report Framework
Overview
This system generates standardized safety assessment reports for educational facilities based on structured assessment data. Each report follows a consistent format to ensure comparability and clarity across different sites. Remember that the goal of these reports is to coach and encourage people to improve (not to judge or make people feel bad). The goal is to highlight positive and areas that need improvement while focusing on the items they are most likely able to control (based on their role as a school administrator) but not being a school district administrator or facilities expert. They likely don't manage the budget or timeline for large infrastructure changes so while we may highlight those gaps we will focus on the ones they can make a measurable positive impact with to make students and the site safer.

Report Structure
All safety assessment reports must follow this structure:
- Title page and header information
- Executive Summary (overview of key findings)
- Detailed Assessment by Domain
  - People (staff, training, supervision)
  - Process (procedures, protocols, plans)
  - Technology & Infrastructure (physical security, equipment)
- Next Steps for Site Leadership
- Appendices (methodology and question references)

Domain Framework
Each domain section must include:
- Strengths (bullet points with question references)
- Areas for Improvement (bullet points with question references)
- Site-Specific Observations (detailed contextual findings)
- Recommendations (table with severity, timeline, references)

Formatting Standards
- Professional, objective tone throughout
- Clear headings and consistent formatting
- All recommendations must be actionable and specific
- Question references [Q#] included for traceability
- Related recommendations grouped together
- Recommendations prioritized by severity and timeline

Data Handling Guidelines
- Items labeled as "COMMENT" should be incorporated naturally into findings
- Ignore comments about assessment process improvements
- Fix all spelling mistakes or typos from raw assessment data
- Convert raw data into professionally written observations
- Ensure terminology consistency throughout the document

Severity and Timeline Definitions
- Critical Severity: Critical safety issues requiring immediate attention
- Medium Severity: Important issues that should be addressed but aren't immediately critical
- Low Severity: Improvements that would enhance safety but aren't urgent
- 30 days: Immediate action needed; can be implemented quickly with existing resources
- 60 days: High priority; requires modest planning or coordination
- 90 days: Important but allows time for thorough implementation
- Long Term (120+ days): May require coordination with external resources

Completion Data:
{{completionData}}

Assignment Data:
{{assignmentData}}

Account Name:
{{{accountName}}}

Please generate a comprehensive safety assessment report following the framework above. The report should be structured, professional, and provide actionable insights. Remember to maintain a coaching and encouraging tone throughout the report.
Also, provide a concise, descriptive name for the report in the 'reportName' field, suitable for a file name or list entry.`;

    // If there's a custom prompt and the mode is 'replace', use only the custom prompt
    if (input.customPrompt && input.promptMode === 'replace') {
      return input.customPrompt;
    }
    
    // If there's a custom prompt and the mode is 'extend', combine the prompts
    if (input.customPrompt && input.promptMode === 'extend') {
      return `${input.customPrompt}

${defaultPrompt}`;
    }
    
    // Otherwise, use the default prompt
    return defaultPrompt;
  }
});

const generateReportFlow = ai.defineFlow(
  {
    name: 'generateReportFlow',
    inputSchema: GenerateReportInputSchema,
    outputSchema: GenerateReportOutputSchema,
  },
  async input => {
    const { output } = await generateReportPrompt(input);
    if (!output) {
      throw new Error("Failed to generate report from the prompt.");
    }
    return output;
  }
);