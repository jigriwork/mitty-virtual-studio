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
          text: `You are an expert photo editor. Your task is to enhance the provided product image into a high-definition, professional flat lay photograph suitable for e-commerce.

**Crucial Instructions:**
1.  **DO NOT CHANGE THE LOGO.** The logo on the product must remain exactly as it is in the original image. It must be kept sharp, clear, and untouched. Do not redraw, reinterpret, or alter the logo in any way.
2.  **PRESERVE ORIGINAL DESIGN:** Do not alter the product's design, color, pattern, texture, or button placement. The goal is enhancement, not redesign.
3.  **CREATE A FLAT LAY:** Arrange the product in a clean, flat lay presentation on a neutral, slightly textured background (like light gray linen or a white wooden surface).
4.  **ENHANCE QUALITY:** Improve the lighting to be bright and even, like in a professional studio. Enhance the overall clarity and resolution of the image to make it look high-definition. Ensure the final image is photorealistic.`,
        },
      ],
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    return {hdFlatlayImage: media!.url!};
  }
);
