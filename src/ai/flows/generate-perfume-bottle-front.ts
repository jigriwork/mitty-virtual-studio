'use server';
/**
 * @fileOverview An AI agent for generating a photorealistic front view of a perfume bottle.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { type GenerateProductViewInput, GenerateProductViewInputSchema } from './types';
import { requireGeneratedImage } from './image-output';
import { IMAGE_GENERATION_MODEL } from './model-names';
import { buildInputColorLockInstruction, buildProductOnlyNoPersonInstruction } from './product-accuracy-lock';

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
    const promptText = `Generate an ultra-realistic, high-resolution, professional e-commerce studio photograph of a single MITTY perfume bottle from the front. This must look like a premium HD product listing image shot in a professional photography studio with DSLR equipment, NOT a phone photo.

${buildProductOnlyNoPersonInstruction()}

${buildInputColorLockInstruction(input)}

Use the uploaded perfume bottle reference image to match the exact bottle shape, material, ${input.color || ''}, cap style, label design, and MITTY logo placement. The MITTY logo and brand name must remain untouched and perfectly readable.

The bottle must stand upright, centered in the frame on a clean, premium light background (soft beige or off-white seamless studio backdrop) with a soft natural shadow underneath. Lighting should feel luxurious with gentle reflections on the glass. Use even, diffuse, soft-box studio lighting. No harsh shadows, no phone shadows, no warm color cast.

Do not add or modify any text or branding. Do not tilt or crop the bottle. Final output must be pin-sharp, high-detail, HD quality with professional studio aesthetics suitable for a premium e-commerce product listing page.`;

    const {media} = await ai.generate({
      model: IMAGE_GENERATION_MODEL,
      prompt: [{media: {url: input.bottleImageUri!}}, {text: promptText}],
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    return {perfumeBottleFront: requireGeneratedImage(media, 'Perfume bottle front generation')};
  }
);
