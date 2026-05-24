'use server';

/**
 * @fileOverview Generates an SEO-ready ecommerce content pack and detects color based on product details and uploaded image(s).
 *
 * - generateProductTitleDescription - A function that handles SEO pack generation.
 * - GenerateProductTitleDescriptionOutput - The return type for the generateProductTitleDescription function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { GenerateProductViewInputSchema, type GenerateProductViewInput } from './types';


const GenerateProductTitleDescriptionOutputSchema = z.object({
  seoTitle: z.string().describe('A concise SEO-focused product title for ecommerce listing pages.'),
  productTitle: z.string().describe('The generated product title, starting with "Mitty".'),
  shortDescription: z.string().describe('A short one-sentence ecommerce description.'),
  longDescription: z.string().describe('A polished catalogue-style long description.'),
  productDescription: z.string().describe('Backward-compatible alias for longDescription. It must exactly match longDescription.'),
  bulletFeatures: z.array(z.string()).min(4).max(6).describe('Four to six product-aware bullet features.'),
  metaTitle: z.string().describe('SEO meta title, ideally under 60 characters.'),
  metaDescription: z.string().describe('SEO meta description, ideally under 160 characters.'),
  slug: z.string().describe('Lowercase hyphenated URL slug with only letters, numbers, and hyphens.'),
  imageAltTexts: z.array(z.string()).min(3).max(5).describe('Three to five descriptive image alt texts for generated ecommerce images.'),
  categoryTags: z.array(z.string()).min(4).max(8).describe('Four to eight lowercase ecommerce category/search tags.'),
  stylingSuggestions: z.string().describe('A practical styling suggestion for the product.'),
  detectedColor: z.string().describe('The main color of the product. This MUST be the user-provided color if available, otherwise it is detected from the uploaded image(s). For example: "Navy Blue", "Olive Green", "Beige", "Teal".'),
});
export type GenerateProductTitleDescriptionOutput = z.infer<typeof GenerateProductTitleDescriptionOutputSchema>;

export async function generateProductTitleDescription(
  input: GenerateProductViewInput
): Promise<GenerateProductTitleDescriptionOutput> {
  return generateProductTitleDescriptionFlow(input);
}

const toSlug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const prompt = ai.definePrompt({
  name: 'generateProductTitleDescriptionPrompt',
  input: {schema: GenerateProductViewInputSchema},
  output: {schema: GenerateProductTitleDescriptionOutputSchema},
  prompt: `You are an expert ecommerce catalog writer for MITTY, a premium but simple fashion and lifestyle brand for the Indian market.

  Generate a complete SEO-ready content pack from the product details and uploaded image(s). Use natural, professional catalog language. Keep the copy premium and clear, never cheap, exaggerated, or keyword-stuffed.

  Core rules:
  1. Determine the final color. If User-provided Color exists and is not N/A, use that exact value. Otherwise detect the primary product color from the image(s). Return it in detectedColor using a specific name such as Navy Blue, Olive Green, Beige, Teal, or Purple.
  2. productTitle MUST start with "Mitty".
  3. productDescription MUST exactly match longDescription for backward compatibility.
  4. Use Mitty branding naturally. Do not invent any brand name other than Mitty.
  5. Do not mention AI, prompts, generated images, discounts, price, sizes, warranty, stock, delivery, or availability.
  6. Do not claim exact fabric, cotton, premium cotton, breathable fabric, easy care, wrinkle-free finish, stretch, luxury fabric, leather, slim fit, waterproofing, sole technology, or long-lasting perfume performance unless it is explicitly provided in the product details.
  7. Prefer safe wording such as "designed for", "ideal for", "suitable for", "clean look", "smart styling", "smooth finish", "polished look", "pairs well with", and "gives a refined look".
  8. Avoid generic repeated phrases. Make the pack specific to the product category, color, pattern, selected fields, and visible details.
  9. Slug must be lowercase, hyphenated, and based on the productTitle.
  10. Meta title should be concise. Meta description should be ecommerce-ready and under 160 characters when possible.

  Category-specific guidance:
  - Shirt: mention full sleeve or half sleeve when selected. Mention color and pattern when provided or visible. Use office wear, smart casual, meetings, dinners, and everyday styling where relevant.
  - Trousers: mention formal or casual based on the provided type/fit wording. Mention office wear or daily styling based on that type. Avoid exact fabric claims unless fabricType is provided.
  - Jeans: mention casual wear, street-smart styling, weekend looks, and daily comfort. Avoid exact fit claims unless fitType is provided.
  - Shoes: mention formal or casual based on the provided material/type clues and image. Mention occasion styling. Avoid sole/material claims unless provided.
  - Perfume: mention fragrance family and size if provided. If fragranceName is provided, use it. If not, create a tasteful Mitty fragrance name from the family and target audience. Use "Extrait De Parfum" as the perfume type. Avoid medical, attraction, performance, or long-lasting claims unless explicitly provided.

  Required output fields:
  - seoTitle
  - productTitle
  - shortDescription
  - longDescription
  - productDescription: exactly the same text as longDescription
  - bulletFeatures: 4 to 6 bullets, no leading hyphens in the strings
  - metaTitle
  - metaDescription
  - slug
  - imageAltTexts: 3 to 5 alt text strings for front, side/box, back, flatlay/hero images as applicable
  - categoryTags: 4 to 8 lowercase tags
  - stylingSuggestions
  - detectedColor

  **Product Details:**
  Product Category: {{{productCategory}}}
  Sleeve Type: {{#if sleeveType}}{{{sleeveType}}}{{else}}N/A{{/if}}
  Fit Type: {{#if fitType}}{{{fitType}}}{{else}}N/A{{/if}}
  Material Stretch: {{#if materialStretch}}{{{materialStretch}}}{{else}}N/A{{/if}}
  Gender/Target: {{{gender}}}
  Fabric Type: {{#if fabricType}}{{{fabricType}}}{{else}}N/A{{/if}}
  Pattern: {{#if pattern}}{{{pattern}}}{{else}}N/A{{/if}}
  Front Pocket: {{#if frontPocket}}{{{frontPocket}}}{{else}}Auto Detect{{/if}}
  Pattern Override: {{#if patternOverride}}{{{patternOverride}}}{{else}}Auto Detect{{/if}}
  Collar Type: {{#if collarType}}{{{collarType}}}{{else}}Auto Detect{{/if}}
  Visible Logo on Worn Shirt: {{#if visibleLogo}}{{{visibleLogo}}}{{else}}Auto Detect{{/if}}
  Output Background Style: {{#if outputBackgroundStyle}}{{{outputBackgroundStyle}}}{{else}}Clean Light Grey Studio{{/if}}
  User-provided Color: {{#if color}}{{{color}}}{{else}}N/A{{/if}}

  {{#if fragranceFamily}}
  User-provided Fragrance Name: {{#if fragranceName}}{{{fragranceName}}}{{else}}N/A{{/if}}
  Fragrance Family: {{{fragranceFamily}}}
  Perfume Type: Extrait De Parfum
  Size (ml): {{{sizeMl}}}
  {{/if}}
  
  **Product Image(s):**
  {{#if productImage}}{{media url=productImage}}{{/if}}
  {{#if mainProductImage}}{{media url=mainProductImage}}{{/if}}
  {{#if openShirtImage}}{{media url=openShirtImage}}{{/if}}
  {{#if fabricCloseupImage}}{{media url=fabricCloseupImage}}{{/if}}
  {{#if collarButtonCloseupImage}}{{media url=collarButtonCloseupImage}}{{/if}}
  {{#if pocketLogoDetailImage}}{{media url=pocketLogoDetailImage}}{{/if}}
  {{#if backSideImage}}{{media url=backSideImage}}{{/if}}
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
    const seoPack = output!;

    return {
      ...seoPack,
      productDescription: seoPack.longDescription,
      slug: toSlug(seoPack.slug || seoPack.productTitle),
    };
  }
);
