'use server';

/**
 * @fileOverview An AI agent for generating a photorealistic front view image of a product on a model.
 *
 * - generateFrontView - A function that handles the front view image generation process.
 * - GenerateFrontViewOutput - The return type for the generateFrontView function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { GenerateProductViewInputSchema, type GenerateProductViewInput } from './types';


const GenerateFrontViewOutputSchema = z.object({
  frontView: z.string().describe("A photorealistic image of the product's front view, as a data URI."),
});
export type GenerateFrontViewOutput = z.infer<typeof GenerateFrontViewOutputSchema>;

export async function generateFrontView(input: GenerateProductViewInput): Promise<GenerateFrontViewOutput> {
  return generateFrontViewFlow(input);
}

const generateFrontViewFlow = ai.defineFlow(
  {
    name: 'generateFrontViewFlow',
    inputSchema: GenerateProductViewInputSchema,
    outputSchema: GenerateFrontViewOutputSchema,
  },
  async (input) => {
    let promptText = '';

    if (input.productCategory === 'Shoes') {
        const material = input.fabricType;
        const color = input.color || 'specified';
        const forGender = input.gender === 'Male' ? "men's" : "women's";
        promptText = `Generate a photorealistic image of a single ${forGender} formal lace-up shoe in ${material} with a ${color} finish, facing forward. This image should show the shoe standing upright, front-facing, with clear laces and toe structure visible.

Use a light beige or neutral studio background. The image should be realistic with clean shadows, no reflections, and suitable for ecommerce use. The shoe should match the style, texture, and stitching of the uploaded product image — no AI artifacts or distortions.`;
    } else {
      const sleeveType = input.productCategory === 'Shirt' ? input.sleeveType : '';
      const productDescription = `${input.fabricType} ${sleeveType} ${input.productCategory.toLowerCase()}`.trim();
      const gender = input.gender.toLowerCase();
      const forGender = gender === 'male' ? 'men' : 'women';
      const colorPattern = `with a ${input.color || 'specified'} base and ${input.pattern || 'specified'} design`;

      promptText = `Generate a photorealistic front view of a ${gender} model standing straight in a studio setup. He is wearing a ${productDescription} for ${forGender} ${colorPattern}, accurately reflecting the style and print of the uploaded product image.

The model should have a neutral expression, facing forward, with both arms straight and visible. Shirt sleeves must not be folded. The ${input.productCategory.toLowerCase()} should be well-fitted, ironed, and worn with black trousers.

The lighting should be clean and soft, like a professional ecommerce photoshoot. The ${input.productCategory.toLowerCase()} must match the uploaded product exactly — including button color, collar style, and print placement.

Background should be solid beige or light grey. The model’s face must remain the same across all other views.`;
    }

    const {media} = await ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: [{media: {url: input.productImage}}, {text: promptText}],
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    return {frontView: media!.url!};
  }
);
