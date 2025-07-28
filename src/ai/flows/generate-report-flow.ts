'use server';
/**
 * @fileOverview AI flow to generate comprehensive safety assessment reports.
 *
 * - generateReport - A function that generates a structured safety assessment report.
 * - GenerateReportInput - The input type for the generateReport function.
 * - GenerateReportOutput - The return type for the generateReport function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateReportInputSchema = z.object({
  completionData: z.record(z.unknown()).describe('The completion data from the assessment'),
  assignmentData: z.record(z.unknown()).describe('The assignment/assessment metadata'),
  accountName: z.string().describe('The account name for context'),
  customPrompt: z.string().optional().describe('Optional custom prompt to extend or replace the default'),
  promptMode: z.enum(['extend', 'replace']).optional().describe('How to use the custom prompt'),
});
export type GenerateReportInput = z.infer<typeof GenerateReportInputSchema>;

const RecommendationSchema = z.object({
  recommendation: z.string(),
  severity: z.enum(['Low', 'Medium', 'High', 'Critical']),
  timeline: z.string(),
  reference: z.string().optional(),
});

const DomainAssessmentSchema = z.object({
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  observations: z.string(),
  recommendations: z.array(RecommendationSchema),
});

const ActionItemSchema = z.object({
  action: z.string(),
  timeline: z.string(),
  responsibility: z.string(),
  resources: z.string(),
});

const GenerateReportOutputSchema = z.object({
  title: z.string().describe('The title of the report'),
  reportName: z.string().describe('A suitable filename for the report'),
  executiveSummary: z.string().describe('High-level overview of key findings'),
  methodology: z.string().describe('Description of assessment methodology and scope'),
  riskAssessment: z.object({
    riskMatrix: z.string().describe('Overview of risk assessment approach'),
    criticalRisks: z.array(z.string()),
    moderateRisks: z.array(z.string()),
    lowRisks: z.array(z.string()),
  }),
  complianceEvaluation: z.object({
    overview: z.string().describe('Overall compliance status'),
    standardsReviewed: z.array(z.string()),
    complianceStrengths: z.array(z.string()),
    complianceGaps: z.array(z.string()),
  }),
  domains: z.object({
    people: DomainAssessmentSchema,
    process: DomainAssessmentSchema,
    technology: DomainAssessmentSchema,
  }),
  detailedFindings: z.object({
    safetyMetrics: z.string(),
    benchmarkComparison: z.string(),
    trendAnalysis: z.string(),
    incidentAnalysis: z.string(),
  }),
  actionPlan: z.object({
    immediateActions: z.array(ActionItemSchema),
    shortTermActions: z.array(ActionItemSchema),
    longTermActions: z.array(ActionItemSchema),
  }),
  nextSteps: z.array(z.string()),
  appendices: z.string(),
  conclusion: z.string(),
});
export type GenerateReportOutput = z.infer<typeof GenerateReportOutputSchema>;

export async function generateReport(
  input: GenerateReportInput
): Promise<GenerateReportOutput> {
  return generateReportFlow(input);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const generateReportPrompt = ai.definePrompt({
  name: 'generateReportPrompt',
  input: {schema: GenerateReportInputSchema},
  output: {schema: GenerateReportOutputSchema},
  prompt: `You are an expert school safety assessment analyst at Safer School Solutions, Inc. Your task is to generate a comprehensive safety assessment report based on the provided completion data from a school safety inspection.

{{#if customPrompt}}
{{#if (eq promptMode "replace")}}
{{{customPrompt}}}
{{else}}
You are an expert school safety assessment analyst at Safer School Solutions, Inc. Your task is to generate a comprehensive safety assessment report based on the provided completion data from a school safety inspection.

Additional Instructions:
{{{customPrompt}}}
{{/if}}
{{else}}
You are an expert school safety assessment analyst at Safer School Solutions, Inc. Your task is to generate a comprehensive safety assessment report based on the provided completion data from a school safety inspection.

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
{{/if}}

Assessment Data:
Completion Data: {{{completionData}}}
Assignment Data: {{{assignmentData}}}
Account: {{{accountName}}}

Generate a comprehensive safety assessment report following the structured format above.`,
});

const generateReportFlow = ai.defineFlow(
  {
    name: 'generateReportFlow',
    inputSchema: GenerateReportInputSchema,
    outputSchema: GenerateReportOutputSchema,
  },
  async input => {
    const {output} = await generateReportPrompt(input);
    return output!;
  }
);