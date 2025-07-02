import { z } from 'zod';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const productFormSchema = z.object({
  productCategory: z.enum(['Shirt', 'Trousers', 'Jeans', 'Shoes'], {
    required_error: 'Please select a product category.',
  }),
  sleeveType: z.enum(['Full Sleeve', 'Half Sleeve']).optional(),
  gender: z.enum(['Male', 'Female']),
  fabricType: z.string().min(1, 'Fabric type is required.'),
  color: z.string().optional(),
  pattern: z.string().optional(),
  productImage: z
    .any()
    .refine((files) => files?.length == 1, 'Product image is required.')
    .refine((files) => files?.[0]?.size <= MAX_FILE_SIZE, `Max file size is 5MB.`)
    .refine(
      (files) => ACCEPTED_IMAGE_TYPES.includes(files?.[0]?.type),
      'Only .jpg, .png and .webp formats are supported.'
    ),
}).refine(data => data.productCategory === 'Shirt' ? !!data.sleeveType : true, {
    message: 'Sleeve type is required for shirts.',
    path: ['sleeveType'],
});


export type ProductFormValues = z.infer<typeof productFormSchema>;

export type GenerationResults = {
  frontView: string;
  sideView: string;
  backView: string;
  hdFlatlayImage: string;
  productTitle: string;
  productDescription: string;
};
