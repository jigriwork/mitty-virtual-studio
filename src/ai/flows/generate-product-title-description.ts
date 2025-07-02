// src/ai/flows/generate-product-title-description.ts
'use server';

/**
 * @fileOverview Generates a product title and description based on product details and an uploaded image.
 *
 * - generateProductTitleDescription - A function that handles the generation of the product title and description.
 * - GenerateProductTitleDescriptionInput - The input type for the generateProductTitleDescription function.
 * - GenerateProductTitleDescriptionOutput - The return type for the generateProductTitleDescription function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateProductTitleDescriptionInputSchema = z.object({
  productCategory: z.enum(['Shirt', 'Trousers', 'Jeans', 'Shoes']).describe('The category of the product.'),
  sleeveType: z.enum(['Full Sleeve', 'Half Sleeve']).optional().describe('The sleeve type of the shirt, only applicable for shirts.'),
  gender: z.enum(['Male', 'Female']).describe('The gender for which the product is intended.'),
  fabricType: z.string().describe('The type of fabric used in the product.'),
  color: z.string().optional().describe('The color of the product.'),
  pattern: z.string().optional().describe('The pattern of the product (e.g., Floral, Stripes, Solid).'),
  productImage: z
    .string()
    .describe(
      "A photo of the product, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type GenerateProductTitleDescriptionInput = z.infer<typeof GenerateProductTitleDescriptionInputSchema>;

const GenerateProductTitleDescriptionOutputSchema = z.object({
  productTitle: z.string().describe('The generated product title, starting with \"Mitty\".'),
  productDescription: z.string().describe('The generated product description, including details about color, fabric, pattern, fit, and ideal occasions.'),
});
export type GenerateProductTitleDescriptionOutput = z.infer<typeof GenerateProductTitleDescriptionOutputSchema>;

export async function generateProductTitleDescription(
  input: GenerateProductTitleDescriptionInput
): Promise<GenerateProductTitleDescriptionOutput> {
  return generateProductTitleDescriptionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateProductTitleDescriptionPrompt',
  input: {schema: GenerateProductTitleDescriptionInputSchema},
  output: {schema: GenerateProductTitleDescriptionOutputSchema},
  prompt: `You are an expert product description writer for the fashion brand MITTY.

  Based on the following product details and image, generate a product title and description suitable for the MITTY e-commerce platform.

  The product title MUST always start with \"Mitty\" and should include the color/pattern, sleeve/type, and gender. 
  Example: \"Mitty Beige Rose Floral Print Full Sleeve Shirt for Men\"

  The product description should include details about the color, fabric, print/pattern type, button/collar details, fit, and ideal occasions.

  Product Category: {{{productCategory}}}
  Sleeve Type: {{#if sleeveType}}{{{sleeveType}}}{{else}}N/A{{/if}}
  Gender: {{{gender}}}
  Fabric Type: {{{fabricType}}}
  Color: {{#if color}}{{{color}}}{{else}}N/A{{/if}}
  Pattern: {{#if pattern}}{{{pattern}}}{{else}}N/A{{/if}}
  Product Image: {{media url=productImage}}

  Now generate the product title and product description:
  `,
});

const generateProductTitleDescriptionFlow = ai.defineFlow(
  {
    name: 'generateProductTitleDescriptionFlow',
    inputSchema: GenerateProductTitleDescriptionInputSchema,
    outputSchema: GenerateProductTitleDescriptionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
