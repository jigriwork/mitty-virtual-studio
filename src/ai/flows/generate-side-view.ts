'use server';

/**
 * @fileOverview An AI agent for generating a photorealistic side view image of a product on a model.
 *
 * - generateSideView - A function that handles the side view image generation process.
 * - GenerateProductViewInput - The input type for the generateSideView function.
 * - GenerateSideViewOutput - The return type for the generateSideView function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { type GenerateProductViewInput, GenerateProductViewInputSchema } from './types';
import { requireGeneratedImage } from './image-output';
import { IMAGE_GENERATION_MODEL } from './model-names';
import {
  buildGenderModelInstruction,
  buildInputColorLockInstruction,
  buildProductAccuracyInstructions,
  buildProductOnlyNoPersonInstruction,
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

const GenerateSideViewOutputSchema = z.object({
  sideView: z.string().describe("A photorealistic image of the product's side view, as a data URI."),
});
export type GenerateSideViewOutput = z.infer<typeof GenerateSideViewOutputSchema>;

export async function generateSideView(input: GenerateProductViewInput): Promise<GenerateSideViewOutput> {
  return generateSideViewFlow(input);
}

const generateSideViewFlow = ai.defineFlow(
  {
    name: 'generateSideViewFlow',
    inputSchema: GenerateProductViewInputSchema,
    outputSchema: GenerateSideViewOutputSchema,
  },
  async (input) => {
    let promptText = '';
    let promptMedia: PromptMedia[] = [];

    if (input.productCategory === 'Shoes') {
      const material = input.fabricType;
      const color = input.color || 'specified';
      const forGender = input.gender === 'Male' ? "men's" : input.gender === 'Female' ? "women's" : 'unisex';
      promptText = `Generate an ultra-realistic, high-resolution, professional e-commerce studio photograph of a single ${forGender} formal shoe, viewed from the side profile. This must look like a premium HD product listing image, not a phone photo.

${buildProductOnlyNoPersonInstruction()}

${buildInputColorLockInstruction(input)}

The shoe, made of ${color} ${material}, must exactly match the style and details of the uploaded image. It should be perfectly perpendicular to the camera, showcasing the quarter, sole construction, and heel. The background must be a solid light grey (hex #f0f2f5), and the lighting should be crisp, even, and diffuse, revealing the texture of the material without harsh reflections or shadows. The image must be pin-sharp, high-detail, and HD quality suitable for a premium e-commerce product page.

${buildProductAccuracyInstructions(input)}`;
      promptMedia = [{media: {url: input.productImage!}}];
    } else {
      const sleeveType = input.productCategory === 'Shirt' ? input.sleeveType : '';
      const productDescription = `${input.fabricType} ${sleeveType} ${input.productCategory.toLowerCase()}`.trim();
      const forGender = input.gender === 'Male' ? 'men' : input.gender === 'Female' ? 'women' : 'unisex';
      const colorPattern = `with a ${input.color || 'specified'} base and ${input.pattern || 'specified'} design`;
      const accuracyInstructions = buildProductAccuracyInstructions(input);

      promptText = `Generate an ultra-realistic, high-resolution, professional e-commerce studio photograph showing the side view of the same fashion model, turned 90 degrees to the model's left side. This must look like a premium HD product listing image shot by a professional photographer, not a phone photo.

${buildGenderModelInstruction(input.gender)}

${buildInputColorLockInstruction(input)}

The selected adult model is wearing the same ${productDescription} for ${forGender}, based on the uploaded product image ${colorPattern}.

${accuracyInstructions}

The side profile should clearly show sleeve length and ${input.productCategory.toLowerCase()} fit. Sleeves should be worn normally with no folding or rolling. Use crisp, even, diffuse studio lighting and the selected Output Background Style from the accuracy instructions, defaulting to clean light grey studio. Do not switch to beige, brown, outdoor, room, wall, or lifestyle backgrounds unless explicitly selected.

Ensure color accuracy according to the colour lock, while fabric texture and button/collar details match the uploaded shirt image. The model must be identical to the front view with same face, hair, and posture to ensure consistency across the product shoot. Final output must be sharp, high-detail, HD quality suitable for a premium e-commerce product page.`;
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

    return {sideView: requireGeneratedImage(media, 'Side view generation')};
  }
);
