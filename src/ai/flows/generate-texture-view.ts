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
    const stretchDesc = input.materialStretch === 'Yes' ? 'stretchable' : 'non-stretchable';
    const promptText = `Generate an ultra-realistic, high-resolution, professional e-commerce close-up macro photograph of the trouser's thigh or upper hip area, showcasing the texture of the ${stretchDesc} ${input.fabricType} in ${input.color}. This must look like a premium HD product detail shot from a professional studio, not a phone photo.

The final image color MUST be ${input.color}. Match the weave, grain, and finish from the uploaded texture reference, but do not use the color from the reference image. No alterations or smoothing. Use soft, even, diffuse studio lighting and a clean background to keep the texture natural and realistic. If the brand tag is visible in the original, preserve it. Final output must be pin-sharp, high-detail, HD quality suitable for a premium e-commerce product page.`;
    
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
