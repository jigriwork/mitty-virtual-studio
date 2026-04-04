'use server';
/**
 * @fileOverview An AI agent for generating a photorealistic back view of a perfume box.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { type GenerateProductViewInput, GenerateProductViewInputSchema } from './types';

const GeneratePerfumeBoxBackOutputSchema = z.object({
  perfumeBoxBack: z.string().describe("A photorealistic image of the perfume box's back view, as a data URI."),
});
export type GeneratePerfumeBoxBackOutput = z.infer<typeof GeneratePerfumeBoxBackOutputSchema>;

export async function generatePerfumeBoxBack(input: GenerateProductViewInput): Promise<GeneratePerfumeBoxBackOutput> {
  return generatePerfumeBoxBackFlow(input);
}

const generatePerfumeBoxBackFlow = ai.defineFlow(
  {
    name: 'generatePerfumeBoxBackFlow',
    inputSchema: GenerateProductViewInputSchema,
    outputSchema: GeneratePerfumeBoxBackOutputSchema,
  },
  async (input) => {
    
    const promptText = `Generate an ultra-realistic, high-resolution e-commerce photograph of the MITTY perfume box from the back.
Use the uploaded box back reference image to match the exact positions of text blocks, barcode, safety icons,
ingredients, and MITTY branding elements. Do not invent or change any text or symbols.

The box must be shot straight-on against the same light background as the front box image, with matching lighting and shadows.
All text should be sharp and readable.`

    const {media} = await ai.generate({
      model: 'googleai/imagen-2',
      prompt: [{media: {url: input.boxBackImageUri!}}, {text: promptText}],
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    return {perfumeBoxBack: media!.url!};
  }
);
