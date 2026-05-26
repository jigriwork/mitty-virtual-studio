'use server';

/**
 * @fileOverview An AI agent for generating a photorealistic back view image of a product on a model.
 *
 * - generateBackView - A function that handles the back view image generation process.
 * - GenerateProductViewInput - The input type for the generateBackView function.
 * - GenerateBackViewOutput - The return type for the generateBackView function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { type GenerateProductViewInput, GenerateProductViewInputSchema } from './types';
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

const GenerateBackViewOutputSchema = z.object({
  backView: z.string().describe("A photorealistic image of the product's back view, as a data URI."),
});
export type GenerateBackViewOutput = z.infer<typeof GenerateBackViewOutputSchema>;

export async function generateBackView(input: GenerateProductViewInput): Promise<GenerateBackViewOutput> {
  return generateBackViewFlow(input);
}

const generateBackViewFlow = ai.defineFlow(
  {
    name: 'generateBackViewFlow',
    inputSchema: GenerateProductViewInputSchema,
    outputSchema: GenerateBackViewOutputSchema,
  },
  async (input) => {
    let promptText = '';
    let promptMedia: PromptMedia[] = [];

    if (input.productCategory === 'Trousers') {
        promptText = `Generate an ultra-realistic, high-resolution, professional e-commerce studio photograph showing the back view of the same model, standing straight with arms by the side. This must look like a premium HD product listing image, not a phone photo.

He is wearing the same ${input.color} ${input.trouserFit && input.trouserFit !== 'Auto Detect' ? input.trouserFit : input.fitType} ${input.materialStretch === 'Yes' ? 'stretch' : ''} trousers. Preserve the uploaded back reference exactly: back waistband, belt loops, back construction, back crease, fit, silhouette, and back pockets. If selected or visible, the back view must show two welt pockets with buttons. Do not invent a back logo, label, side tab, back tab, patch, text, extra button, extra seam, or extra pocket.

Back view anti-tag rule: do not add a black label/tab near waistband, belt loops, back pocket edge, or side seam unless clearly visible in source and allowed. Do not invent waistband branding patch, inner waistband label, logo plaque, text mark, hanging tag, paper tag, price tag, retail tag, side tab, or back tab. If not clearly visible in source, do not add any tag/branding element. Back view must remain clean if source has no visible branding.

A hanging tag is not wearable logo and must not become a back tab, side tab, label, patch, or brand mark on the model-worn trouser. Even if product has a retail hanging tag in a store photo, do not place it on model-worn trouser. Use the same crisp, even, diffuse studio lighting and background as the front view. Fabric must still show ${input.materialStretch === 'Yes' ? 'slight stretch' : 'a standard fall'} and a clean finish. No model pose changes. Final output must be sharp, high-detail, HD quality suitable for a premium e-commerce product page.

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
      promptText = `Generate an ultra-realistic, high-resolution, professional e-commerce studio photograph of a PAIR of ${forGender} formal shoes. This must look like a premium HD product listing image, not a phone photo.

The shoes should be made of ${color} ${material} and must perfectly match the design from the uploaded image. The shot should be from a three-quarter back angle, showing the heel counter, the side profile of one shoe, and the back of the other, similar to a standard e-commerce product listing. The shoes should be placed on a solid light grey background (hex #f0f2f5) with soft, natural shadows. The lighting must be crisp, even, and diffuse to showcase the texture and shape of the heels and quarters without harsh reflections. The final image must be pin-sharp, high-detail, HD quality suitable for a premium e-commerce product page.

${buildProductAccuracyInstructions(input)}`;
      promptMedia = [{media: {url: input.productImage!}}];
    } else {
      const sleeveType = input.productCategory === 'Shirt' ? input.sleeveType : '';
      const productDescription = `${input.fabricType} ${sleeveType} ${input.productCategory.toLowerCase()}`.trim();
      const gender = input.gender.toLowerCase();
      const forGender = gender === 'male' ? 'men' : 'women';
      const colorPattern = `with a ${input.color || 'specified'} base and ${input.pattern || 'specified'} design`;
      const accuracyInstructions = buildProductAccuracyInstructions(input);

      promptText = `Generate an ultra-realistic, high-resolution, professional e-commerce studio photograph showing the back view of the same ${gender} model standing straight. This must look like a premium HD product listing image shot by a professional photographer, not a phone photo.

He is wearing the same ${productDescription} for ${forGender} ${colorPattern}, based on the uploaded product image.

${accuracyInstructions}

The model should face away from the camera, arms naturally at the side. Shirt should fit cleanly with no wrinkles or folds. Sleeves must be worn straight with no rolling or pushing up.

Use crisp, even, diffuse studio lighting. Background must follow the selected Output Background Style from the accuracy instructions, defaulting to clean light grey studio. Do not switch to beige, brown, outdoor, room, wall, or lifestyle backgrounds unless explicitly selected. Shirt pattern should continue realistically on the back, matching style and fabric shown in the uploaded image. Model must be identical to other views. Final output must be sharp, high-detail, HD quality suitable for a premium e-commerce product page.`;
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

    return {backView: requireGeneratedImage(media, 'Back view generation')};
  }
);
