/**
 * @fileOverview Shared types and schemas for AI generation flows.
 */
import {z} from 'genkit';

export const GenerateProductViewInputSchema = z.object({
  productCategory: z.enum(['Shirt', 'Trousers', 'Jeans', 'Shoes']).describe('The category of the product.'),
  sleeveType: z.enum(['Full Sleeve', 'Half Sleeve']).optional().describe('The sleeve type of the shirt (only for shirts).'),
  gender: z.enum(['Male', 'Female']).describe('The gender for which the product is intended.'),
  fabricType: z.string().describe('The type of fabric used for the product (e.g., Linen, Cotton).'),
  productImage: z.string().optional().describe(
    "A photo of the product (for shirts/shoes), as a data URI."
  ),
  productImageFront: z.string().optional().describe('Front view photo of trousers, as a data URI.'),
  productImageFabric: z.string().optional().describe('Fabric close-up photo of trousers, as a data URI.'),
  productImageBack: z.string().optional().describe('Back view photo of trousers, as a data URI.'),
  color: z.string().optional().describe('The color of the product.'),
  pattern: z.string().optional().describe('The pattern of the product (e.g., Floral, Stripes, Solid).'),
  fitType: z.string().optional().describe('The fit type of the trousers (e.g., Slim, Regular).'),
  materialStretch: z.enum(['Yes', 'No']).optional().describe('Whether the trouser material is stretchable.'),
});
export type GenerateProductViewInput = z.infer<typeof GenerateProductViewInputSchema>;
