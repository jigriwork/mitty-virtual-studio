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
import { requireGeneratedImage } from './image-output';
import { IMAGE_GENERATION_MODEL } from './model-names';

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
    const promptText = `Generate a high-resolution close-up macro shot of the trouser’s thigh or upper hip area, showcasing the texture of the ${input.materialStretch === 'Yes' ? 'stretchable' : 'non-stretchable'} ${input.fabricType} in ${input.color}. The final image color MUST be ${input.color}. Match the weave, grain, and finish from the uploaded texture reference, but do not use the color from the reference image. No alterations or smoothing. Use soft light and clean background to keep the texture natural and realistic. If the brand tag is visible in the original, preserve it.`;
    
    const {media} = await ai.generate({
      model: IMAGE_GENERATION_MODEL,
      prompt: [{media: {url: input.productImageFabric!}}, {text: promptText}],
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    return {textureView: requireGeneratedImage(media, 'Texture view generation')};
  }
);
