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
import { buildProductAccuracyInstructions } from './product-accuracy-lock';

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
        promptText = `Generate a realistic full-body image of a male model standing straight in a studio. He is wearing ${input.fitType} formal trousers made of ${input.fabricType} in ${input.color}. The model has a white or black tucked-in formal shirt and black dress shoes. Both legs should be straight, showing perfect trouser fall and crease. Sleeves must not be rolled. The waistband, belt loops, pockets, and fabric must exactly match the uploaded image. Keep facial expression neutral and posture professional.

${buildProductAccuracyInstructions(input)}`;
        promptMedia = [
            {media: {url: input.productImageFront!}},
            {media: {url: input.productImageFabric!}},
            {media: {url: input.productImageBack!}},
        ];
    } else if (input.productCategory === 'Shoes') {
        const material = input.fabricType;
        const color = input.color || 'specified';
        const forGender = input.gender === 'Male' ? "men's" : "women's";
        promptText = `Generate an ultra-realistic, e-commerce studio photograph of a single ${forGender} formal shoe. The shoe should be made of high-quality ${color} ${material} and must perfectly match the design, texture, and stitching from the uploaded image. The view should be straight-on, showing the front of the shoe, including the toe cap, vamp, and laces clearly. The shoe must be standing upright on a plain, solid light grey background (hex #f0f2f5) with a soft, clean shadow underneath. The lighting should be bright and even, highlighting the material's texture without harsh reflections. Ensure the image is sharp, in focus, and free of any AI artifacts or distortions.

${buildProductAccuracyInstructions(input)}`;
        promptMedia = [{media: {url: input.productImage!}}];
    } else {
      const sleeveType = input.productCategory === 'Shirt' ? input.sleeveType : '';
      const productDescription = `${input.fabricType} ${sleeveType} ${input.productCategory.toLowerCase()}`.trim();
      const gender = input.gender.toLowerCase();
      const forGender = gender === 'male' ? 'men' : 'women';
      const colorPattern = `with a ${input.color || 'specified'} base and ${input.pattern || 'specified'} design`;
      const accuracyInstructions = buildProductAccuracyInstructions(input);

      promptText = `Generate a photorealistic front view of a ${gender} model standing straight in a studio setup. He is wearing a ${productDescription} for ${forGender} ${colorPattern}, accurately reflecting the style and print of the uploaded product image.

${accuracyInstructions}

The model should have a neutral expression, facing forward, with both arms straight and visible. Shirt sleeves must not be folded. The ${input.productCategory.toLowerCase()} should be well-fitted, ironed, and worn with black trousers.

The lighting should be clean and soft, like a professional ecommerce photoshoot. The ${input.productCategory.toLowerCase()} must match the uploaded product exactly — including button color, collar style, and print placement.

Background should be solid beige or light grey. The model’s face must remain the same across all other views.`;
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
