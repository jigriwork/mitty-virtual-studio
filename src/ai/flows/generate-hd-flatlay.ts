'use server';

/**
 * @fileOverview Generates a high-definition flat lay image of the product, enhancing the existing image if its quality is sufficient.
 *
 * - generateHdFlatlay - A function that handles the generation of HD flat lay images.
 * - GenerateHdFlatlayInput - The input type for the generateHdFlatlay function.
 * - GenerateHdFlatlayOutput - The return type for the generateHdFlatlay function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateHdFlatlayInputSchema = z.object({
  productImage: z
    .string()
    .describe(
      "A photo of the product, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type GenerateHdFlatlayInput = z.infer<typeof GenerateHdFlatlayInputSchema>;

const GenerateHdFlatlayOutputSchema = z.object({
  hdFlatlayImage: z
    .string()
    .describe(
      'The generated high-definition flat lay image of the product, as a data URI.'
    ),
});
export type GenerateHdFlatlayOutput = z.infer<typeof GenerateHdFlatlayOutputSchema>;

export async function generateHdFlatlay(input: GenerateHdFlatlayInput): Promise<GenerateHdFlatlayOutput> {
  return generateHdFlatlayFlow(input);
}

const generateHdFlatlayPrompt = ai.definePrompt({
  name: 'generateHdFlatlayPrompt',
  input: {schema: GenerateHdFlatlayInputSchema},
  output: {schema: GenerateHdFlatlayOutputSchema},
  prompt: `Generate a high-definition, photorealistic flat lay image of the following product. Ensure the image is suitable for e-commerce, with realistic textures and lighting.
  Source Image: {{media url=productImage}}
  If the source image is already of high quality, enhance its resolution and detail without altering the product's appearance.
`,
});

const generateHdFlatlayFlow = ai.defineFlow(
  {
    name: 'generateHdFlatlayFlow',
    inputSchema: GenerateHdFlatlayInputSchema,
    outputSchema: GenerateHdFlatlayOutputSchema,
  },
  async input => {
    const {media} = await ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: [
        {media: {url: input.productImage}},
        {
          text: `Generate a high-definition, photorealistic flat lay image of the product above. Ensure the image is suitable for e-commerce, with realistic textures and lighting. If the source image is already of high quality, enhance its resolution and detail without altering the product's appearance.`,
        },
      ],
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    return {hdFlatlayImage: media!.url!};
  }
);
