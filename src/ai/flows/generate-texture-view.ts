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
import { buildTrouserAccuracyInstructions } from './product-accuracy-lock';

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
    const promptText = `Generate an ultra-realistic, high-resolution, professional e-commerce pure fabric-only close-up macro photograph of the trouser fabric, showcasing the texture of the ${stretchDesc} ${input.fabricType} in ${input.color}. This must look like a premium HD product detail shot from a professional studio, not a phone photo.

Texture output must be pure fabric only and fully tag-free: no waistband, no belt loops, no seams, no buttons, no tags, no labels, no pockets, no garment edge, no model, no hanger, no retail tag, no hanging tag, no logo, no text, no side tab, no back tab, no patch, no inner label, no waistband label, no branding element.

The final image color MUST be ${input.color}. Preserve the weave, texture, fiber appearance, grain, finish, and true color from the uploaded fabric close-up reference. No alterations, smoothing, invented pattern, invented logo, or garment construction details. Use soft, even, diffuse studio lighting and a clean background to keep the texture natural and realistic. Final output must be pin-sharp, high-detail, HD quality suitable for a premium e-commerce product page.

${buildTrouserAccuracyInstructions(input)}`;
    
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
