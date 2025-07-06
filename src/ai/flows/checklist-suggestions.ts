// src/ai/flows/checklist-suggestions.ts
'use server';
/**
 * @fileOverview A checklist suggestion AI agent based on a described issue.
 *
 * - suggestChecklist - A function that suggests checklist items based on the issue description.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { SuggestChecklistInputSchema, SuggestChecklistOutputSchema, type SuggestChecklistInput, type SuggestChecklistOutput } from '@/lib/schemas';

export async function suggestChecklist(input: SuggestChecklistInput): Promise<SuggestChecklistOutput> {
  return suggestChecklistFlow(input);
}

const suggestChecklistPrompt = ai.definePrompt({
  name: 'suggestChecklistPrompt',
  input: {schema: SuggestChecklistInputSchema},
  output: {schema: SuggestChecklistOutputSchema},
  prompt: `You are an expert agricultural operations manager. A user has described an issue they are facing. 
  
Your task is to analyze the issue and generate a concise, step-by-step checklist of actionable items to resolve it. The checklist should be practical and easy to follow.

Issue description: {{{issueDescription}}}

Provide the recommended action items for the checklist.`,
});

const suggestChecklistFlow = ai.defineFlow(
  {
    name: 'suggestChecklistFlow',
    inputSchema: SuggestChecklistInputSchema,
    outputSchema: SuggestChecklistOutputSchema,
  },
  async input => {
    const {output} = await suggestChecklistPrompt(input);
    return output!;
  }
);
