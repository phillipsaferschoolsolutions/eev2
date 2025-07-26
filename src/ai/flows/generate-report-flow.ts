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
  methodology: z.string().describe('Detailed methodology and scope of the assessment.'),
  riskAssessment: z.object({
    riskMatrix: z.string().describe('Comprehensive risk assessment matrix with detailed analysis.'),
    criticalRisks: z.array(z.string()).describe('List of critical risks identified.'),
    moderateRisks: z.array(z.string()).describe('List of moderate risks identified.'),
    lowRisks: z.array(z.string()).describe('List of low-level risks identified.'),
  }).describe('Comprehensive risk assessment section.'),
  complianceEvaluation: z.object({
    overview: z.string().describe('Overview of compliance status.'),
    standardsReviewed: z.array(z.string()).describe('List of safety standards and regulations reviewed.'),
    complianceGaps: z.array(z.string()).describe('Identified compliance gaps.'),
    complianceStrengths: z.array(z.string()).describe('Areas of strong compliance.'),
  }).describe('Detailed compliance evaluation section.'),
  domains: z.object({
    people: DomainSection.describe('Staff, training, supervision aspects.'),
    process: DomainSection.describe('Procedures, protocols, plans aspects.'),
    technology: DomainSection.describe('Physical security, equipment, infrastructure aspects.'),
  }),
  detailedFindings: z.object({
    safetyMetrics: z.string().describe('Quantitative safety metrics and data analysis.'),
    benchmarkComparison: z.string().describe('Comparison against industry benchmarks and standards.'),
    trendAnalysis: z.string().describe('Analysis of safety trends and patterns.'),
    incidentAnalysis: z.string().describe('Analysis of any incidents or near-misses.'),
  }).describe('Detailed findings and analysis section.'),
  actionPlan: z.object({
    immediateActions: z.array(z.object({
      action: z.string(),
      timeline: z.string(),
      responsibility: z.string(),
      resources: z.string(),
    })).describe('Immediate actions required (0-30 days).'),
    shortTermActions: z.array(z.object({
      action: z.string(),
      timeline: z.string(),
      responsibility: z.string(),
      resources: z.string(),
    })).describe('Short-term actions (30-90 days).'),
    longTermActions: z.array(z.object({
      action: z.string(),
      timeline: z.string(),
      responsibility: z.string(),
      resources: z.string(),
    })).describe('Long-term strategic actions (90+ days).'),
  }).describe('Comprehensive action plan with detailed implementation roadmap.'),
  nextSteps: z.array(z.string()).describe('Prioritized next steps for site leadership.'),
  appendices: z.string().describe('Methodology and question references.'),
  conclusion: z.string().describe('Comprehensive conclusion summarizing key findings and overall assessment.'),
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
  prompt: `You are an expert school safety assessment analyst at Safer School Solutions, Inc. Your task is to generate a comprehensive, premium-quality safety assessment report that justifies significant investment and demonstrates exceptional value. This report must be thorough, detailed, and professionally comprehensive - minimum 15 pages of substantive content.

**PREMIUM SAFETY ASSESSMENT REPORT FRAMEWORK**

**CONTENT REQUIREMENTS:**
- Generate comprehensive, detailed content that demonstrates exceptional value
- Minimum 15 pages of substantive analysis and recommendations
- Include specific data points, metrics, and quantifiable findings
- Provide detailed explanations and context for all findings
- Use professional language and industry-standard terminology
- Reference relevant safety standards, regulations, and best practices

**MANDATORY REPORT STRUCTURE:**

1. **Executive Summary (1-2 pages)**
   - Comprehensive overview of assessment scope and methodology
   - Key findings summary with quantitative data
   - Critical recommendations overview
   - Overall safety rating and risk assessment summary

2. **Methodology and Scope (2-3 pages)**
   - Detailed assessment methodology and approach
   - Scope of evaluation including areas covered
   - Standards and frameworks referenced
   - Data collection methods and validation processes
   - Assessment team qualifications and expertise
   - Timeline and duration of assessment activities

3. **Detailed Safety Analysis (4-6 pages)**
   - Comprehensive analysis by domain (People, Process, Technology)
   - Quantitative safety metrics and performance indicators
   - Benchmark comparisons against industry standards
   - Trend analysis and historical data review
   - Incident analysis and near-miss evaluation
   - Environmental and situational factors assessment

4. **Risk Assessment Matrix (2-3 pages)**
   - Comprehensive risk identification and categorization
   - Detailed risk matrix with probability and impact analysis
   - Critical, moderate, and low-risk classifications
   - Risk mitigation strategies and controls evaluation
   - Residual risk assessment after current controls
   - Risk tolerance and acceptance criteria

5. **Compliance Evaluation (2-3 pages)**
   - Detailed review against applicable safety standards
   - Federal, state, and local regulation compliance status
   - Industry best practice alignment assessment
   - Compliance gaps identification and analysis
   - Regulatory change impact assessment
   - Certification and accreditation status review

6. **Recommendations and Action Plan (2-3 pages)**
   - Immediate actions (0-30 days) with detailed implementation steps
   - Short-term initiatives (30-90 days) with resource requirements
   - Long-term strategic improvements (90+ days) with ROI analysis
   - Implementation roadmap with milestones and success metrics
   - Resource allocation and budget considerations
   - Training and development recommendations

7. **Conclusion (1 page)**
   - Comprehensive summary of overall safety posture
   - Key achievements and areas of excellence
   - Priority focus areas for improvement
   - Long-term safety vision and strategic direction

**QUALITY STANDARDS:**
- Each section must be substantive and detailed
- Include specific examples and case studies where relevant
- Provide quantitative data and metrics throughout
- Reference specific questions and findings from the assessment
- Use professional formatting with clear headings and subheadings
- Include actionable recommendations with clear implementation guidance

**DOMAIN FRAMEWORK (Enhanced):**
Each domain section must include:
- Detailed strengths analysis with supporting evidence
- Comprehensive areas for improvement with root cause analysis
- Site-specific observations with contextual factors
- Quantitative metrics and performance indicators
- Benchmark comparisons and industry standards alignment
- Detailed recommendations with implementation roadmaps
- Resource requirements and cost-benefit analysis

**FORMATTING AND PRESENTATION:**
- Professional, authoritative tone throughout
- Clear hierarchical structure with numbered sections
- Detailed explanations that demonstrate expertise
- Specific data points and quantifiable findings
- Professional tables, charts, and visual elements
- Comprehensive cross-references and citations
- Industry-standard terminology and best practices

**VALUE DEMONSTRATION:**
- Provide detailed analysis that justifies premium pricing
- Include comprehensive insights not available elsewhere
- Demonstrate deep expertise and professional knowledge
- Offer specific, actionable recommendations with clear ROI
- Present findings in a way that enables immediate implementation
- Show understanding of complex safety management challenges

**CONTENT DEPTH REQUIREMENTS:**
- Each major section should contain multiple subsections
- Provide detailed explanations and context for all findings
- Include specific examples and case studies
- Reference industry standards and regulatory requirements
- Offer comparative analysis and benchmarking data
- Present comprehensive implementation guidance

Completion Data:
{{completionData}}

Assignment Data:
{{assignmentData}}

Account Name:
{{{accountName}}}

CRITICAL INSTRUCTIONS:
- Generate a comprehensive, detailed report that meets the minimum 15-page requirement
- Ensure each section is substantive and provides significant value
- Include specific data points, metrics, and quantifiable findings throughout
- Provide detailed explanations and context for all observations
- Use professional language that demonstrates expertise and authority
- Include comprehensive recommendations with detailed implementation guidance
- Reference specific assessment questions and findings with [Q#] notation
- Maintain a professional, coaching tone that encourages improvement
- Ensure the report justifies premium pricing through exceptional depth and quality

Remember: This is a premium assessment report that clients invest significantly in. Every section must demonstrate exceptional value, professional expertise, and comprehensive analysis that enables immediate implementation of safety improvements.`,
});

