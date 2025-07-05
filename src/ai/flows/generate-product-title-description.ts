'use server';

/**
 * @fileOverview Generates a product title, description, and detects color based on product details and an uploaded image.
 *
 * - generateProductTitleDescription - A function that handles the generation of the product title and description.
 * - GenerateProductTitleDescriptionOutput - The return type for the generateProductTitleDescription function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { GenerateProductViewInputSchema, type GenerateProductViewInput } from './types';


const GenerateProductTitleDescriptionOutputSchema = z.object({
  productTitle: z.string().describe('The generated product title, starting with "Mitty".'),
  productDescription: z.string().describe('The generated product description, including details about color, fabric, pattern, fit, and ideal occasions.'),
  detectedColor: z.string().describe('The main color of the product detected from the uploaded image(s). For example: "Navy Blue", "Olive Green", "Beige".'),
});
export type GenerateProductTitleDescriptionOutput = z.infer<typeof GenerateProductTitleDescriptionOutputSchema>;

export async function generateProductTitleDescription(
  input: GenerateProductViewInput
): Promise<GenerateProductTitleDescriptionOutput> {
  return generateProductTitleDescriptionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateProductTitleDescriptionPrompt',
  input: {schema: GenerateProductViewInputSchema},
  output: {schema: GenerateProductTitleDescriptionOutputSchema},
  prompt: `You are an expert product description writer for the fashion brand MITTY.

  Based on the following product details and image(s), you will:
  1.  Accurately detect the primary color of the product from the image(s) and return it in the 'detectedColor' field.
  2.  Generate a product title.
  3.  Generate a product description.

  The product title MUST always start with "Mitty".

  **If the productCategory is 'Trousers':**
  - The title must be in the format: "Mitty [Detected Color] [Fit Type] [Fabric Type] Formal Trousers for Men"
  - The description must be in this exact format: "Elevate your formal wardrobe with these [Detected Color] formal trousers from MITTY. Crafted from premium [Fabric Type] fabric, these trousers offer a refined [Fit Type] and [Material Stretch Text]. The mid-rise design with crisp pleats and neat welt pockets makes it an ideal choice for office wear, events, or festive occasions. Pair it with a tucked-in shirt and formal shoes for a sharp, confident look."
      - For [Material Stretch Text], use "subtle stretch for maximum comfort" if materialStretch is 'Yes', otherwise use "a classic structure for a sharp look".

  **For all other product categories (Shirt, Shoes, etc.):**
  - The title should include the color/pattern, sleeve/type, and gender. Example: "Mitty Beige Rose Floral Print Full Sleeve Shirt for Men"
  - The description should include details about the color, fabric, print/pattern type, button/collar details, fit, and ideal occasions.

  **Product Details:**
  Product Category: {{{productCategory}}}
  Sleeve Type: {{#if sleeveType}}{{{sleeveType}}}{{else}}N/A{{/if}}
  Fit Type: {{#if fitType}}{{{fitType}}}{{else}}N/A{{/if}}
  Material Stretch: {{#if materialStretch}}{{{materialStretch}}}{{else}}N/A{{/if}}
  Gender: {{{gender}}}
  Fabric Type: {{{fabricType}}}
  Pattern: {{#if pattern}}{{{pattern}}}{{else}}N/A{{/if}}
  User-provided Color (use for reference if available, but prioritize image detection): {{#if color}}{{{color}}}{{else}}N/A{{/if}}
  
  **Product Image(s):**
  {{#if productImage}}{{media url=productImage}}{{/if}}
  {{#if productImageFront}}{{media url=productImageFront}}{{/if}}
  {{#if productImageFabric}}{{media url=productImageFabric}}{{/if}}
  {{#if productImageBack}}{{media url=productImageBack}}{{/if}}

  Now, detect the color and generate the title and description based on these instructions.
  `,
});

const generateProductTitleDescriptionFlow = ai.defineFlow(
  {
    name: 'generateProductTitleDescriptionFlow',
    inputSchema: GenerateProductViewInputSchema,
    outputSchema: GenerateProductTitleDescriptionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
