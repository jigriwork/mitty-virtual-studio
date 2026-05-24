'use server';
/**
 * @fileOverview An AI agent for generating a photorealistic front view of a perfume box.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { type GenerateProductViewInput, GenerateProductViewInputSchema } from './types';
import { requireGeneratedImage } from './image-output';
import { IMAGE_GENERATION_MODEL } from './model-names';

const GeneratePerfumeBoxFrontOutputSchema = z.object({
  perfumeBoxFront: z.string().describe("A photorealistic image of the perfume box's front view, as a data URI."),
});
export type GeneratePerfumeBoxFrontOutput = z.infer<typeof GeneratePerfumeBoxFrontOutputSchema>;

export async function generatePerfumeBoxFront(input: GenerateProductViewInput): Promise<GeneratePerfumeBoxFrontOutput> {
  return generatePerfumeBoxFrontFlow(input);
}

const generatePerfumeBoxFrontFlow = ai.defineFlow(
  {
    name: 'generatePerfumeBoxFrontFlow',
    inputSchema: GenerateProductViewInputSchema,
    outputSchema: GeneratePerfumeBoxFrontOutputSchema,
  },
  async (input) => {
    
    const promptText = `Generate an ultra-realistic, high-resolution e-commerce photograph of the MITTY perfume box from the front.
Use the uploaded box front reference image to match the exact design, colors, typography, logo size, and layout.
Do not modify the MITTY branding, text, or layout in any way.

The box must be photographed straight-on, centered on a clean soft beige or off-white background, with soft, clean shadows.
This image should look like a real studio packshot for ecommerce.`

    const {media} = await ai.generate({
      model: IMAGE_GENERATION_MODEL,
      prompt: [{media: {url: input.boxFrontImageUri!}}, {text: promptText}],
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    return {perfumeBoxFront: requireGeneratedImage(media, 'Perfume box front generation')};
  }
);
