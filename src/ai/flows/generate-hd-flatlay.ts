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

type PromptMedia = {media: {url: string}};

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
    let promptText = '';
    let promptMedia: PromptMedia[] = [];

    if (input.productCategory === 'Trousers') {
        promptText = `Generate a clean, high-resolution flat lay image of the ${input.color} formal trousers based on the uploaded product photo. Show them fully spread and neatly arranged, with waistband, belt loops, and front pocket lines visible. Ensure the MITTY tag/logo remains untouched and readable. Use white or beige background with soft shadows and sharp focus. This image will be used directly for ecommerce listing.`;
        promptMedia = [
            {media: {url: input.productImageFront!}},
            {media: {url: input.productImageFabric!}},
            {media: {url: input.productImageBack!}},
        ];
    } else if (input.productCategory === 'Shoes') {
        const material = input.fabricType;
        const color = input.color || 'specified';
        const forGender = input.gender === 'Male' ? "men's" : "women's";
        promptText = `Generate a high-resolution, professional e-commerce studio photograph of a PAIR of ${forGender} formal shoes, viewed from an elevated, angled top-down perspective. The shoes, made of ${color} ${material}, must perfectly match the style of the uploaded image. They should be arranged neatly side-by-side on a solid light grey background (hex #f0f2f5). This view should clearly display the shoe's opening (collar), insole, and the top-down shape of the toe box. Lighting must be soft and diffuse to eliminate harsh shadows and accurately represent the material's color and texture. The image must be exceptionally sharp and clean. Do not add any brand names or logos.`
        promptMedia = [{media: {url: input.productImage!}}];
    } else {
        promptText = `Enhance the uploaded shirt image into a clean, high-resolution flat lay. Retain the exact branding (MITTY logo), button placement, and color tone.

Improve lighting, remove background shadows, and increase sharpness while preserving fabric texture and print accuracy. Do not alter the shirt's layout, style, or logo.

The result should look studio-shot and realistic — suitable for ecommerce product listing. Keep proportions natural and logo untouched.`
        promptMedia = [{media: {url: input.productImage!}}];
    }
    
    const {media} = await ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: [ ...promptMedia, { text: promptText } ],
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    return {hdFlatlayImage: media!.url!};
  }
);
