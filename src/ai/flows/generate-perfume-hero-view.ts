'use server';
/**
 * @fileOverview An AI agent for generating a photorealistic hero view of a perfume bottle and box.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { type GenerateProductViewInput, GenerateProductViewInputSchema } from './types';
import { requireGeneratedImage } from './image-output';
import { IMAGE_GENERATION_MODEL } from './model-names';

const GeneratePerfumeHeroViewOutputSchema = z.object({
  perfumeHeroView: z.string().describe("A photorealistic hero image of the perfume bottle and box, as a data URI."),
});
export type GeneratePerfumeHeroViewOutput = z.infer<typeof GeneratePerfumeHeroViewOutputSchema>;

export async function generatePerfumeHeroView(input: GenerateProductViewInput): Promise<GeneratePerfumeHeroViewOutput> {
  return generatePerfumeHeroViewFlow(input);
}

const generatePerfumeHeroViewFlow = ai.defineFlow(
  {
    name: 'generatePerfumeHeroViewFlow',
    inputSchema: GenerateProductViewInputSchema,
    outputSchema: GeneratePerfumeHeroViewOutputSchema,
  },
  async (input) => {
    
    const promptText = `Generate a beautiful, ultra-realistic e-commerce hero photograph showing the MITTY perfume bottle and its box together.
Use the uploaded reference images for the bottle and box to ensure perfect accuracy.

The bottle should be positioned slightly in front of the box. The box can be at a slight angle to add depth.
Both items must be on a clean, premium light background (soft beige or off-white) with soft, natural shadows that ground them in the scene.
The lighting should be luxurious and professional, suitable for a main product banner.
Ensure both the bottle and box perfectly match the branding, colors, and design from the reference images. Do not add or change any text.`

    if (!input.bottleImageUri) {
       throw new Error('Bottle image is required for hero view.');
    }

    // Try with both images first
    if (input.boxFrontImageUri) {
      try {
        const {media} = await ai.generate({
          model: IMAGE_GENERATION_MODEL,
          prompt: [
            {media: {url: input.bottleImageUri}},
            {media: {url: input.boxFrontImageUri}},
            {text: promptText}
          ],
          config: {
            responseModalities: ['TEXT', 'IMAGE'],
          },
        });

        if (media?.url) {
          return {perfumeHeroView: media.url};
        }
      } catch (e) {
        console.warn("Failed to generate hero view with both images, falling back to single image.", e);
      }
    }

    // Fallback: Use only the bottle image
    const fallbackPrompt = promptText + "\n\nNote: Generating with bottle reference only. Render a matching box behind it.";
    const {media, text} = await ai.generate({
      model: IMAGE_GENERATION_MODEL,
      prompt: [
        {media: {url: input.bottleImageUri}},
        {text: fallbackPrompt}
      ],
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    if (!media?.url) {
      throw new Error(`Failed to generate image. Model output: ${text || 'No text output'}`);
    }

    return {perfumeHeroView: requireGeneratedImage(media, 'Perfume hero generation')};
  }
);
