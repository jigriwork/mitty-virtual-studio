'use server';

/**
 * @fileOverview An AI agent for generating a photorealistic back view image of a product on a model.
 *
 * - generateBackView - A function that handles the back view image generation process.
 * - GenerateProductViewInput - The input type for the generateBackView function.
 * - GenerateBackViewOutput - The return type for the generateBackView function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { type GenerateProductViewInput, GenerateProductViewInputSchema } from './types';

const GenerateBackViewOutputSchema = z.object({
  backView: z.string().describe("A photorealistic image of the product's back view, as a data URI."),
});
export type GenerateBackViewOutput = z.infer<typeof GenerateBackViewOutputSchema>;

export async function generateBackView(input: GenerateProductViewInput): Promise<GenerateBackViewOutput> {
  return generateBackViewFlow(input);
}

const generateBackViewFlow = ai.defineFlow(
  {
    name: 'generateBackViewFlow',
    inputSchema: GenerateProductViewInputSchema,
    outputSchema: GenerateBackViewOutputSchema,
  },
  async (input) => {
    let promptText = '';
    let promptMedia: any[] = [];

    if (input.productCategory === 'Trousers') {
        promptText = `Generate a back view of the same model, standing straight with arms by the side, wearing the same ${input.color} ${input.fitType} ${input.materialStretch === 'Yes' ? 'stretch' : ''} trousers. Clearly show back welt pockets, seams, and waistband as shown in the uploaded product image. Use the same lighting and background as the front view. Fabric must still show ${input.materialStretch === 'Yes' ? 'slight stretch' : 'a standard fall'} and a clean finish. No model pose changes.`;
         promptMedia = [
            {media: {url: input.productImageFront!}},
            {media: {url: input.productImageFabric!}},
            {media: {url: input.productImageBack!}},
        ];
    } else if (input.productCategory === 'Shoes') {
      const material = input.fabricType;
      const color = input.color || 'specified';
      const forGender = input.gender === 'Male' ? "men's" : "women's";
      promptText = `Generate a photorealistic back view of a single ${forGender} formal shoe in ${color} and ${material}, showing the heel side. The image should focus on the heel shape, stitching, and upper collar detail.

Use a clean studio background (light beige). No AI distortions. Shoe must look premium, formal, and should match the uploaded image’s design perfectly. Ideal for ecommerce product display.`;
      promptMedia = [{media: {url: input.productImage!}}];
    } else {
      const sleeveType = input.productCategory === 'Shirt' ? input.sleeveType : '';
      const productDescription = `${input.fabricType} ${sleeveType} ${input.productCategory.toLowerCase()}`.trim();
      const gender = input.gender.toLowerCase();
      const forGender = gender === 'male' ? 'men' : 'women';
      const colorPattern = `with a ${input.color || 'specified'} base and ${input.pattern || 'specified'} design`;

      promptText = `Generate a photorealistic back view of the same ${gender} model standing straight in a studio setup, wearing the same ${productDescription} for ${forGender} ${colorPattern}, based on the uploaded product image.

The model should face away from the camera, arms naturally at the side. Shirt should fit cleanly with no wrinkles or folds. Sleeves must be worn straight — not rolled or pushed up.

Background should remain the same as front and side views (solid beige). Shirt pattern should continue realistically on the back, matching style and fabric shown in the uploaded image. Model must be identical to other views.`;
      promptMedia = [{media: {url: input.productImage!}}];
    }

    const {media} = await ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: [...promptMedia, {text: promptText}],
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    return {backView: media!.url!};
  }
);
