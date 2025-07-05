'use server';

/**
 * @fileOverview An AI agent for generating a photorealistic close-up image of a product's texture.
 *
 * - generateTextureView - A function that handles the texture view image generation process.
 * - GenerateTextureViewOutput - The return type for the generateTextureView function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { type GenerateProductViewInput, GenerateProductViewInputSchema } from './types';

const GenerateTextureViewOutputSchema = z.object({
  textureView: z.string().describe("A photorealistic close-up image of the product's texture, as a data URI."),
});
export type GenerateTextureViewOutput = z.infer<typeof GenerateTextureViewOutputSchema>;

export async function generateTextureView(input: GenerateProductViewInput): Promise<GenerateTextureViewOutput> {
  return generateTextureViewFlow(input);
}

const generateTextureViewFlow = ai.defineFlow(
  {
    name: 'generateTextureViewFlow',
    inputSchema: GenerateProductViewInputSchema,
    outputSchema: GenerateTextureViewOutputSchema,
  },
  async (input) => {
    const promptText = `Generate a photorealistic close-up of the ${input.fabricType} ${input.color} formal trouser’s texture. The fabric should appear ${input.materialStretch === 'Yes' ? 'stretchable' : ''} and soft, clearly showing the weave and grain pattern.

Lighting should highlight the surface detail accurately. Optional brand tag (like MITTY) can be shown if present. This image is to display the feel and finish of the trousers.`;
    
    const {media} = await ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: [{media: {url: input.productImageFabric!}}, {text: promptText}],
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    return {textureView: media!.url!};
  }
);
