'use server';

/**
 * @fileOverview Generates a high-definition flat lay image of the product, or a top-down view for shoes.
 *
 * - generateHdFlatlay - A function that handles the generation of HD flat lay images.
 * - GenerateProductViewInput - The input type for the generateHdFlatlay function.
 * - GenerateHdFlatlayOutput - The return type for the generateHdFlatlay function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { GenerateProductViewInputSchema, type GenerateProductViewInput } from './types';
import { requireGeneratedImage } from './image-output';
import { IMAGE_GENERATION_MODEL } from './model-names';
import { buildFlatlayAccuracyInstructions, buildProductAccuracyInstructions } from './product-accuracy-lock';

type PromptMedia = {media: {url: string}};

const buildShirtPromptMedia = (input: GenerateProductViewInput): PromptMedia[] => [
  {media: {url: input.mainProductImage || input.productImage!}},
  ...(input.openShirtImage ? [{media: {url: input.openShirtImage}}] : []),
  ...(input.fabricCloseupImage ? [{media: {url: input.fabricCloseupImage}}] : []),
  ...(input.collarButtonCloseupImage ? [{media: {url: input.collarButtonCloseupImage}}] : []),
  ...(input.pocketLogoDetailImage ? [{media: {url: input.pocketLogoDetailImage}}] : []),
  ...(input.backSideImage ? [{media: {url: input.backSideImage}}] : []),
];

const GenerateHdFlatlayOutputSchema = z.object({
  hdFlatlayImage: z
    .string()
    .describe(
      'The generated high-definition flat lay or top-view image of the product, as a data URI.'
    ),
});
export type GenerateHdFlatlayOutput = z.infer<typeof GenerateHdFlatlayOutputSchema>;

export async function generateHdFlatlay(input: GenerateProductViewInput): Promise<GenerateHdFlatlayOutput> {
  return generateHdFlatlayFlow(input);
}

const generateHdFlatlayFlow = ai.defineFlow(
  {
    name: 'generateHdFlatlayFlow',
    inputSchema: GenerateProductViewInputSchema,
    outputSchema: GenerateHdFlatlayOutputSchema,
  },
  async input => {
    let promptText = '';
    let promptMedia: PromptMedia[] = [];

    if (input.productCategory === 'Trousers') {
        promptText = `Generate a premium HD ecommerce flatlay packshot of the ${input.color} formal trousers based on the uploaded product photos. Show them fully spread, neatly arranged, centered, and sharply focused, with waistband, belt loops, seams, and pocket lines visible. Use the same clean light grey or off-white ecommerce studio background style as the other generated views. Use even diffuse studio lighting with no harsh shadow, no camera shadow, no phone shadow, no photographer shadow, no reflection shadow, no dark bottom shadow, no table clutter, and no background objects. This image will be used directly for ecommerce listing.

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
        promptText = `Generate a high-resolution, professional e-commerce studio packshot of a PAIR of ${forGender} formal shoes, viewed from an elevated, angled top-down perspective. The shoes, made of ${color} ${material}, must perfectly match the style of the uploaded image. They should be arranged neatly side-by-side on a clean solid light grey background (hex #f0f2f5), matching the studio style of the other generated views. This view should clearly display the shoe opening, insole, and the top-down shape of the toe box. Lighting must be soft, even, and diffuse to eliminate harsh shadows, camera shadows, phone shadows, reflection shadows, dark bottom shadows, and background clutter. The image must be exceptionally sharp and clean. Do not add any brand names or logos.

${buildProductAccuracyInstructions(input)}`
        promptMedia = [{media: {url: input.productImage!}}];
    } else {
        promptText = `Generate a premium HD ecommerce flatlay packshot of the uploaded shirt product. This must look like a professional top-down catalog packshot, not a casual phone/table photo.

${buildFlatlayAccuracyInstructions(input)}

Use the uploaded reference images as the source of truth. Preserve the actual shirt design exactly: color, pocket, collar, buttons, placket, cuffs, sleeve type, pattern, fabric finish, and all visible construction details.

Create clean even studio lighting and a clean light grey or off-white background. Remove phone/table-photo artifacts including harsh shadows, camera shadow, phone shadow, photographer shadow, hand shadow, reflection shadow, dark bottom shadow, glass reflection, table clutter, background objects, and dramatic lighting.

Remove distracting packaging, retail ribbon, price tags, hanging tags, or black MITTY tape when possible, but never remove real shirt details such as the pocket, buttons, collar, cuffs, placket, or pattern. Do not invent any logo or design. The result should be sharp, realistic, centered, and suitable for ecommerce product listing.`
        promptMedia = buildShirtPromptMedia(input);
    }
    
    const {media} = await ai.generate({
      model: IMAGE_GENERATION_MODEL,
      prompt: [ ...promptMedia, { text: promptText } ],
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    return {hdFlatlayImage: requireGeneratedImage(media, 'HD flatlay generation')};
  }
);
