'use server';
/**
 * @fileOverview An AI agent for generating a photorealistic front view of a perfume bottle.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { type GenerateProductViewInput, GenerateProductViewInputSchema } from './types';

const GeneratePerfumeBottleFrontOutputSchema = z.object({
  perfumeBottleFront: z.string().describe("A photorealistic image of the perfume bottle's front view, as a data URI."),
});
export type GeneratePerfumeBottleFrontOutput = z.infer<typeof GeneratePerfumeBottleFrontOutputSchema>;

export async function generatePerfumeBottleFront(input: GenerateProductViewInput): Promise<GeneratePerfumeBottleFrontOutput> {
  return generatePerfumeBottleFrontFlow(input);
}

const generatePerfumeBottleFrontFlow = ai.defineFlow(
  {
    name: 'generatePerfumeBottleFrontFlow',
    inputSchema: GenerateProductViewInputSchema,
    outputSchema: GeneratePerfumeBottleFrontOutputSchema,
  },
  async (input) => {
    
    const promptText = `Generate an ultra-realistic, high-resolution e-commerce studio photograph of a single MITTY perfume bottle from the front.
Use the uploaded perfume bottle reference image to match the exact bottle shape, material, ${input.color || ''}, cap style,
label design, and MITTY logo placement. The MITTY logo and brand name must remain untouched and perfectly readable.

The bottle must stand upright, centered in the frame on a clean, premium light background (soft beige or off-white) with a soft natural shadow underneath.
Lighting should feel luxurious with gentle reflections on the glass. Do not add or modify any text or branding. Do not tilt or crop the bottle.
The final image must match the real product exactly for ecommerce listing.`

    const {media} = await ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: [{media: {url: input.bottleImageUri!}}, {text: promptText}],
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    return {perfumeBottleFront: media!.url!};
  }
);
