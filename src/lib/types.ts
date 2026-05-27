import { z } from 'zod';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
type UploadedFiles = File[];

export type AvailableSizeRow = {
  id: string;
  size: string;
  quantity: string;
};

export const productFormSchema = z.object({
  productCategory: z.enum(['Shirt', 'Trousers', 'Jeans', 'Shoes', 'Perfume'], {
    required_error: 'Please select a product category.',
  }),
  sleeveType: z.enum(['Full Sleeve', 'Half Sleeve']).optional(),
  gender: z.enum(['Male', 'Female', 'Unisex']),
  fabricType: z.string().optional(),
  color: z.string().optional(),
  pattern: z.string().optional(),
  mrp: z.string().optional(),
  availableSizes: z.array(z.object({
    id: z.string(),
    size: z.string(),
    quantity: z.string(),
  })).optional(),
  frontPocket: z.enum(['Auto Detect', 'Yes', 'No']).optional(),
  patternOverride: z.enum(['Auto Detect', 'Plain', 'Printed', 'Checked', 'Striped', 'Textured']).optional(),
  collarType: z.enum(['Auto Detect', 'Spread Collar', 'Button Down', 'Mandarin', 'Cuban/Open Collar']).optional(),
  visibleLogo: z.enum(['Auto Detect', 'No visible logo', 'Small chest logo', 'Label/tag only']).optional(),
  fitType: z.string().optional(),
  materialStretch: z.enum(['Yes', 'No']).optional(),
  trouserFrontPocketType: z.enum(['Auto Detect', 'Slant Side Pockets', 'Straight Side Pockets', 'No Visible Front Pockets']).optional(),
  trouserBackPocketType: z.enum(['Auto Detect', 'Two Welt Pockets With Buttons', 'Two Welt Pockets No Buttons', 'One Back Pocket', 'No Back Pockets']).optional(),
  trouserVisibleLogo: z.enum(['Auto Detect', 'No visible logo', 'Tag only']).optional(),
  trouserFrontStyle: z.enum(['Auto Detect', 'Flat Front', 'Single Pleat', 'Double Pleat']).optional(),
  trouserCrease: z.enum(['Auto Detect', 'Visible Center Crease', 'No Visible Crease']).optional(),
  trouserFit: z.enum(['Auto Detect', 'Slim Fit', 'Regular Fit', 'Relaxed Fit']).optional(),
  trouserFabricFinish: z.enum(['Auto Detect', 'Fine Woven', 'Smooth Formal', 'Lycra Blend Look', 'Textured Weave']).optional(),
  trouserTagBrandingVisibility: z.enum(['Auto Detect', 'No visible tags or branding anywhere', 'Show only if clearly visible in source', 'Flatlay/product-only tag allowed if clearly visible in source']).optional(),
  productImage: z.custom<UploadedFiles>().optional().nullable(),
  openShirtImage: z.custom<UploadedFiles>().optional().nullable(),
  fabricCloseupImage: z.custom<UploadedFiles>().optional().nullable(),
  collarButtonCloseupImage: z.custom<UploadedFiles>().optional().nullable(),
  pocketLogoDetailImage: z.custom<UploadedFiles>().optional().nullable(),
  backSideImage: z.custom<UploadedFiles>().optional().nullable(),
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
  outputBackgroundStyle: z.enum(['Clean Light Grey Studio', 'Clean Off-White Studio', 'Transparent/Isolated Product Style later', 'Premium Beige Studio']).optional(),

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

export type SeoContentPack = {
  seoTitle: string;
  productTitle: string;
  shortDescription: string;
  longDescription: string;
  productDescription: string;
  bulletFeatures: string[];
  metaTitle: string;
  metaDescription: string;
  slug: string;
  imageAltTexts: string[];
  categoryTags: string[];
  stylingSuggestions: string;
  detectedColor: string;
};

export type GenerationResults = {
  frontView?: string;
  sideView?: string;
  backView?: string;
  textureView?: string;
  hdFlatlayImage?: string;
  heroView?: string; // For perfume
  productTitle: string;
  productDescription: string;
  seoTitle: string;
  shortDescription: string;
  longDescription: string;
  bulletFeatures: string[];
  metaTitle: string;
  metaDescription: string;
  slug: string;
  imageAltTexts: string[];
  categoryTags: string[];
  stylingSuggestions: string;
  detectedColor: string;
  productCategory: 'Shirt' | 'Trousers' | 'Jeans' | 'Shoes' | 'Perfume';
  gender: 'Male' | 'Female' | 'Unisex';
  selectedColor?: string;
  effectiveColor?: string;
  isManualColor?: boolean;
  color?: string;
  fitType?: string;
  mrp?: string;
  sellingPrice?: string;
  costPrice?: string;
  availableSizes?: AvailableSizeRow[];
};

export type GenerationProgressStepStatus = 'pending' | 'active' | 'completed' | 'failed';

export type GenerationProgressStep = {
  id: string;
  label: string;
  status: GenerationProgressStepStatus;
  error?: string;
};

export type GenerationProgressState = {
  status: 'idle' | 'running' | 'failed' | 'done';
  percent: number;
  currentStepId?: string;
  startedAt?: number;
  completedAt?: number;
  failedStepId?: string;
  failedReason?: string;
  steps: GenerationProgressStep[];
};
