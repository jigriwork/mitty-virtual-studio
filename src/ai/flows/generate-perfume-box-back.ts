'use server';
/**
 * @fileOverview An AI agent for generating a photorealistic back view of a perfume box.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { type GenerateProductViewInput, GenerateProductViewInputSchema } from './types';
import { requireGeneratedImage } from './image-output';
import { IMAGE_GENERATION_MODEL } from './model-names';
import { buildInputColorLockInstruction, buildProductOnlyNoPersonInstruction } from './product-accuracy-lock';

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
    const promptText = `Generate an ultra-realistic, high-resolution, professional e-commerce studio photograph of the MITTY perfume box from the back. This must look like a premium HD product listing image shot in a professional photography studio with DSLR equipment, NOT a phone photo.

${buildProductOnlyNoPersonInstruction()}

${buildInputColorLockInstruction(input)}

Use the uploaded box back reference image to match the exact positions of text blocks, barcode, safety icons, ingredients, and MITTY branding elements. Do not invent or change any text or symbols.

The box must be shot straight-on against the same clean light seamless studio background as the front box image, with matching lighting and shadows. Use even, diffuse, soft-box studio lighting. No harsh shadows, no phone shadows, no warm color cast.

All text should be sharp and readable. Final output must be pin-sharp, high-detail, HD quality with professional studio aesthetics suitable for a premium e-commerce product listing page.`;

    const {media} = await ai.generate({
      model: IMAGE_GENERATION_MODEL,
      prompt: [{media: {url: input.boxBackImageUri!}}, {text: promptText}],
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    return {perfumeBoxBack: requireGeneratedImage(media, 'Perfume box back generation')};
  }
);
