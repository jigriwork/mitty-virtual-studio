'use server';

/**
 * @fileOverview An AI agent for generating photorealistic images of a product from different angles (front, side, back) with a consistent model.
 *
 * - generateProductImages - A function that handles the product image generation process.
 * - GenerateProductImagesInput - The input type for the generateProductImages function.
 * - GenerateProductImagesOutput - The return type for the generateProductImages function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateProductImagesInputSchema = z.object({
  productCategory: z.enum(['Shirt', 'Trousers', 'Jeans', 'Shoes']).describe('The category of the product.'),
  sleeveType: z.enum(['Full Sleeve', 'Half Sleeve']).optional().describe('The sleeve type of the shirt (only applicable for shirts).'),
  gender: z.enum(['Male', 'Female']).describe('The gender for which the product is intended.'),
  fabricType: z.string().describe('The type of fabric used for the product (e.g., Linen, Cotton).'),
  productImage: z.string().describe(
    "A photo of the product, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
  ),
  color: z.string().optional().describe('The color of the product.'),
  pattern: z.string().optional().describe('The pattern of the product (e.g., Floral, Stripes, Solid).'),
});

export type GenerateProductImagesInput = z.infer<typeof GenerateProductImagesInputSchema>;

const GenerateProductImagesOutputSchema = z.object({
  frontView: z.string().describe("A photorealistic image of the product's front view, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
  sideView: z.string().describe("A photorealistic image of the product's side view, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
  backView: z.string().describe("A photorealistic image of the product's back view, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
});

export type GenerateProductImagesOutput = z.infer<typeof GenerateProductImagesOutputSchema>;

export async function generateProductImages(input: GenerateProductImagesInput): Promise<GenerateProductImagesOutput> {
  return generateProductImagesFlow(input);
}

const generateProductImagesFlow = ai.defineFlow(
  {
    name: 'generateProductImagesFlow',
    inputSchema: GenerateProductImagesInputSchema,
    outputSchema: GenerateProductImagesOutputSchema,
  },
  async input => {
    const createViewPrompt = (view: 'Front' | 'Side' | 'Back') => {
      const sleeveType = input.productCategory === 'Shirt' ? input.sleeveType : '';
      const productDescription = `${input.fabricType} ${sleeveType} ${input.productCategory.toLowerCase()}`.trim();
      const gender = input.gender.toLowerCase();
      const forGender = gender === 'male' ? 'men' : 'women';
      const colorPattern = `with a ${input.color || 'specified'} base and ${input.pattern || 'specified'} design`;

      const prompts = {
        Front: `Generate a photorealistic front view of a ${gender} model standing straight in a studio setup. He is wearing a ${productDescription} for ${forGender} ${colorPattern}, accurately reflecting the style and print of the uploaded product image.

The model should have a neutral expression, facing forward, with both arms straight and visible. ${input.productCategory === 'Shirt' ? 'Shirt sleeves must not be folded.' : ''} The ${input.productCategory.toLowerCase()} should be well-fitted, ironed, and worn with black trousers.

The lighting should be clean and soft, like a professional ecommerce photoshoot. The ${input.productCategory.toLowerCase()} must match the uploaded product exactly — including button color, collar style, and print placement.

Background should be solid beige or light grey. The model’s face must remain the same across all other views.`,
        Side: `Generate a photorealistic side view of the same ${gender} model, turned 90 degrees to his left, in a studio environment. He is wearing the same ${productDescription} for ${forGender}, based on the uploaded product image ${colorPattern}.

The side profile should clearly show sleeve length and ${input.productCategory.toLowerCase()} fit. ${input.productCategory === 'Shirt' ? 'Sleeves should be worn normally — no folding or rolling.' : ''} Use clean studio lighting and a soft beige background.

Ensure color accuracy, fabric texture, and button/collar details match the uploaded product image. The model must be identical to the front view — same face, hair, and posture — to ensure consistency across the product shoot.`,
        Back: `Generate a photorealistic back view of the same ${gender} model standing straight in a studio setup, wearing the same ${productDescription} for ${forGender} ${colorPattern}, based on the uploaded product image.

The model should face away from the camera, arms naturally at the side. The ${input.productCategory.toLowerCase()} should fit cleanly with no wrinkles or folds. ${input.productCategory === 'Shirt' ? 'Sleeves must be worn straight — not rolled or pushed up.' : ''}

Background should remain the same as front and side views (solid beige). The ${input.productCategory.toLowerCase()} pattern should continue realistically on the back, matching style and fabric shown in the uploaded image. Model must be identical to other views.`,
      };
      
      return prompts[view];
    };

    const frontViewPromise = ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: [
        {media: {url: input.productImage}},
        {text: createViewPrompt('Front')},
      ],
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    const sideViewPromise = ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: [
        {media: {url: input.productImage}},
        {text: createViewPrompt('Side')},
      ],
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    const backViewPromise = ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: [
        {media: {url: input.productImage}},
        {text: createViewPrompt('Back')},
      ],
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    const [frontViewResult, sideViewResult, backViewResult] = await Promise.all(
      [frontViewPromise, sideViewPromise, backViewPromise]
    );

    return {
      frontView: frontViewResult.media!.url,
      sideView: sideViewResult.media!.url,
      backView: backViewResult.media!.url,
    };
  }
);
