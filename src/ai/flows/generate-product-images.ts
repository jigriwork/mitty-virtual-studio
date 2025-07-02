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

const generateProductImagesPrompt = ai.definePrompt({
  name: 'generateProductImagesPrompt',
  input: {schema: GenerateProductImagesInputSchema},
  output: {schema: GenerateProductImagesOutputSchema},
  prompt: `You are an expert photographer specializing in generating e-commerce product images.

You will generate three photorealistic images of the product from different angles (front, side, back) with a consistent model.

Product Category: {{{productCategory}}}
Sleeve Type: {{#if sleeveType}}{{{sleeveType}}}{{else}}N/A{{/if}}
Gender: {{{gender}}}
Fabric Type: {{{fabricType}}}
Color: {{#if color}}{{{color}}}{{else}}Not specified{{/if}}
Pattern: {{#if pattern}}{{{pattern}}}{{else}}Not specified{{/if}}
Product Image: {{media url=productImage}}

Ensure all images are 100% realistic, with a consistent model face for brand continuity, and are suitable for direct upload to MITTY.CO.IN.

Output:
Front View: [A photorealistic image of the product's front view]
Side View: [A photorealistic image of the product's side view]
Back View: [A photorealistic image of the product's back view]`, 
});

const generateProductImagesFlow = ai.defineFlow(
  {
    name: 'generateProductImagesFlow',
    inputSchema: GenerateProductImagesInputSchema,
    outputSchema: GenerateProductImagesOutputSchema,
  },
  async input => {
    const frontViewPromise = ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: [
        {media: {url: input.productImage}},
        {
          text: `Generate a photorealistic front view image of the product with a consistent model. Product category: ${input.productCategory}, Gender: ${input.gender}, Fabric type: ${input.fabricType}.`,
        },
      ],
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    const sideViewPromise = ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: [
        {media: {url: input.productImage}},
        {
          text: `Generate a photorealistic side view image of the product with a consistent model. Product category: ${input.productCategory}, Gender: ${input.gender}, Fabric type: ${input.fabricType}.`,
        },
      ],
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    const backViewPromise = ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: [
        {media: {url: input.productImage}},
        {
          text: `Generate a photorealistic back view image of the product with a consistent model. Product category: ${input.productCategory}, Gender: ${input.gender}, Fabric type: ${input.fabricType}.`,
        },
      ],
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    const [frontViewResult, sideViewResult, backViewResult] = await Promise.all([
      frontViewPromise,
      sideViewPromise,
      backViewPromise,
    ]);

    return {
      frontView: frontViewResult.media!.url,
      sideView: sideViewResult.media!.url,
      backView: backViewResult.media!.url,
    };
  }
);
