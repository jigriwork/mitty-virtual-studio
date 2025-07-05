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
import { GenerateProductViewInputSchema, type GenerateProductViewInput } from './types';


const GenerateProductTitleDescriptionOutputSchema = z.object({
  productTitle: z.string().describe('The generated product title, starting with \"Mitty\".'),
  productDescription: z.string().describe('The generated product description, including details about color, fabric, pattern, fit, and ideal occasions.'),
});
export type GenerateProductTitleDescriptionOutput = z.infer<typeof GenerateProductTitleDescriptionOutputSchema>;

export async function generateProductTitleDescription(
  input: GenerateProductViewInput
): Promise<GenerateProductTitleDescriptionOutput> {
   if (input.productCategory === 'Trousers') {
    const color = input.color || '';
    const fitType = input.fitType || '';
    const fabricType = input.fabricType || '';
    const materialStretchText = input.materialStretch === 'Yes' 
      ? `subtle stretch for maximum comfort` 
      : `a classic structure for a sharp look`;

    const productTitle = `Mitty ${color} ${fitType} ${fabricType} Formal Trousers for Men`.trim().replace(/\s+/g, ' ');
    
    const productDescription = `Elevate your formal wardrobe with these ${color} formal trousers from MITTY. Crafted from premium ${fabricType} fabric, these trousers offer a refined ${fitType} and ${materialStretchText}. The mid-rise design with crisp pleats and neat welt pockets makes it an ideal choice for office wear, events, or festive occasions. Pair it with a tucked-in shirt and formal shoes for a sharp, confident look.`.trim().replace(/\s+/g, ' ');

    return { productTitle, productDescription };
  }
  return generateProductTitleDescriptionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateProductTitleDescriptionPrompt',
  input: {schema: GenerateProductViewInputSchema},
  output: {schema: GenerateProductTitleDescriptionOutputSchema},
  prompt: `You are an expert product description writer for the fashion brand MITTY.

  Based on the following product details and image, generate a product title and description suitable for the MITTY e-commerce platform.

  The product title MUST always start with \"Mitty\" and should include the color/pattern, sleeve/type, and gender. 
  Example: \"Mitty Beige Rose Floral Print Full Sleeve Shirt for Men\"
  Example: "Mitty Steel Blue Slim Fit Lycra Stretch Formal Trousers for Men"

  The product description should include details about the color, fabric, print/pattern type, button/collar details, fit, and ideal occasions.

  Product Category: {{{productCategory}}}
  Sleeve Type: {{#if sleeveType}}{{{sleeveType}}}{{else}}N/A{{/if}}
  Fit Type: {{#if fitType}}{{{fitType}}}{{else}}N/A{{/if}}
  Material Stretch: {{#if materialStretch}}{{{materialStretch}}}{{else}}N/A{{/if}}
  Gender: {{{gender}}}
  Fabric Type: {{{fabricType}}}
  Color: {{#if color}}{{{color}}}{{else}}N/A{{/if}}
  Pattern: {{#if pattern}}{{{pattern}}}{{else}}N/A{{/if}}
  Product Image(s): {{#if productImage}}{{media url=productImage}}{{/if}}{{#if productImageFront}}{{media url=productImageFront}}{{/if}}{{#if productImageFabric}}{{media url=productImageFabric}}{{/if}}{{#if productImageBack}}{{media url=productImageBack}}{{/if}}

  Now generate the product title and product description:
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
