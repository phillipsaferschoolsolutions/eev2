// src/ai/flows/analyze-photo.ts
'use server';
/**
 * @fileOverview AI flow to analyze a photo and identify potential safety hazards.
 *
 * - analyzePhotoForHazards - A function that analyzes the photo for hazards.
 * - AnalyzePhotoInput - The input type for the analyzePhotoForHazards function.
 * - AnalyzePhotoOutput - The return type for the analyzePhotoForHazards function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzePhotoInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a campus area, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AnalyzePhotoInput = z.infer<typeof AnalyzePhotoInputSchema>;

const AnalyzePhotoOutputSchema = z.object({
  hazards: z
    .array(z.string())
    .describe('A list of potential safety hazards identified in the photo.'),
});
export type AnalyzePhotoOutput = z.infer<typeof AnalyzePhotoOutputSchema>;

export async function analyzePhotoForHazards(
  input: AnalyzePhotoInput
): Promise<AnalyzePhotoOutput> {
  return analyzePhotoForHazardsFlow(input);
}

const analyzePhotoForHazardsPrompt = ai.definePrompt({
  name: 'analyzePhotoForHazardsPrompt',
  input: {schema: AnalyzePhotoInputSchema},
  output: {schema: AnalyzePhotoOutputSchema},
  prompt: `You are a safety inspector. Analyze the provided photo for potential safety hazards and list them.

Photo: {{media url=photoDataUri}}`,
});

const analyzePhotoForHazardsFlow = ai.defineFlow(
  {
    name: 'analyzePhotoForHazardsFlow',
    inputSchema: AnalyzePhotoInputSchema,
    outputSchema: AnalyzePhotoOutputSchema,
  },
  async input => {
    const {output} = await analyzePhotoForHazardsPrompt(input);
    return output!;
  }
);
