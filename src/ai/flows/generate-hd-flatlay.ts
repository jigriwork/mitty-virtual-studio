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
import {
  buildFlatlayAccuracyInstructions,
  buildInputColorLockInstruction,
  buildProductAccuracyInstructions,
  buildProductOnlyNoPersonInstruction,
  buildTaglessTrouserFlatlayInstruction,
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
        const flatlayTagRule = isTrouserTaglessMode(input)
          ? 'Flatlay tagless rule: do not invent, preserve, or show any inner waistband brand label, hanging tag, paper tag, retail tag, price tag, waistband label, logo plaque, black tab, neck/waist label substitute, side tab, back tab, pocket label, source tag, patch, text mark, or packaging element. If the source photo contains a tag or tag-like artifact, remove it and ignore it for the generated flatlay. Preserve only trouser construction: waistband, closure, belt loops, pockets, buttons, crease, silhouette, fabric texture, and color.'
          : 'Flatlay anti-tag rule: do not invent an inner waistband brand label, hanging tag, paper tag, retail tag, price tag, waistband label, logo plaque, black tab, neck/waist label substitute, side tab, back tab, or packaging element. A tag/brand/label may only appear if it is clearly visible in the uploaded source image for that product and the selected Tag / Branding Visibility setting allows it. If the source flatlay/product references do not clearly show a tag, flatlay must be completely tag-free. Preserve only trouser construction: waistband, closure, belt loops, pockets, crease, silhouette, fabric texture, and color.';
        promptText = `Generate an ultra-realistic, high-resolution, professional e-commerce studio packshot photograph of ${input.color} formal trousers. This must look like a premium HD product listing image shot in a professional photography studio with DSLR equipment, NOT a phone photo on a table.

${buildProductOnlyNoPersonInstruction()}

${buildInputColorLockInstruction(input)}

Based on the uploaded product photos, show the trousers fully spread, neatly arranged, centered, and sharply focused while preserving the actual trouser silhouette and product shape. Preserve waistband, belt loops, closure, front slant pockets if present or selected, straight pockets if present or selected, seam placement, flat front or pleat style, visible center crease lines, fit, color, and fabric finish. Use the back reference to preserve back pocket/button evidence where relevant, especially two welt pockets with buttons when selected or visible. The composition must be top-down, centered, with the full product visible.

Do not invent logos, labels, side tabs, back tabs, black tabs, patches, text, cargo pockets, extra pockets, decorative zippers, contrast panels, or new design elements. Do not treat hanging tag, price tag, black MITTY tag, paper tag, packaging tag, hanger clip, or retail label as a wearable trouser logo. A hanging tag is not wearable logo and must not become part of the trouser design.

${flatlayTagRule}

Lighting: use even, diffuse, soft-box studio lighting that eliminates all shadows. No harsh shadow, no camera shadow, no phone shadow, no photographer shadow, no hand shadow, no reflection shadow, no dark bottom shadow, no warm color cast, no dramatic spotlight. The light must be flat, clean, and professional.

Background: clean light grey or off-white seamless studio backdrop matching the selected studio style. No table surface, no floor texture, no room background, no lifestyle setting, no visible edges.

This image will be used directly as a premium e-commerce listing photo. Final output must be pin-sharp, high-detail, HD quality with professional studio aesthetics.

${buildTaglessTrouserFlatlayInstruction(input)}

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
        promptText = `Generate an ultra-realistic, high-resolution, professional e-commerce studio packshot photograph of a PAIR of ${forGender} formal shoes, viewed from an elevated, angled top-down perspective. This must look like a premium HD product listing image shot in a professional photography studio with DSLR equipment, NOT a phone photo.

${buildProductOnlyNoPersonInstruction()}

${buildInputColorLockInstruction(input)}

The shoes, made of ${color} ${material}, must perfectly match the style of the uploaded image. They should be arranged neatly side-by-side on a clean solid light grey background (hex #f0f2f5), matching the studio style of the other generated views. This view should clearly display the shoe opening, insole, and the top-down shape of the toe box.

Lighting: use even, diffuse, soft-box studio lighting that eliminates all harsh shadows. No camera shadow, no phone shadow, no reflection shadow, no dark bottom shadow, no warm color cast, no dramatic spotlight. The light must be flat, clean, and professional.

Background: clean seamless studio backdrop. No table surface, no floor texture, no room background, no visible edges, no clutter.

The image must be pin-sharp, high-detail, HD quality with professional studio aesthetics. Do not add any brand names or logos.

${buildProductAccuracyInstructions(input)}`
        promptMedia = [{media: {url: input.productImage!}}];
    } else {
        promptText = `Generate an ultra-realistic, high-resolution, professional e-commerce studio packshot photograph of the uploaded shirt product. This MUST look like a premium HD catalog packshot shot in a professional photography studio with DSLR equipment and soft-box lighting. NOT a casual phone photo on a table or bed.

${buildProductOnlyNoPersonInstruction()}

${buildInputColorLockInstruction(input)}

${buildFlatlayAccuracyInstructions(input)}

Use the uploaded reference images as the construction and design source of truth. Preserve the actual shirt design exactly: pocket, collar, buttons, placket, cuffs, sleeve type, pattern, fabric finish, and all visible construction details. Follow the colour lock for final product colour.

Lighting: use even, diffuse, soft-box studio lighting that eliminates ALL shadows. No harsh shadow, no camera shadow, no phone shadow, no photographer shadow, no hand shadow, no reflection shadow, no dark bottom shadow, no warm color cast, no dramatic spotlight, no uneven vignette. The light must be flat, clean, and professional, to mimic a high-end fashion studio with seamless lighting.

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
