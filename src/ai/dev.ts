import { config } from 'dotenv';
config();

import '@/ai/flows/analyze-photo.ts';
import '@/ai/flows/analyze-policy.ts';
import '@/ai/flows/summarize-document-flow.ts';
import '@/ai/flows/generate-report-flow.ts'; // Added new flow