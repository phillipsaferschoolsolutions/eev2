'use server';
/**
 * @fileOverview Policy analysis AI agent.
 *
 * - analyzePolicy - A function that handles the policy analysis process.
 * - AnalyzePolicyInput - The input type for the analyzePolicy function.
 * - AnalyzePolicyOutput - The return type for the analyzePolicy function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzePolicyInputSchema = z.object({
  policyText: z.string().describe('The text of the school safety policy to analyze.'),
});
export type AnalyzePolicyInput = z.infer<typeof AnalyzePolicyInputSchema>;

const AnalyzePolicyOutputSchema = z.object({
  gapIdentifications: z
    .array(z.string())
    .describe('List of gaps identified in the policy based on best practices.'),
  improvementSuggestions: z
    .array(z.string())
    .describe('Suggestions for improving the policy based on best practices.'),
  summary: z.string().describe('A summary of the policy analysis.'),
});
export type AnalyzePolicyOutput = z.infer<typeof AnalyzePolicyOutputSchema>;

export async function analyzePolicy(input: AnalyzePolicyInput): Promise<AnalyzePolicyOutput> {
  return analyzePolicyFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzePolicyPrompt',
  input: {schema: AnalyzePolicyInputSchema},
  output: {schema: AnalyzePolicyOutputSchema},
  prompt: `You are a policy analysis expert specializing in school safety policies.

Analyze the following school safety policy and identify any gaps or areas of improvement based on best practices.

Policy Text: {{{policyText}}}

Provide a list of gap identifications, suggestions for improvement, and a summary of the policy analysis.

Make sure that the gapIdentifications and improvementSuggestions are actionable and specific.

Output in the following JSON format:
{
  "gapIdentifications": ["gap1", "gap2", ...],
  "improvementSuggestions": ["suggestion1", "suggestion2", ...],
  "summary": "Summary of the policy analysis"
}
`,
});

const analyzePolicyFlow = ai.defineFlow(
  {
    name: 'analyzePolicyFlow',
    inputSchema: AnalyzePolicyInputSchema,
    outputSchema: AnalyzePolicyOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
