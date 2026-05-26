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
  mainProductImage: z.string().optional().describe('Main product photo for shirts, as a data URI.'),
  openShirtImage: z.string().optional().describe('Optional full open shirt reference photo, as a data URI.'),
  fabricCloseupImage: z.string().optional().describe('Optional shirt fabric or pattern close-up, as a data URI.'),
  collarButtonCloseupImage: z.string().optional().describe('Optional shirt collar and button close-up, as a data URI.'),
  pocketLogoDetailImage: z.string().optional().describe('Optional shirt pocket, logo, or detail close-up, as a data URI.'),
  backSideImage: z.string().optional().describe('Optional shirt back side reference photo, as a data URI.'),
  productImageFront: z.string().optional().describe('Front view photo of trousers, as a data URI.'),
  productImageFabric: z.string().optional().describe('Fabric close-up photo of trousers, as a data URI.'),
  productImageBack: z.string().optional().describe('Back view photo of trousers, as a data URI.'),
  color: z.string().optional().describe('The color of the product.'),
  pattern: z.string().optional().describe('The pattern of the product (e.g., Floral, Stripes, Solid).'),
  frontPocket: z.enum(['Auto Detect', 'Yes', 'No']).optional().describe('Product accuracy lock: whether the shirt has a front pocket.'),
  patternOverride: z.enum(['Auto Detect', 'Plain', 'Printed', 'Checked', 'Striped', 'Textured']).optional().describe('Product accuracy lock: override for the shirt pattern.'),
  collarType: z.enum(['Auto Detect', 'Spread Collar', 'Button Down', 'Mandarin', 'Cuban/Open Collar']).optional().describe('Product accuracy lock: shirt collar type.'),
  visibleLogo: z.enum(['Auto Detect', 'No visible logo', 'Small chest logo', 'Label/tag only']).optional().describe('Product accuracy lock: whether visible logos should appear on the worn shirt.'),
  outputBackgroundStyle: z.enum(['Clean Light Grey Studio', 'Clean Off-White Studio', 'Transparent/Isolated Product Style later', 'Premium Beige Studio']).optional().describe('Selected studio background style for consistent output.'),
  fitType: z.string().optional().describe('The fit type of the trousers (e.g., Slim, Regular).'),
  materialStretch: z.enum(['Yes', 'No']).optional().describe('Whether the trouser material is stretchable.'),
  trouserFrontPocketType: z.enum(['Auto Detect', 'Slant Side Pockets', 'Straight Side Pockets', 'No Visible Front Pockets']).optional().describe('Trouser accuracy lock: front pocket type.'),
  trouserBackPocketType: z.enum(['Auto Detect', 'Two Welt Pockets With Buttons', 'Two Welt Pockets No Buttons', 'One Back Pocket', 'No Back Pockets']).optional().describe('Trouser accuracy lock: back pocket type.'),
  trouserVisibleLogo: z.enum(['Auto Detect', 'No visible logo', 'Tag only']).optional().describe('Trouser accuracy lock: whether visible logos should appear on the worn trouser.'),
  trouserFrontStyle: z.enum(['Auto Detect', 'Flat Front', 'Single Pleat', 'Double Pleat']).optional().describe('Trouser accuracy lock: flat front or pleat style.'),
  trouserCrease: z.enum(['Auto Detect', 'Visible Center Crease', 'No Visible Crease']).optional().describe('Trouser accuracy lock: crease visibility.'),
  trouserFit: z.enum(['Auto Detect', 'Slim Fit', 'Regular Fit', 'Relaxed Fit']).optional().describe('Trouser accuracy lock: structured fit selection.'),
  trouserFabricFinish: z.enum(['Auto Detect', 'Fine Woven', 'Smooth Formal', 'Lycra Blend Look', 'Textured Weave']).optional().describe('Trouser accuracy lock: fabric finish.'),
  trouserTagBrandingVisibility: z.enum(['Auto Detect', 'No visible tags or branding anywhere', 'Show only if clearly visible in source', 'Flatlay/product-only tag allowed if clearly visible in source']).optional().describe('Trouser accuracy lock: tag and branding visibility policy.'),

  // Perfume fields
  fragranceName: z.string().optional().describe('The name of the fragrance.'),
  fragranceFamily: z.string().optional().describe('The fragrance family of the perfume.'),
  sizeMl: z.string().optional().describe('The size of the perfume in milliliters.'),
  bottleImageUri: z.string().optional().describe('A photo of the perfume bottle, as a data URI.'),
  boxFrontImageUri: z.string().optional().describe('A photo of the front of the perfume box, as a data URI.'),
  boxBackImageUri: z.string().optional().describe('A photo of the back of the perfume box, as a data URI.'),
});
export type GenerateProductViewInput = z.infer<typeof GenerateProductViewInputSchema>;
