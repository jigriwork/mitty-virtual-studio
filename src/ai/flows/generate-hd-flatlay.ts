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
        promptText = `Generate an ultra-realistic, high-resolution, professional e-commerce studio packshot photograph of ${input.color} formal trousers. This must look like a premium HD product listing image shot in a professional photography studio with DSLR equipment, NOT a phone photo on a table.

Based on the uploaded product photos, show the trousers fully spread, neatly arranged, centered, and sharply focused, with waistband, belt loops, seams, and pocket lines visible. The composition must be top-down, centered, with the full product visible.

Lighting: use even, diffuse, soft-box studio lighting that eliminates all shadows. No harsh shadow, no camera shadow, no phone shadow, no photographer shadow, no hand shadow, no reflection shadow, no dark bottom shadow, no warm color cast, no dramatic spotlight. The light must be flat, clean, and professional.

Background: clean light grey or off-white seamless studio backdrop matching the selected studio style. No table surface, no floor texture, no room background, no lifestyle setting, no visible edges.

This image will be used directly as a premium e-commerce listing photo. Final output must be pin-sharp, high-detail, HD quality with professional studio aesthetics.

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
        promptText = `Generate an ultra-realistic, high-resolution, professional e-commerce studio packshot photograph of a PAIR of ${forGender} formal shoes, viewed from an elevated, angled top-down perspective. This must look like a premium HD product listing image shot in a professional photography studio with DSLR equipment, NOT a phone photo.

The shoes, made of ${color} ${material}, must perfectly match the style of the uploaded image. They should be arranged neatly side-by-side on a clean solid light grey background (hex #f0f2f5), matching the studio style of the other generated views. This view should clearly display the shoe opening, insole, and the top-down shape of the toe box.

Lighting: use even, diffuse, soft-box studio lighting that eliminates all harsh shadows. No camera shadow, no phone shadow, no reflection shadow, no dark bottom shadow, no warm color cast, no dramatic spotlight. The light must be flat, clean, and professional.

Background: clean seamless studio backdrop. No table surface, no floor texture, no room background, no visible edges, no clutter.

The image must be pin-sharp, high-detail, HD quality with professional studio aesthetics. Do not add any brand names or logos.

${buildProductAccuracyInstructions(input)}`
        promptMedia = [{media: {url: input.productImage!}}];
    } else {
        promptText = `Generate an ultra-realistic, high-resolution, professional e-commerce studio packshot photograph of the uploaded shirt product. This MUST look like a premium HD catalog packshot shot in a professional photography studio with DSLR equipment and soft-box lighting — NOT a casual phone photo on a table or bed.

${buildFlatlayAccuracyInstructions(input)}

Use the uploaded reference images as the source of truth. Preserve the actual shirt design exactly: color, pocket, collar, buttons, placket, cuffs, sleeve type, pattern, fabric finish, and all visible construction details.

Lighting: use even, diffuse, soft-box studio lighting that eliminates ALL shadows. No harsh shadow, no camera shadow, no phone shadow, no photographer shadow, no hand shadow, no reflection shadow, no dark bottom shadow, no warm color cast, no dramatic spotlight, no uneven vignette. The light must be flat, clean, and professional — mimicking a high-end fashion studio with seamless lighting.

Background: clean light grey or off-white seamless studio backdrop. No table surface, no floor texture, no room background, no lifestyle setting, no visible edges, no wrinkled fabric backdrop.

Remove distracting packaging, retail ribbon, price tags, hanging tags, or black MITTY tape when possible, but never remove real shirt details such as the pocket, buttons, collar, cuffs, placket, or pattern. Do not invent any logo or design.

The result must be pin-sharp, high-detail, HD quality, centered, with realistic proportions and professional studio aesthetics suitable for a premium e-commerce product listing page.`
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
