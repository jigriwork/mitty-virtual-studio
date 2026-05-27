'use server';
/**
 * @fileOverview An AI agent for generating a photorealistic front view of a perfume box.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { type GenerateProductViewInput, GenerateProductViewInputSchema } from './types';
import { requireGeneratedImage } from './image-output';
import { IMAGE_GENERATION_MODEL } from './model-names';
import { buildInputColorLockInstruction, buildProductOnlyNoPersonInstruction } from './product-accuracy-lock';

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
    const promptText = `Generate an ultra-realistic, high-resolution, professional e-commerce studio photograph of the MITTY perfume box from the front. This must look like a premium HD product listing image shot in a professional photography studio with DSLR equipment, NOT a phone photo.

${buildProductOnlyNoPersonInstruction()}

${buildInputColorLockInstruction(input)}

Use the uploaded box front reference image to match the exact design, typography, logo size, and layout. Follow the colour lock for final packaging colour. Do not modify the MITTY branding, text, or layout in any way.

The box must be photographed straight-on, centered on a clean soft beige or off-white seamless studio backdrop, with soft, clean shadows. Use even, diffuse, soft-box studio lighting. No harsh shadows, no phone shadows, no warm color cast.

Final output must be pin-sharp, high-detail, HD quality with professional studio aesthetics suitable for a premium e-commerce product listing page.`;

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
