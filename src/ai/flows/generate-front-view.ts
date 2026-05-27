'use server';

/**
 * @fileOverview An AI agent for generating a photorealistic front view image of a product on a model.
 *
 * - generateFrontView - A function that handles the front view image generation process.
 * - GenerateFrontViewOutput - The return type for the generateFrontView function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { GenerateProductViewInputSchema, type GenerateProductViewInput } from './types';
import { requireGeneratedImage } from './image-output';
import { IMAGE_GENERATION_MODEL } from './model-names';
import {
  buildGenderModelInstruction,
  buildInputColorLockInstruction,
  buildProductAccuracyInstructions,
  buildProductOnlyNoPersonInstruction,
  buildTaglessTrouserInstruction,
  isTrouserTaglessMode,
} from './product-accuracy-lock';

type PromptMedia = {media: {url: string}};

const buildShirtPromptMedia = (input: GenerateProductViewInput): PromptMedia[] => [
  {media: {url: input.mainProductImage || input.productImage!}},
  ...(input.openShirtImage ? [{media: {url: input.openShirtImage}}] : []),
  ...(input.fabricCloseupImage ? [{media: {url: input.fabricCloseupImage}}] : []),
  ...(input.collarButtonCloseupImage ? [{media: {url: input.collarButtonCloseupImage}}] : []),
  ...(input.pocketLogoDetailImage ? [{media: {url: input.pocketLogoDetailImage}}] : []),
  ...(input.backSideImage ? [{media: {url: input.backSideImage}}] : []),
];

const GenerateFrontViewOutputSchema = z.object({
  frontView: z.string().describe("A photorealistic image of the product's front view, as a data URI."),
});
export type GenerateFrontViewOutput = z.infer<typeof GenerateFrontViewOutputSchema>;

export async function generateFrontView(input: GenerateProductViewInput): Promise<GenerateFrontViewOutput> {
  return generateFrontViewFlow(input);
}

const generateFrontViewFlow = ai.defineFlow(
  {
    name: 'generateFrontViewFlow',
    inputSchema: GenerateProductViewInputSchema,
    outputSchema: GenerateFrontViewOutputSchema,
  },
  async (input) => {
    let promptText = '';
    let promptMedia: PromptMedia[] = [];

    if (input.productCategory === 'Trousers') {
        const trouserBrandingRule = isTrouserTaglessMode(input)
          ? 'Tagless model-worn rule: no wearable logo, labels, tags, side tab, back tab, patches, brand marks, black rectangles, text marks, retail tags, hanging tags, waistband labels, inner labels, pocket labels, or branding may appear anywhere on the trouser. Ignore and remove any tag-like artifact visible in the source photos. Keep only trouser construction, fabric, color, pockets, buttons, waistband, belt loops, crease, fit, and silhouette.'
          : 'No wearable logo, labels, tags, side tab, back tab, patches, or brand marks may appear on the trouser unless the trouser accuracy lock explicitly allows it and it is clearly visible in source. If not clearly visible in source, do not add any tag/branding element. A hanging tag is not wearable logo and must not become a side tab, back tab, label, patch, or brand mark on the model-worn trouser. Model-worn images must never show invented brand tags/tabs/labels, even if a retail hanging tag appears in a store/product photo.';
        promptText = `Generate an ultra-realistic, high-resolution, professional e-commerce studio photograph of a fashion model standing straight. This must look like an HD product listing photo from a premium fashion website, not a phone photo.

${buildGenderModelInstruction(input.gender)}

${buildInputColorLockInstruction(input)}

The selected adult model is wearing ${input.trouserFit && input.trouserFit !== 'Auto Detect' ? input.trouserFit : input.fitType} formal trousers made of ${input.fabricType} in ${input.color}. The model has a white or black tucked-in formal shirt and black dress shoes. Both legs should be straight, showing perfect trouser fall and crease. Sleeves must not be rolled. The front construction, slant side pockets or straight side pockets, waistband, belt loops, closure, front style, crease lines, fit, silhouette, and fabric must match the uploaded front trouser reference.

${trouserBrandingRule} Keep facial expression neutral and posture professional.

Use crisp, even, diffuse studio lighting with no harsh shadows. The image must be sharp, high-detail, clean, and suitable for a premium e-commerce product page.

${buildProductAccuracyInstructions(input)}

${buildTaglessTrouserInstruction(input)}`;
        promptMedia = [
            {media: {url: input.productImageFront!}},
            {media: {url: input.productImageFabric!}},
            {media: {url: input.productImageBack!}},
        ];
    } else if (input.productCategory === 'Shoes') {
        const material = input.fabricType;
        const color = input.color || 'specified';
        const forGender = input.gender === 'Male' ? "men's" : input.gender === 'Female' ? "women's" : 'unisex';
        promptText = `Generate an ultra-realistic, high-resolution, professional e-commerce studio photograph of a single ${forGender} formal shoe. This must look like a premium HD product listing image, not a phone photo.

${buildProductOnlyNoPersonInstruction()}

${buildInputColorLockInstruction(input)}

The shoe should be made of high-quality ${color} ${material} and must perfectly match the design, texture, and stitching from the uploaded image. The view should be straight-on, showing the front of the shoe, including the toe cap, vamp, and laces clearly. The shoe must be standing upright on a plain, solid light grey background (hex #f0f2f5) with a soft, clean shadow underneath. The lighting should be bright, even, and diffuse, highlighting the material's texture without harsh reflections. Ensure the image is pin-sharp, high-detail, in focus, and free of any AI artifacts or distortions. Final output must be HD quality suitable for a premium e-commerce product page.

${buildProductAccuracyInstructions(input)}`;
        promptMedia = [{media: {url: input.productImage!}}];
    } else {
      const sleeveType = input.productCategory === 'Shirt' ? input.sleeveType : '';
      const productDescription = `${input.fabricType} ${sleeveType} ${input.productCategory.toLowerCase()}`.trim();
      const forGender = input.gender === 'Male' ? 'men' : input.gender === 'Female' ? 'women' : 'unisex';
      const colorPattern = `with a ${input.color || 'specified'} base and ${input.pattern || 'specified'} design`;
      const accuracyInstructions = buildProductAccuracyInstructions(input);

      promptText = `Generate an ultra-realistic, high-resolution, professional e-commerce studio photograph showing the front view of a fashion model standing straight. This must look like a premium HD product listing image shot by a professional photographer, not a phone photo.

${buildGenderModelInstruction(input.gender)}

${buildInputColorLockInstruction(input)}

The selected adult model is wearing a ${productDescription} for ${forGender} ${colorPattern}, accurately reflecting the style and print of the uploaded product image.

${accuracyInstructions}

The model should have a neutral expression, facing forward, with both arms straight and visible. Shirt sleeves must not be folded. The ${input.productCategory.toLowerCase()} should be well-fitted, ironed, and worn with black trousers.

Use crisp, even, diffuse studio lighting like a professional ecommerce photoshoot. No harsh shadows, no warm color cast, no dramatic lighting. The ${input.productCategory.toLowerCase()} must match the uploaded product exactly, including button color, collar style, and print placement.

Background must follow the selected Output Background Style from the accuracy instructions, defaulting to clean light grey studio. Do not switch to beige, brown, outdoor, room, wall, or lifestyle backgrounds unless explicitly selected. The model face must remain the same across all other views. Final output must be sharp, high-detail, HD quality suitable for a premium e-commerce product page.`;
      promptMedia = input.productCategory === 'Shirt'
        ? buildShirtPromptMedia(input)
        : [{media: {url: input.productImage!}}];
    }

    const {media} = await ai.generate({
      model: IMAGE_GENERATION_MODEL,
      prompt: [...promptMedia, {text: promptText}],
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    return {frontView: requireGeneratedImage(media, 'Front view generation')};
  }
);