const generateReportFlow = ai.defineFlow(
  {
    name: 'generateReportFlow',
    inputSchema: GenerateReportInputSchema,
    outputSchema: GenerateReportOutputSchema,
  },
  async input => {
    // Handle custom prompt logic in the flow instead of the prompt definition
    let promptToUse = generateReportPrompt;
    
    // If custom prompt is provided, create a dynamic prompt
    if (input.customPrompt) {
      if (input.promptMode === 'replace') {
        // Create a new prompt with just the custom content
        promptToUse = ai.definePrompt({
          name: 'customGenerateReportPrompt',
          input: { schema: GenerateReportInputSchema },
          output: { schema: GenerateReportOutputSchema },
          prompt: input.customPrompt,
        });
      } else if (input.promptMode === 'extend') {
        // Create a new prompt that combines custom + default
        promptToUse = ai.definePrompt({
          name: 'extendedGenerateReportPrompt',
          input: { schema: GenerateReportInputSchema },
          output: { schema: GenerateReportOutputSchema },
          prompt: `${input.customPrompt}

${generateReportPrompt.config.prompt}`,
        });
      }
    }
    
    const { output } = await promptToUse(input);
    if (!output) {
      throw new Error("Failed to generate report from the prompt.");
    }
    return output;
  }
);
    // Default prompt
    const defaultPrompt = `You are an expert school safety assessment analyst at Safer School Solutions, Inc. Your task is to generate a comprehensive, premium-quality safety assessment report that justifies significant investment and demonstrates exceptional value. This report must be thorough, detailed, and professionally comprehensive - minimum 15 pages of substantive content.

**PREMIUM SAFETY ASSESSMENT REPORT FRAMEWORK**

**CONTENT REQUIREMENTS:**
- Generate comprehensive, detailed content that demonstrates exceptional value
- Minimum 15 pages of substantive analysis and recommendations
- Include specific data points, metrics, and quantifiable findings
- Provide detailed explanations and context for all findings
- Use professional language and industry-standard terminology
- Reference relevant safety standards, regulations, and best practices

**MANDATORY REPORT STRUCTURE:**

1. **Executive Summary (1-2 pages)**
   - Comprehensive overview of assessment scope and methodology
   - Key findings summary with quantitative data
   - Critical recommendations overview
   - Overall safety rating and risk assessment summary

2. **Methodology and Scope (2-3 pages)**
   - Detailed assessment methodology and approach
   - Scope of evaluation including areas covered
   - Standards and frameworks referenced
   - Data collection methods and validation processes
   - Assessment team qualifications and expertise
   - Timeline and duration of assessment activities

3. **Detailed Safety Analysis (4-6 pages)**
   - Comprehensive analysis by domain (People, Process, Technology)
   - Quantitative safety metrics and performance indicators
   - Benchmark comparisons against industry standards
   - Trend analysis and historical data review
   - Incident analysis and near-miss evaluation
   - Environmental and situational factors assessment

4. **Risk Assessment Matrix (2-3 pages)**
   - Comprehensive risk identification and categorization
   - Detailed risk matrix with probability and impact analysis
   - Critical, moderate, and low-risk classifications
   - Risk mitigation strategies and controls evaluation
   - Residual risk assessment after current controls
   - Risk tolerance and acceptance criteria

5. **Compliance Evaluation (2-3 pages)**
   - Detailed review against applicable safety standards
   - Federal, state, and local regulation compliance status
   - Industry best practice alignment assessment
   - Compliance gaps identification and analysis
   - Regulatory change impact assessment
   - Certification and accreditation status review

6. **Recommendations and Action Plan (2-3 pages)**
   - Immediate actions (0-30 days) with detailed implementation steps
   - Short-term initiatives (30-90 days) with resource requirements
   - Long-term strategic improvements (90+ days) with ROI analysis
   - Implementation roadmap with milestones and success metrics
   - Resource allocation and budget considerations
   - Training and development recommendations

7. **Conclusion (1 page)**
   - Comprehensive summary of overall safety posture
   - Key achievements and areas of excellence
   - Priority focus areas for improvement
   - Long-term safety vision and strategic direction

**QUALITY STANDARDS:**
- Each section must be substantive and detailed
- Include specific examples and case studies where relevant
- Provide quantitative data and metrics throughout
- Reference specific questions and findings from the assessment
- Use professional formatting with clear headings and subheadings
- Include actionable recommendations with clear implementation guidance

**DOMAIN FRAMEWORK (Enhanced):**
Each domain section must include:
- Detailed strengths analysis with supporting evidence
- Comprehensive areas for improvement with root cause analysis
- Site-specific observations with contextual factors
- Quantitative metrics and performance indicators
- Benchmark comparisons and industry standards alignment
- Detailed recommendations with implementation roadmaps
- Resource requirements and cost-benefit analysis

**FORMATTING AND PRESENTATION:**
- Professional, authoritative tone throughout
- Clear hierarchical structure with numbered sections
- Detailed explanations that demonstrate expertise
- Specific data points and quantifiable findings
- Professional tables, charts, and visual elements
- Comprehensive cross-references and citations
- Industry-standard terminology and best practices

**VALUE DEMONSTRATION:**
- Provide detailed analysis that justifies premium pricing
- Include comprehensive insights not available elsewhere
- Demonstrate deep expertise and professional knowledge
- Offer specific, actionable recommendations with clear ROI
- Present findings in a way that enables immediate implementation
- Show understanding of complex safety management challenges

**CONTENT DEPTH REQUIREMENTS:**
- Each major section should contain multiple subsections
- Provide detailed explanations and context for all findings
- Include specific examples and case studies
- Reference industry standards and regulatory requirements
- Offer comparative analysis and benchmarking data
- Present comprehensive implementation guidance

Completion Data:
{{completionData}}

Assignment Data:
{{assignmentData}}

Account Name:
{{{accountName}}}

CRITICAL INSTRUCTIONS:
- Generate a comprehensive, detailed report that meets the minimum 15-page requirement
- Ensure each section is substantive and provides significant value
- Include specific data points, metrics, and quantifiable findings throughout
- Provide detailed explanations and context for all observations
- Use professional language that demonstrates expertise and authority
- Include comprehensive recommendations with detailed implementation guidance
- Reference specific assessment questions and findings with [Q#] notation
- Maintain a professional, coaching tone that encourages improvement
- Ensure the report justifies premium pricing through exceptional depth and quality

Remember: This is a premium assessment report that clients invest significantly in. Every section must demonstrate exceptional value, professional expertise, and comprehensive analysis that enables immediate implementation of safety improvements.`;

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