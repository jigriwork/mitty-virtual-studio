'use server';

/**
 * @fileOverview An AI agent for generating a photorealistic side view image of a product on a model.
 *
 * - generateSideView - A function that handles the side view image generation process.
 * - GenerateProductViewInput - The input type for the generateSideView function.
 * - GenerateSideViewOutput - The return type for the generateSideView function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { type GenerateProductViewInput, GenerateProductViewInputSchema } from './types';

const GenerateSideViewOutputSchema = z.object({
  sideView: z.string().describe("A photorealistic image of the product's side view, as a data URI."),
});
export type GenerateSideViewOutput = z.infer<typeof GenerateSideViewOutputSchema>;

export async function generateSideView(input: GenerateProductViewInput): Promise<GenerateSideViewOutput> {
  return generateSideViewFlow(input);
}

const generateSideViewFlow = ai.defineFlow(
  {
    name: 'generateSideViewFlow',
    inputSchema: GenerateProductViewInputSchema,
    outputSchema: GenerateSideViewOutputSchema,
  },
  async (input) => {
    let promptText = '';
    let promptMedia: any[] = [];

    if (input.productCategory === 'Shoes') {
      const material = input.fabricType;
      const color = input.color || 'specified';
      const forGender = input.gender === 'Male' ? "men's" : "women's";
      promptText = `Generate an ultra-realistic, e-commerce studio photograph of a single ${forGender} formal shoe, viewed from the side profile. The shoe, made of ${color} ${material}, must exactly match the style and details of the uploaded image. It should be perfectly perpendicular to the camera, showcasing the quarter, sole construction, and heel. The background must be a solid light grey (hex #f0f2f5), and the lighting should be professional and even, revealing the texture of the material. The image needs to be crisp, well-defined, and suitable for a product page.`;
      promptMedia = [{media: {url: input.productImage!}}];
    } else {
      const sleeveType = input.productCategory === 'Shirt' ? input.sleeveType : '';
      const productDescription = `${input.fabricType} ${sleeveType} ${input.productCategory.toLowerCase()}`.trim();
      const gender = input.gender.toLowerCase();
      const forGender = gender === 'male' ? 'men' : 'women';
      const colorPattern = `with a ${input.color || 'specified'} base and ${input.pattern || 'specified'} design`;

      promptText = `Generate a photorealistic side view of the same ${gender} model, turned 90 degrees to his left, in a studio environment. He is wearing the same ${productDescription} for ${forGender}, based on the uploaded product image ${colorPattern}.

The side profile should clearly show sleeve length and ${input.productCategory.toLowerCase()} fit. Sleeves should be worn normally — no folding or rolling. Use clean studio lighting and a soft beige background.

Ensure color accuracy, fabric texture, and button/collar details match the uploaded shirt image. The model must be identical to the front view — same face, hair, and posture — to ensure consistency across the product shoot.`;
      promptMedia = [{media: {url: input.productImage!}}];
    }

    const {media} = await ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: [...promptMedia, {text: promptText}],
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    return {sideView: media!.url!};
  }
);
