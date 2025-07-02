'use server';

/**
 * @fileOverview An AI agent for generating photorealistic images of a product from different angles (front, side, back) with a consistent model.
 *
 * - generateProductImages - A function that handles the product image generation process.
 * - GenerateProductImagesInput - The input type for the generateProductImages function.
 * - GenerateProductImagesOutput - The return type for the generateProductImages function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateProductImagesInputSchema = z.object({
  productCategory: z.enum(['Shirt', 'Trousers', 'Jeans', 'Shoes']).describe('The category of the product.'),
  sleeveType: z.enum(['Full Sleeve', 'Half Sleeve']).optional().describe('The sleeve type of the shirt (only applicable for shirts).'),
  gender: z.enum(['Male', 'Female']).describe('The gender for which the product is intended.'),
  fabricType: z.string().describe('The type of fabric used for the product (e.g., Linen, Cotton).'),
  productImage: z.string().describe(
    "A photo of the product, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
  ),
  color: z.string().optional().describe('The color of the product.'),
  pattern: z.string().optional().describe('The pattern of the product (e.g., Floral, Stripes, Solid).'),
});

export type GenerateProductImagesInput = z.infer<typeof GenerateProductImagesInputSchema>;

const GenerateProductImagesOutputSchema = z.object({
  frontView: z.string().describe("A photorealistic image of the product's front view, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
  sideView: z.string().describe("A photorealistic image of the product's side view, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
  backView: z.string().describe("A photorealistic image of the product's back view, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
});

export type GenerateProductImagesOutput = z.infer<typeof GenerateProductImagesOutputSchema>;

export async function generateProductImages(input: GenerateProductImagesInput): Promise<GenerateProductImagesOutput> {
  return generateProductImagesFlow(input);
}

const generateProductImagesFlow = ai.defineFlow(
  {
    name: 'generateProductImagesFlow',
    inputSchema: GenerateProductImagesInputSchema,
    outputSchema: GenerateProductImagesOutputSchema,
  },
  async input => {
    const createViewPrompt = (view: 'Front' | 'Side' | 'Back') => {
      return `Generate a single, photorealistic e-commerce photo of one ${input.gender.toLowerCase()} model from the ${view.toLowerCase()} view.
The model is wearing a ${input.fabricType} ${input.productCategory.toLowerCase()}${input.productCategory === 'Shirt' && input.sleeveType ? ` (${input.sleeveType})` : ''}.
The ${input.productCategory.toLowerCase()} has a ${input.color ? `${input.color} base` : ''}${input.color && input.pattern ? ' with ' : ''}${input.pattern ? `${input.pattern} design` : ''}, inspired by the uploaded product image.
The model should look natural and professional, standing in a studio with a clean beige or neutral background, and wearing black trousers.
The ${input.productCategory.toLowerCase()} must match the uploaded image’s pattern, color tones, and button style.
This is for an e-commerce website, so the ${input.productCategory.toLowerCase()} must look ironed, fit the model well, and be highly photorealistic.
Do not make the image look AI-generated or cartoonish. The model's face and body must be consistent across all views.
The final image must only contain one person and show the requested ${view.toLowerCase()} view.
Use clear studio lighting and ensure high image resolution.`;
    };

    const frontViewPromise = ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: [
        {media: {url: input.productImage}},
        {text: createViewPrompt('Front')},
      ],
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    const sideViewPromise = ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: [
        {media: {url: input.productImage}},
        {text: createViewPrompt('Side')},
      ],
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    const backViewPromise = ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: [
        {media: {url: input.productImage}},
        {text: createViewPrompt('Back')},
      ],
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    const [frontViewResult, sideViewResult, backViewResult] = await Promise.all(
      [frontViewPromise, sideViewPromise, backViewPromise]
    );

    return {
      frontView: frontViewResult.media!.url,
      sideView: sideViewResult.media!.url,
      backView: backViewResult.media!.url,
    };
  }
);
