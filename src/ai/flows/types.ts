/**
 * @fileOverview Shared types and schemas for AI generation flows.
 */
import {z} from 'genkit';

export const GenerateProductViewInputSchema = z.object({
  productCategory: z.enum(['Shirt', 'Trousers', 'Jeans', 'Shoes', 'Perfume']).describe('The category of the product.'),
  sleeveType: z.enum(['Full Sleeve', 'Half Sleeve']).optional().describe('The sleeve type of the shirt (only for shirts).'),
  gender: z.enum(['Male', 'Female', 'Unisex']).describe('The gender for which the product is intended.'),
  fabricType: z.string().optional().describe('The type of fabric used for the product (e.g., Linen, Cotton).'),
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

  // Perfume fields
  fragranceFamily: z.string().optional().describe('The fragrance family of the perfume.'),
  perfumeType: z.string().optional().describe('The type of perfume.'),
  sizeMl: z.string().optional().describe('The size of the perfume in milliliters.'),
  bottleImageUri: z.string().optional().describe('A photo of the perfume bottle, as a data URI.'),
  boxFrontImageUri: z.string().optional().describe('A photo of the front of the perfume box, as a data URI.'),
  boxBackImageUri: z.string().optional().describe('A photo of the back of the perfume box, as a data URI.'),
});
export type GenerateProductViewInput = z.infer<typeof GenerateProductViewInputSchema>;
