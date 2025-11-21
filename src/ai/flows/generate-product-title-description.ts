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
  detectedColor: z.string().describe('The main color of the product. This MUST be the user-provided color if available, otherwise it is detected from the uploaded image(s). For example: "Navy Blue", "Olive Green", "Beige", "Teal".'),
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
  prompt: `You are an expert product description writer for the fashion and lifestyle brand MITTY.

  Based on the following product details and image(s), you will:
  1.  Determine the final color. **If a 'User-provided Color' exists and is not 'N/A', you MUST use that exact value for the color.** Otherwise, you must accurately detect the primary color from the product image(s). Return this final color in the 'detectedColor' field. Be very specific with color names (e.g., "Teal", "Olive Green", "Navy Blue", not just "Blue" or "Green").
  2.  Generate a product title using the final color.
  3.  Generate a product description using the final color.

  The product title MUST always start with "Mitty".

  **If the productCategory is 'Trousers':**
  - The title must be in the format: "Mitty [Detected Color] [Fit Type] [Fabric Type] Formal Trousers for Men"
  - The description must be in this exact format: "Elevate your formal wardrobe with these [Detected Color] formal trousers from MITTY. Crafted from premium [Fabric Type] fabric, these trousers offer a refined [Fit Type] and [Material Stretch Text]. The mid-rise design with crisp pleats and neat welt pockets makes it an ideal choice for office wear, events, or festive occasions. Pair it with a tucked-in shirt and formal shoes for a sharp, confident look."
      - For [Material Stretch Text], use "subtle stretch for maximum comfort" if materialStretch is 'Yes', otherwise use "a classic structure for a sharp look".

  **If the productCategory is 'Perfume':**
  - The title should be in the format: "Mitty [Fragrance Name] [Perfume Type] for [Target]" (e.g., Mitty Midnight Bloom Extrait De Parfum for Women). Invent a creative, suitable fragrance name based on the family and target audience. The Perfume Type MUST always be "Extrait De Parfum".
  - The description should be engaging and evoke the scent's character, mentioning the fragrance family, key notes (you can invent 2-3 plausible notes), type ("Extrait De Parfum"), and size.

  **For all other product categories (Shirt, Shoes, etc.):**
  - The title should include the color/pattern, sleeve/type, and gender. Example: "Mitty Beige Rose Floral Print Full Sleeve Shirt for Men"
  - The description should include details about the color, fabric, print/pattern type, button/collar details, fit, and ideal occasions.

  **Product Details:**
  Product Category: {{{productCategory}}}
  Sleeve Type: {{#if sleeveType}}{{{sleeveType}}}{{else}}N/A{{/if}}
  Fit Type: {{#if fitType}}{{{fitType}}}{{else}}N/A{{/if}}
  Material Stretch: {{#if materialStretch}}{{{materialStretch}}}{{else}}N/A{{/if}}
  Gender/Target: {{{gender}}}
  Fabric Type: {{#if fabricType}}{{{fabricType}}}{{else}}N/A{{/if}}
  Pattern: {{#if pattern}}{{{pattern}}}{{else}}N/A{{/if}}
  User-provided Color: {{#if color}}{{{color}}}{{else}}N/A{{/if}}

  {{#if fragranceFamily}}
  Fragrance Family: {{{fragranceFamily}}}
  Perfume Type: Extrait De Parfum
  Size (ml): {{{sizeMl}}}
  {{/if}}
  
  **Product Image(s):**
  {{#if productImage}}{{media url=productImage}}{{/if}}
  {{#if productImageFront}}{{media url=productImageFront}}{{/if}}
  {{#if productImageFabric}}{{media url=productImageFabric}}{{/if}}
  {{#if productImageBack}}{{media url=productImageBack}}{{/if}}
  {{#if bottleImageUri}}{{media url=bottleImageUri}}{{/if}}
  {{#if boxFrontImageUri}}{{media url=boxFrontImageUri}}{{/if}}

  Now, determine the final color and generate the title and description based on these instructions.
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
