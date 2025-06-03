
'use server';
/**
 * @fileOverview AI flow to summarize document content.
 *
 * - summarizeDocument - A function that takes document text and returns a summary.
 * - SummarizeDocumentInput - The input type for the summarizeDocument function.
 * - SummarizeDocumentOutput - The return type for the summarizeDocument function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeDocumentInputSchema = z.object({
  textContent: z.string().describe('The full text content of the document to be summarized.'),
  // Optionally, you could pass resourceId and have the flow fetch content if needed,
  // but passing textContent directly is simpler for this flow's purpose.
});
export type SummarizeDocumentInput = z.infer<typeof SummarizeDocumentInputSchema>;

const SummarizeDocumentOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the provided document content.'),
});
export type SummarizeDocumentOutput = z.infer<typeof SummarizeDocumentOutputSchema>;

export async function summarizeDocument(
  input: SummarizeDocumentInput
): Promise<SummarizeDocumentOutput> {
  return summarizeDocumentFlow(input);
}

const summarizeDocumentPrompt = ai.definePrompt({
  name: 'summarizeDocumentPrompt',
  input: {schema: SummarizeDocumentInputSchema},
  output: {schema: SummarizeDocumentOutputSchema},
  prompt: `You are an expert at summarizing documents. Please provide a concise summary (around 2-4 sentences) of the following document content. 
Focus on the key points and main purpose of the document.

Document Content:
{{{textContent}}}

Output the summary directly.
`,
});

const summarizeDocumentFlow = ai.defineFlow(
  {
    name: 'summarizeDocumentFlow',
    inputSchema: SummarizeDocumentInputSchema,
    outputSchema: SummarizeDocumentOutputSchema,
  },
  async input => {
    const {output} = await summarizeDocumentPrompt(input);
    if (!output) {
        throw new Error("Failed to generate summary from the prompt.");
    }
    return output;
  }
);

    