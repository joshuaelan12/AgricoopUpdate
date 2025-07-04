// src/ai/flows/checklist-suggestions.ts
'use server';
/**
 * @fileOverview A checklist suggestion AI agent based on issue type.
 *
 * - suggestChecklist - A function that suggests checklist items based on the issue type.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { SuggestChecklistInputSchema, SuggestChecklistOutputSchema, type SuggestChecklistInput, type SuggestChecklistOutput } from '@/lib/schemas';

export async function suggestChecklist(input: SuggestChecklistInput): Promise<SuggestChecklistOutput> {
  return suggestChecklistFlow(input);
}

const issueToActionItemsTool = ai.defineTool({
  name: 'getIssueActionItems',
  description: 'Returns a list of action items based on the issue type.',
  inputSchema: z.object({
    issueType: z
      .string()
      .describe('The type of issue reported (e.g., pest infestation, equipment malfunction).'),
  }),
  outputSchema: z.array(z.string()),
}, async (input) => {
  const issueType = input.issueType;

  switch (issueType) {
    case 'pest infestation':
      return [
        'Identify the pest.',
        'Assess the extent of the infestation.',
        'Select appropriate pest control method.',
        'Apply pest control measures.',
        'Monitor effectiveness of treatment.',
      ];
    case 'equipment malfunction':
      return [
        'Inspect the equipment for damage.',
        'Diagnose the cause of the malfunction.',
        'Repair or replace faulty parts.',
        'Test the equipment after repair.',
        'Schedule preventive maintenance.',
      ];
    case 'irrigation problem':
      return [
        'Check water source and supply lines.',
        'Inspect irrigation system for leaks or blockages.',
        'Adjust water pressure and flow rate.',
        'Repair or replace damaged components.',
        'Monitor soil moisture levels.',
      ];
    case 'soil degradation':
      return [
        'Conduct soil tests to determine nutrient deficiencies.',
        'Apply soil amendments to improve soil fertility.',
        'Implement erosion control measures.',
        'Practice crop rotation to enhance soil health.',
        'Monitor soil organic matter content.',
      ];
    default:
      return [
        'Investigate the issue thoroughly.',
        'Identify potential causes of the issue.',
        'Develop a plan of action to address the issue.',
        'Implement the plan of action.',
        'Monitor progress and adjust as needed.',
      ];
  }
});

const suggestChecklistPrompt = ai.definePrompt({
  name: 'suggestChecklistPrompt',
  tools: [issueToActionItemsTool],
  input: {schema: SuggestChecklistInputSchema},
  output: {schema: SuggestChecklistOutputSchema},
  prompt: `You are an AI assistant helping project managers create checklists based on reported issue types. The project manager will provide the issue type, and you will use the getIssueActionItems tool to determine what action items to add to the checklist.

Given the issue type: {{{issueType}}}, what are the recommended action items for the checklist? Please use the getIssueActionItems tool to determine the list of action items.`, 
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
