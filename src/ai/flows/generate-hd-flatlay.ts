'use server';

/**
 * @fileOverview Generates a high-definition flat lay image of the product, or a top-down view for shoes.
 *
 * - generateHdFlatlay - A function that handles the generation of HD flat lay images.
 * - GenerateProductViewInput - The input type for the generateHdFlatlay function.
 * - GenerateHdFlatlayOutput - The return type for the generateHdFlatlay function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { GenerateProductViewInputSchema, type GenerateProductViewInput } from './types';

const GenerateHdFlatlayOutputSchema = z.object({
  hdFlatlayImage: z
    .string()
    .describe(
      'The generated high-definition flat lay or top-view image of the product, as a data URI.'
    ),
});
export type GenerateHdFlatlayOutput = z.infer<typeof GenerateHdFlatlayOutputSchema>;

export async function generateHdFlatlay(input: GenerateProductViewInput): Promise<GenerateHdFlatlayOutput> {
  return generateHdFlatlayFlow(input);
}

const generateHdFlatlayFlow = ai.defineFlow(
  {
    name: 'generateHdFlatlayFlow',
    inputSchema: GenerateProductViewInputSchema,
    outputSchema: GenerateHdFlatlayOutputSchema,
  },
  async input => {
    let promptText;

    if (input.productCategory === 'Shoes') {
        const material = input.fabricType;
        const color = input.color || 'specified';
        const forGender = input.gender === 'Male' ? "men's" : "women's";
        promptText = `Generate a high-resolution top view (flat lay) image of a single ${forGender} formal lace-up shoe in ${material} and ${color}. The shoe should lie flat with laces and collar clearly visible from above.

Do not add any brand names or logos.

Maintain true-to-life stitching, texture, and lace details. No modifications to the shoe shape or style. Use clean lighting and neutral background for a professional ecommerce feel. Match the uploaded image closely.`
    } else {
        promptText = `Enhance the uploaded product image into a clean, high-resolution flat lay. Retain the exact button placement, and color tone. Do not add or alter any brand logos.

Improve lighting, remove background shadows, and increase sharpness while preserving fabric texture and print accuracy. Do not alter the product's layout or style.

The result should look studio-shot and realistic — suitable for ecommerce product listing. Keep proportions natural.`
    }
    
    const {media} = await ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: [
        {media: {url: input.productImage}},
        { text: promptText },
      ],
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    return {hdFlatlayImage: media!.url!};
  }
);
