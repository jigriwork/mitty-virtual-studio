import { z } from 'zod';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
type UploadedFiles = File[];

export const productFormSchema = z.object({
  productCategory: z.enum(['Shirt', 'Trousers', 'Jeans', 'Shoes', 'Perfume'], {
    required_error: 'Please select a product category.',
  }),
  sleeveType: z.enum(['Full Sleeve', 'Half Sleeve']).optional(),
  gender: z.enum(['Male', 'Female', 'Unisex']),
  fabricType: z.string().optional(),
  color: z.string().optional(),
  pattern: z.string().optional(),
  fitType: z.string().optional(),
  materialStretch: z.enum(['Yes', 'No']).optional(),
  productImage: z.custom<UploadedFiles>().optional().nullable(),
  productImageFront: z.custom<UploadedFiles>().optional().nullable(),
  productImageFabric: z.custom<UploadedFiles>().optional().nullable(),
  productImageBack: z.custom<UploadedFiles>().optional().nullable(),
  // Perfume fields
  fragranceName: z.string().optional(),
  fragranceFamily: z.string().optional(),
  sizeMl: z.string().optional(),
  bottleImageFile: z.custom<UploadedFiles>().optional().nullable(),
  boxFrontImageFile: z.custom<UploadedFiles>().optional().nullable(),
  boxBackImageFile: z.custom<UploadedFiles>().optional().nullable(),

}).superRefine((data, ctx) => {
    const validateFile = (files: UploadedFiles | null | undefined, path: (string | number)[]) => {
      if (files && files.length === 1) {
        if (files[0].size > MAX_FILE_SIZE) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Max file size is 5MB.`,
            path,
          });
        }
        if (!ACCEPTED_IMAGE_TYPES.includes(files[0].type)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Only .jpg, .png and .webp formats are supported.',
            path,
          });
        }
      } else {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Image is required.',
            path,
        });
      }
    };

    if (data.productCategory === 'Shirt') {
        if (!data.fabricType || data.fabricType.trim() === '') {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Fabric type is required.', path: ['fabricType'] });
        }
        if (!data.sleeveType) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Sleeve type is required for shirts.', path: ['sleeveType'] });
        }
        validateFile(data.productImage, ['productImage']);

    } else if (data.productCategory === 'Shoes' || data.productCategory === 'Jeans') {
        if (!data.fabricType || data.fabricType.trim() === '') {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Material type is required.', path: ['fabricType'] });
        }
        validateFile(data.productImage, ['productImage']);

    } else if (data.productCategory === 'Trousers') {
        if (!data.fabricType || data.fabricType.trim() === '') {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Fabric type is required.', path: ['fabricType'] });
        }
        if (!data.fitType || data.fitType.trim() === '') {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Fit type is required.', path: ['fitType'] });
        }
        if (!data.materialStretch) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Please specify if material has stretch.', path: ['materialStretch'] });
        }
        validateFile(data.productImageFront, ['productImageFront']);
        validateFile(data.productImageFabric, ['productImageFabric']);
        validateFile(data.productImageBack, ['productImageBack']);
    } else if (data.productCategory === 'Perfume') {
        if (!['Male', 'Female', 'Unisex'].includes(data.gender)) {
             ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Please select a target audience.', path: ['gender'] });
        }
        if (!data.fragranceFamily || data.fragranceFamily.trim() === '') {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Fragrance family is required.', path: ['fragranceFamily'] });
        }
        if (!data.sizeMl || data.sizeMl.trim() === '') {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Size (ml) is required.', path: ['sizeMl'] });
        }
        validateFile(data.bottleImageFile, ['bottleImageFile']);
        validateFile(data.boxFrontImageFile, ['boxFrontImageFile']);
        validateFile(data.boxBackImageFile, ['boxBackImageFile']);
    }
});


export type ProductFormValues = z.infer<typeof productFormSchema>;

export type GenerationResults = {
  frontView: string;
  sideView?: string;
  backView: string;
  textureView?: string;
  hdFlatlayImage?: string;
  heroView?: string; // For perfume
  productTitle: string;
  productDescription: string;
  productCategory: 'Shirt' | 'Trousers' | 'Jeans' | 'Shoes' | 'Perfume';
  color?: string;
  fitType?: string;
};
