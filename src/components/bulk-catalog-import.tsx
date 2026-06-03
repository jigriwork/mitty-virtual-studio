'use client';

import JSZip from 'jszip';
import { AlertCircle, CheckCircle2, Copy, Download, ExternalLink, FileArchive, Loader2, RotateCcw, Upload } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import {
  CATALOG_DEFAULTS_STORAGE_KEY,
  DEFAULT_PICKUP_ADDRESS_CODE,
  DEFAULT_RETURN_EXCHANGE_CONDITION,
  type CatalogDefaults,
  getAutoGstPercent,
  getCategoryHsnCode,
  getCategorySizeChartUrl,
  mergeCatalogDefaults,
} from '@/lib/catalog';
import { downloadBlob } from '@/lib/file-actions';
import { getSupabaseBrowserClient, hasSupabaseBrowserConfig } from '@/lib/supabase/client';
import {
  PRODUCT_IMAGES_BUCKET,
  isPublicStorageUrl,
  sanitizeStorageSegment,
  uploadFileToPublicStorage,
} from '@/lib/supabase/storage';
import { cn } from '@/lib/utils';

type ParsedSizeRow = {
  size: string;
  quantity: string;
  sku: string;
};

type ProductInfoFields = {
  seoTitle: string;
  productTitle: string;
  genderTarget: string;
  mrpRaw: string;
  mrp: string;
  availableSizesRaw: string;
  shortDescription: string;
  longDescription: string;
  bulletFeatures: string;
  metaTitle: string;
  metaDescription: string;
  slug: string;
  selectedColor: string;
  detectedColor: string;
  finalColorUsed: string;
};

type ImageRole = 'front' | 'side' | 'back' | 'flatLay';
type ProductCategory = 'Shirt' | 'Trousers' | 'Jeans' | 'Shoes' | 'Perfume' | 'Unknown';

type ImagePreview = {
  name: string;
  url: string;
};

type ImageAsset = ImagePreview & {
  file: File;
};

type UploadStatus = 'Not uploaded' | 'Uploading' | 'Uploaded' | 'Failed';
type CatalogImageSlot = 'image1' | 'image2' | 'image3' | 'image4';

type ParsedProduct = {
  id: string;
  sourceName: string;
  productCode: string;
  status: 'Ready' | 'Needs Review' | 'Blocked';
  fields: ProductInfoFields;
  productTitle: string;
  category: ProductCategory;
  genderTarget: string;
  mrp: string;
  colour: string;
  sizes: ParsedSizeRow[];
  images: Record<ImageRole, string>;
  imagePreviews: Record<ImageRole, ImagePreview | null>;
  imageAssets: Record<ImageRole, ImageAsset | null>;
  uploadStatus: UploadStatus;
  imageUrls: Record<CatalogImageSlot, string>;
  uploadErrors: string[];
  uploadWarnings: string[];
  info: string[];
  reviewIssues: string[];
  warnings: string[];
  errors: string[];
};

const PRODUCT_INFO_FILE = 'product_info.txt';
const ZIP_EXTENSION = '.zip';
const IMAGE_EXTENSION_PATTERN = /\.(png|jpe?g|webp)$/i;
const productCodePrefixes: Record<Exclude<ProductCategory, 'Unknown'>, string> = {
  Shirt: 'MITTY-SHIRT',
  Trousers: 'MITTY-TROUSER',
  Jeans: 'MITTY-JEANS',
  Shoes: 'MITTY-SHOES',
  Perfume: 'MITTY-PERFUME',
};

const imageRoleStorageNames: Record<ImageRole, string> = {
  front: 'front.png',
  side: 'side.png',
  back: 'back.png',
  flatLay: 'flatlay.png',
};

const imageSlots: CatalogImageSlot[] = ['image1', 'image2', 'image3', 'image4'];

const finalCatalogHeaders = [
  'Product Code',
  'Amazon ASIN',
  'Name',
  'Sku Id',
  'Selling Price',
  'MRP',
  'Cost Price',
  'Quantity',
  'Packaging Length (in cm)',
  'Packaging Breadth (in cm)',
  'Packaging Height (in cm)',
  'Packaging Weight (in kg)',
  'Size',
  'attr_Fabric',
  'GST %',
  '',
  'Image 1',
  'Image 2',
  'Image 3',
  'Image 4',
  'Image 5',
  'Image 6',
  'Image 7',
  'Image 8',
  'Image 9',
  'Image 10',
  'Video 1',
  'Video 2',
  'Product Type',
  'Colour',
  'Description',
  'Return/Exchange Condition',
  'Visibility',
  'Size Chart',
  'Pickup Address Code',
  'HSN Code',
  'Customisation Id',
  'Associated Pixel',
  'Size Type',
  'attr_Type',
  'attr_Ideal For',
  'attr_Occasion',
  'attr_Fit',
  'attr_Product Type',
  'attr_Color',
  'attr_Fit/ Shape',
  'attr_Pattern',
  'attr_Pack Of',
] as const;

const productInfoLabels = [
  'SEO Title',
  'Product Title',
  'Gender/Target',
  'MRP',
  'Available Sizes / Quantity',
  'Short Description',
  'Long Description',
  'Bullet Features',
  'Meta Title',
  'Meta Description',
  'Slug',
  'Selected Color',
  'Detected Color',
  'Final Color Used',
] as const;

const labelToField = {
  'SEO Title': 'seoTitle',
  'Product Title': 'productTitle',
  'Gender/Target': 'genderTarget',
  MRP: 'mrpRaw',
  'Available Sizes / Quantity': 'availableSizesRaw',
  'Short Description': 'shortDescription',
  'Long Description': 'longDescription',
  'Bullet Features': 'bulletFeatures',
  'Meta Title': 'metaTitle',
  'Meta Description': 'metaDescription',
  Slug: 'slug',
  'Selected Color': 'selectedColor',
  'Detected Color': 'detectedColor',
  'Final Color Used': 'finalColorUsed',
} satisfies Record<(typeof productInfoLabels)[number], keyof ProductInfoFields>;

const emptyFields = (): ProductInfoFields => ({
  seoTitle: '',
  productTitle: '',
  genderTarget: '',
  mrpRaw: '',
  mrp: '',
  availableSizesRaw: '',
  shortDescription: '',
  longDescription: '',
  bulletFeatures: '',
  metaTitle: '',
  metaDescription: '',
  slug: '',
  selectedColor: '',
  detectedColor: '',
  finalColorUsed: '',
});

const isZipName = (name: string) => name.toLowerCase().endsWith(ZIP_EXTENSION);

const isProductInfoName = (name: string) => {
  const fileName = name.split('/').pop()?.toLowerCase();
  return fileName === PRODUCT_INFO_FILE;
};

const isRealColor = (value: string) => {
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 && normalized !== 'auto detect' && normalized !== 'auto-detect';
};

const getSearchText = (...values: string[]) => values.filter(Boolean).join(' ').toLowerCase();

const detectCategory = (productTitle: string, sourceName: string): ProductCategory => {
  const text = getSearchText(productTitle, sourceName);

  if (/\bshirts?\b/.test(text)) return 'Shirt';
  if (/\b(trousers?|pants?)\b/.test(text)) return 'Trousers';
  if (/\b(jeans|denim)\b/.test(text)) return 'Jeans';
  if (/\b(shoes?|loafers?|sneakers?|formal shoe)\b/.test(text)) return 'Shoes';
  if (/\b(perfume|fragrance|eau de parfum|edp)\b/.test(text)) return 'Perfume';

  return 'Unknown';
};

const normalizeGender = (value: string) => {
  const text = value.trim().toLowerCase();

  if (/\bunisex\b/.test(text)) return 'Unisex';
  if (/\b(men|men['’]?s|mens|male)\b/.test(text)) return 'Men';
  if (/\b(women|women['’]?s|womens|ladies|female)\b/.test(text)) return 'Women';

  return '';
};

const inferGender = (genderTarget: string, productTitle: string, sourceName: string) =>
  normalizeGender(genderTarget) || normalizeGender(getSearchText(productTitle, sourceName));

const formatProductCode = (category: ProductCategory, index: number) => {
  const prefix = category === 'Unknown' ? 'MITTY-PRODUCT' : productCodePrefixes[category];
  return `${prefix}-${String(index).padStart(3, '0')}`;
};

const detectImageRole = (name: string): ImageRole | null => {
  if (!IMAGE_EXTENSION_PATTERN.test(name)) {
    return null;
  }

  const fileName = (name.split('/').pop() || name).toLowerCase();

  if (/\bfront\b/.test(fileName)) return 'front';
  if (/\bside\b/.test(fileName)) return 'side';
  if (/\bback\b/.test(fileName)) return 'back';
  if (/\bflat[\s_-]*lay\b/.test(fileName) || /\bflatlay\b/.test(fileName)) return 'flatLay';

  return null;
};

const parseProductInfo = (text: string) => {
  const fields = emptyFields();
  const labelPattern = productInfoLabels
    .map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');
  const fieldPattern = new RegExp(`^(${labelPattern}):\\s*(.*)$`);
  let currentLabel: (typeof productInfoLabels)[number] | null = null;
  let currentLines: string[] = [];

  const commit = () => {
    if (!currentLabel) {
      return;
    }

    fields[labelToField[currentLabel]] = currentLines.join('\n').trim();
  };

  for (const line of text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')) {
    const match = line.match(fieldPattern);

    if (match) {
      commit();
      currentLabel = match[1] as (typeof productInfoLabels)[number];
      currentLines = [match[2] || ''];
      continue;
    }

    if (currentLabel) {
      currentLines.push(line);
    }
  }

  commit();
  fields.mrp = parseMrp(fields.mrpRaw);

  return fields;
};

const parseMrp = (mrpRaw: string) => {
  const match = mrpRaw.replace(/,/g, '').match(/\d+(?:\.\d+)?/);
  return match?.[0] || '';
};

const parseSizes = (raw: string, productCode: string) =>
  raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.match(/^(.+?)\s*-\s*(\d+)$/))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match) => {
      const size = match[1].trim();
      return {
        size,
        quantity: match[2].trim(),
        sku: `${productCode}-${size}`,
      };
    });

const deriveStatus = (errors: string[], reviewIssues: string[]): ParsedProduct['status'] => {
  if (errors.length > 0) return 'Blocked';
  if (reviewIssues.length > 0) return 'Needs Review';
  return 'Ready';
};

const createEmptyImages = (): Record<ImageRole, string> => ({
  front: '',
  side: '',
  back: '',
  flatLay: '',
});

const createEmptyImagePreviews = (): Record<ImageRole, ImagePreview | null> => ({
  front: null,
  side: null,
  back: null,
  flatLay: null,
});

const createEmptyImageAssets = (): Record<ImageRole, ImageAsset | null> => ({
  front: null,
  side: null,
  back: null,
  flatLay: null,
});

const createEmptyImageUrls = (): Record<CatalogImageSlot, string> => ({
  image1: '',
  image2: '',
  image3: '',
  image4: '',
});

const getImageSlotMapping = (category: ProductCategory): Record<CatalogImageSlot, ImageRole | null> => {
  if (category === 'Trousers' || category === 'Jeans') {
    return {
      image1: 'front',
      image2: 'back',
      image3: 'flatLay',
      image4: 'side',
    };
  }

  return {
    image1: 'front',
    image2: 'side',
    image3: 'back',
    image4: 'flatLay',
  };
};

const applyCategoryImageMessages = ({
  category,
  images,
  errors,
  info,
  warnings,
}: {
  category: ProductCategory;
  images: Record<ImageRole, string>;
  errors: string[];
  info: string[];
  warnings: string[];
}) => {
  if (!images.front) {
    errors.push(category === 'Perfume' ? 'Bottle/front image missing' : 'Front image missing');
  }

  if (category === 'Shirt' || category === 'Unknown') {
    if (!images.side) warnings.push('Side image missing');
    if (!images.back) warnings.push('Back image missing');
    if (!images.flatLay) warnings.push('Flat Lay image missing');
    return;
  }

  if (category === 'Trousers' || category === 'Jeans') {
    if (!images.side) info.push('Side image optional for this category');
    if (!images.back) info.push('Back image recommended');
    if (!images.flatLay) info.push('Flat Lay image recommended');
    return;
  }

  if (category === 'Shoes') {
    if (!images.side) info.push('Additional side/angle image optional');
    if (!images.back) info.push('Back image optional');
    if (!images.flatLay) info.push('Flat Lay image optional');
    return;
  }

  if (category === 'Perfume') {
    if (!images.side) info.push('Box/front image recommended');
    if (!images.back) info.push('Box/back image recommended');
    if (!images.flatLay) info.push('Hero image optional');
  }
};

const createParsedProduct = async ({
  zip,
  sourceName,
  categoryCounters,
}: {
  zip: JSZip;
  sourceName: string;
  categoryCounters: Record<ProductCategory, number>;
}): Promise<ParsedProduct> => {
  const names = Object.keys(zip.files).filter((name) => !zip.files[name].dir);
  const infoName = names.find(isProductInfoName);
  const fields = emptyFields();
  const info: string[] = [];
  const reviewIssues: string[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];
  const images = createEmptyImages();
  const imagePreviews = createEmptyImagePreviews();
  const imageAssets = createEmptyImageAssets();

  if (!infoName) {
    errors.push('Product_Info.txt missing');
  } else {
    Object.assign(fields, parseProductInfo(await zip.file(infoName)!.async('string')));
  }

  for (const name of names) {
    const role = detectImageRole(name);
    if (role && !images[role]) {
      images[role] = name;
      const blob = await zip.file(name)!.async('blob');
      const fileName = name.split('/').pop() || `${role}.png`;
      const file = new File([blob], fileName, { type: blob.type || 'image/png' });
      const url = URL.createObjectURL(blob);
      const asset = {
        name,
        url,
        file,
      };
      imagePreviews[role] = asset;
      imageAssets[role] = asset;
    }
  }

  const productTitle = fields.productTitle || fields.seoTitle || sourceName.replace(/\.zip$/i, '');
  const category = detectCategory(productTitle, sourceName);
  categoryCounters[category] += 1;
  const productCode = formatProductCode(category, categoryCounters[category]);
  const sizes = parseSizes(fields.availableSizesRaw, productCode);
  const genderTarget = inferGender(fields.genderTarget, productTitle, sourceName);
  const colour = fields.finalColorUsed.trim()
    || (isRealColor(fields.selectedColor) ? fields.selectedColor.trim() : '')
    || fields.detectedColor.trim();

  if (!fields.productTitle) errors.push('Product title missing');
  if (!genderTarget) reviewIssues.push('Gender/Target unknown');
  if (!fields.mrp) errors.push('MRP missing or invalid');
  if (sizes.length === 0) errors.push('Available sizes/quantity missing or invalid');
  applyCategoryImageMessages({ category, images, errors, info, warnings });
  if (category === 'Unknown') reviewIssues.push('Category unknown');
  if (!colour) reviewIssues.push('Colour missing');

  return {
    id: `${sourceName}-${productCode}`,
    sourceName,
    productCode,
    status: deriveStatus(errors, reviewIssues),
    fields,
    productTitle,
    category,
    genderTarget,
    mrp: fields.mrp,
    colour,
    sizes,
    images,
    imagePreviews,
    imageAssets,
    uploadStatus: 'Not uploaded',
    imageUrls: createEmptyImageUrls(),
    uploadErrors: [],
    uploadWarnings: [],
    info,
    reviewIssues,
    warnings,
    errors,
  };
};

const expandZipFile = async (file: File) => {
  const zip = await JSZip.loadAsync(file);
  const names = Object.keys(zip.files).filter((name) => !zip.files[name].dir);

  if (names.some(isProductInfoName)) {
    return [{ sourceName: file.name, zip }];
  }

  const nestedZipNames = names.filter(isZipName);
  const products: Array<{ sourceName: string; zip: JSZip }> = [];

  for (const nestedName of nestedZipNames) {
    const data = await zip.file(nestedName)!.async('arraybuffer');
    products.push({
      sourceName: nestedName.split('/').pop() || nestedName,
      zip: await JSZip.loadAsync(data),
    });
  }

  if (products.length === 0) {
    throw new Error('No Product_Info.txt or nested product ZIPs found.');
  }

  return products;
};

const escapeCsvValue = (value: string) => {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
};

const createReportCsv = (products: ParsedProduct[]) => {
  const headers = [
    'Status',
    'Source ZIP',
    'Category',
    'Normalized Gender/Target',
    'Product Title',
    'Product Code',
    'Upload Status',
    'MRP',
    'Colour',
    'Sizes Count',
    'Future SKUs',
    'Front Image',
    'Side Image',
    'Back Image',
    'Flat Lay Image',
    'Image 1 URL',
    'Image 2 URL',
    'Image 3 URL',
    'Image 4 URL',
    'Upload Warnings',
    'Upload Errors',
    'Info',
    'Review Issues',
    'Warnings',
    'Errors',
  ];
  const rows = products.map((product) => [
    product.status,
    product.sourceName,
    product.category,
    product.genderTarget,
    product.productTitle,
    product.productCode,
    product.uploadStatus,
    product.mrp,
    product.colour,
    String(product.sizes.length),
    product.sizes.map((row) => row.sku).join(' | '),
    product.images.front,
    product.images.side,
    product.images.back,
    product.images.flatLay,
    product.imageUrls.image1,
    product.imageUrls.image2,
    product.imageUrls.image3,
    product.imageUrls.image4,
    product.uploadWarnings.join(' | '),
    product.uploadErrors.join(' | '),
    product.info.join(' | '),
    product.reviewIssues.join(' | '),
    product.warnings.join(' | '),
    product.errors.join(' | '),
  ]);

  return [headers, ...rows].map((row) => row.map(escapeCsvValue).join(',')).join('\r\n');
};

const readCatalogDefaults = () => {
  try {
    const stored = window.localStorage.getItem(CATALOG_DEFAULTS_STORAGE_KEY);
    return stored ? mergeCatalogDefaults(JSON.parse(stored) as Partial<CatalogDefaults>) : mergeCatalogDefaults(null);
  } catch {
    return mergeCatalogDefaults(null);
  }
};

const toCatalogCategory = (category: ProductCategory) => {
  if (category === 'Unknown') return null;
  return category;
};

const getProductDescription = (product: ParsedProduct) => {
  const description = product.fields.longDescription || product.fields.shortDescription || '';

  if (description && product.fields.bulletFeatures) {
    return `${description}\n\nBullet Features:\n${product.fields.bulletFeatures}`;
  }

  return description || product.fields.bulletFeatures;
};

const getAttrType = (product: ParsedProduct) => {
  const text = getSearchText(product.productTitle, product.fields.longDescription, product.fields.shortDescription);

  if (/\bfull sleeve shirt\b/.test(text)) return 'Full Sleeve Shirt';
  if (/\bhalf sleeve shirt\b/.test(text)) return 'Half Sleeve Shirt';
  if (product.category === 'Trousers') return /\bformal\b/.test(text) ? 'Formal Trouser' : 'Trousers';

  return '';
};

const getAttrPattern = (product: ParsedProduct) => {
  const text = getSearchText(product.productTitle, product.fields.longDescription, product.fields.shortDescription, product.fields.bulletFeatures);

  if (/\b(check|checked)\b/.test(text)) return 'Check';
  if (/\bfloral\b/.test(text)) return 'Floral';
  if (/\b(solid|plain)\b/.test(text)) return 'Solid';
  if (/\b(stripe|striped)\b/.test(text)) return 'Striped';
  if (/\bprinted\b/.test(text)) return 'Printed';

  return '';
};

const getExplicitAttribute = (product: ParsedProduct, patterns: RegExp[]) => {
  const text = `${product.productTitle}\n${product.fields.longDescription}\n${product.fields.shortDescription}\n${product.fields.bulletFeatures}`;
  const match = patterns.map((pattern) => text.match(pattern)?.[1]?.trim()).find(Boolean);
  return match || '';
};

const getCatalogDefaultsForProduct = (product: ParsedProduct, defaults: CatalogDefaults) => {
  const catalogCategory = toCatalogCategory(product.category);

  if (!catalogCategory) {
    return { hsnCode: '', sizeChartUrl: '' };
  }

  return {
    hsnCode: getCategoryHsnCode(catalogCategory, defaults),
    sizeChartUrl: getCategorySizeChartUrl(catalogCategory, defaults),
  };
};

const getPickupAddressCode = (defaults: CatalogDefaults) =>
  defaults.defaultPickupAddressCode.trim() || DEFAULT_PICKUP_ADDRESS_CODE;

const getReturnExchangeCondition = (defaults: CatalogDefaults) =>
  defaults.defaultReturnExchangeCondition.trim() || DEFAULT_RETURN_EXCHANGE_CONDITION;

const getVisibility = () => 'visible';

const getFinalExportValidation = (products: ParsedProduct[], defaults: CatalogDefaults) => {
  const defaultIssues: string[] = [];
  const productIssues: string[] = [];
  const affectedCounts: string[] = [];
  const blockedProductLabels = new Set<string>();
  let rowCount = 0;
  const productsMissingImage1 = products.filter((product) => !product.imageUrls.image1.trim());
  const imageUploadIssue = productsMissingImage1.length > 0
    ? {
      message: 'Images are not uploaded yet. Click Upload Images to create public image URLs before downloading the final catalog CSV.',
      productsNeedingUpload: products.filter((product) => product.uploadStatus !== 'Uploaded' || !product.imageUrls.image1.trim()).length,
      missingImage1Count: productsMissingImage1.length,
    }
    : null;
  const categoryCounts = products.reduce<Record<ProductCategory, number>>((acc, product) => {
    acc[product.category] += 1;
    return acc;
  }, {
    Shirt: 0,
    Trousers: 0,
    Jeans: 0,
    Shoes: 0,
    Perfume: 0,
    Unknown: 0,
  });

  if (products.length === 0) {
    productIssues.push('Parse products before downloading the final catalog CSV.');
  }

  if (!getPickupAddressCode(defaults)) defaultIssues.push('Pickup Address Code');
  if (!getReturnExchangeCondition(defaults)) defaultIssues.push('Return/Exchange Condition');
  if (categoryCounts.Shirt > 0 && !defaults.shirtSizeChartUrl.trim()) {
    defaultIssues.push('Shirt Size Chart URL');
    affectedCounts.push(`Shirts affected: ${categoryCounts.Shirt}`);
  }
  if (categoryCounts.Trousers > 0 && !defaults.trouserSizeChartUrl.trim()) {
    defaultIssues.push('Trouser Size Chart URL');
    affectedCounts.push(`Trousers affected: ${categoryCounts.Trousers}`);
  }
  if (categoryCounts.Shoes > 0 && !defaults.shoesHsnCode.trim()) {
    defaultIssues.push('Shoes HSN Code');
    affectedCounts.push(`Shoes affected: ${categoryCounts.Shoes}`);
  }
  if (categoryCounts.Perfume > 0 && !defaults.perfumeHsnCode.trim()) {
    defaultIssues.push('Perfume HSN Code');
    affectedCounts.push(`Perfume affected: ${categoryCounts.Perfume}`);
  }

  for (const product of products) {
    rowCount += product.sizes.length;
    const label = product.productTitle || product.sourceName;
    const productErrors: string[] = [];
    const mrpValue = Number(product.mrp);

    if (product.errors.includes('Product_Info.txt missing')) productErrors.push('Product_Info.txt missing.');
    if (product.category === 'Unknown') productErrors.push('category unknown.');
    if (!product.productCode.trim()) productErrors.push('product code missing.');
    if (!product.productTitle.trim()) productErrors.push('product title missing.');
    if (!product.mrp.trim() || !Number.isFinite(mrpValue) || mrpValue <= 0) productErrors.push('MRP missing or invalid.');
    if (product.sizes.length === 0) productErrors.push('sizes missing.');
    if (productErrors.length > 0) {
      blockedProductLabels.add(label);
      productIssues.push(...productErrors.map((error) => `${label}: ${error}`));
    }
  }

  const errors = [
    ...(imageUploadIssue ? [imageUploadIssue.message] : []),
    ...defaultIssues,
    ...productIssues,
  ];

  return {
    affectedCounts,
    blockedProducts: blockedProductLabels.size,
    defaultIssues,
    errors,
    imageUploadIssue,
    productIssues,
    rowCount,
    ready: errors.length === 0,
  };
};

const createFinalCatalogCsv = (products: ParsedProduct[], defaults: CatalogDefaults) => {
  const rows = products.flatMap((product) => {
    const productDefaults = getCatalogDefaultsForProduct(product, defaults);
    const description = getProductDescription(product);
    const attrType = getAttrType(product);
    const attrPattern = getAttrPattern(product);
    const attrFabric = getExplicitAttribute(product, [
      /\bcrafted from\s+([^,.]+)/i,
      /\bfabric:\s*([^,\n]+)/i,
      /\b(cotton(?: blend)?|denim|polyester|linen|viscose)\b/i,
    ]);
    const attrFit = getExplicitAttribute(product, [
      /\b(regular fit|slim fit|relaxed fit|tailored fit|straight fit)\b/i,
    ]);
    const attrOccasion = getExplicitAttribute(product, [
      /\b(casual|formal|semi-formal|smart casual|office wear|party wear)\b/i,
    ]);

    return product.sizes.map((sizeRow) => ({
      'Product Code': product.productCode,
      'Amazon ASIN': '',
      Name: product.productTitle,
      'Sku Id': `${product.productCode}-${sizeRow.size}`,
      'Selling Price': product.mrp,
      MRP: product.mrp,
      'Cost Price': product.mrp,
      Quantity: sizeRow.quantity,
      'Packaging Length (in cm)': '',
      'Packaging Breadth (in cm)': '',
      'Packaging Height (in cm)': '',
      'Packaging Weight (in kg)': '',
      Size: sizeRow.size,
      attr_Fabric: attrFabric,
      'GST %': getAutoGstPercent(product.mrp),
      '': '',
      'Image 1': product.imageUrls.image1,
      'Image 2': product.imageUrls.image2,
      'Image 3': product.imageUrls.image3,
      'Image 4': product.imageUrls.image4,
      'Image 5': '',
      'Image 6': '',
      'Image 7': '',
      'Image 8': '',
      'Image 9': '',
      'Image 10': '',
      'Video 1': '',
      'Video 2': '',
      'Product Type': product.category === 'Unknown' ? '' : product.category,
      Colour: product.colour,
      Description: description,
      'Return/Exchange Condition': getReturnExchangeCondition(defaults),
      Visibility: getVisibility(),
      'Size Chart': productDefaults.sizeChartUrl,
      'Pickup Address Code': getPickupAddressCode(defaults),
      'HSN Code': productDefaults.hsnCode,
      'Customisation Id': '',
      'Associated Pixel': '',
      'Size Type': 'size',
      attr_Type: attrType,
      'attr_Ideal For': product.genderTarget,
      attr_Occasion: attrOccasion,
      attr_Fit: attrFit,
      'attr_Product Type': product.category === 'Unknown' ? '' : product.category,
      attr_Color: product.colour,
      'attr_Fit/ Shape': attrFit,
      attr_Pattern: attrPattern,
      'attr_Pack Of': '1',
    } satisfies Record<(typeof finalCatalogHeaders)[number], string>));
  });

  return [
    finalCatalogHeaders.join(','),
    ...rows.map((row) => finalCatalogHeaders.map((header) => escapeCsvValue(row[header])).join(',')),
  ].join('\r\n');
};

const revokeProductImageUrls = (products: ParsedProduct[]) => {
  for (const product of products) {
    for (const preview of Object.values(product.imagePreviews)) {
      if (preview?.url) {
        URL.revokeObjectURL(preview.url);
      }
    }
  }
};

const getUploadErrorMessage = (error: unknown) => {
  const message = error instanceof Error ? error.message : 'Image upload failed.';
  const normalized = message.toLowerCase();

  if (
    normalized.includes('auth')
    || normalized.includes('permission')
    || normalized.includes('policy')
    || normalized.includes('row-level security')
    || normalized.includes('unauthorized')
    || normalized.includes('session')
  ) {
    return 'Image upload failed. Please check Supabase Storage permissions or login session.';
  }

  return message;
};

type BulkCatalogImportProps = {
  onOpenCatalogDefaults?: () => void;
};

export function BulkCatalogImport({ onOpenCatalogDefaults }: BulkCatalogImportProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [products, setProducts] = useState<ParsedProduct[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [parsedCount, setParsedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [uploadProgress, setUploadProgress] = useState<{
    currentProduct: number;
    totalProducts: number;
    productTitle: string;
    imageLabel: string;
  } | null>(null);
  const [catalogDefaults, setCatalogDefaults] = useState<CatalogDefaults>(() => mergeCatalogDefaults(null));
  const productsRef = useRef<ParsedProduct[]>([]);
  const { toast } = useToast();

  const summary = useMemo(() => ({
    total: products.length,
    ready: products.filter((product) => product.status === 'Ready').length,
    review: products.filter((product) => product.status === 'Needs Review').length,
    blocked: products.filter((product) => product.status === 'Blocked').length,
    shirts: products.filter((product) => product.category === 'Shirt').length,
    trousers: products.filter((product) => product.category === 'Trousers').length,
    jeans: products.filter((product) => product.category === 'Jeans').length,
    shoes: products.filter((product) => product.category === 'Shoes').length,
    perfume: products.filter((product) => product.category === 'Perfume').length,
  }), [products]);

  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  useEffect(() => {
    const refreshDefaults = () => setCatalogDefaults(readCatalogDefaults());
    refreshDefaults();
    window.addEventListener('storage', refreshDefaults);
    window.addEventListener('mitty-catalog-defaults-updated', refreshDefaults);
    return () => {
      window.removeEventListener('storage', refreshDefaults);
      window.removeEventListener('mitty-catalog-defaults-updated', refreshDefaults);
    };
  }, []);

  useEffect(() => () => {
    revokeProductImageUrls(productsRef.current);
  }, []);

  const progressValue = totalCount > 0 ? Math.round((parsedCount / totalCount) * 100) : 0;
  const uploadProgressValue = uploadProgress && uploadProgress.totalProducts > 0
    ? Math.round((uploadProgress.currentProduct / uploadProgress.totalProducts) * 100)
    : 0;
  const finalExportValidation = useMemo(
    () => getFinalExportValidation(products, catalogDefaults),
    [catalogDefaults, products]
  );
  const finalCsvDisabled = products.length === 0 || Boolean(finalExportValidation.imageUploadIssue);

  const clearImport = () => {
    revokeProductImageUrls(products);
    setFiles([]);
    setProducts([]);
    setImportErrors([]);
    setParsedCount(0);
    setTotalCount(0);
    setUploadProgress(null);
  };

  const parseFiles = async () => {
    if (files.length === 0) {
      toast({ variant: 'destructive', title: 'No ZIPs selected', description: 'Choose one or more MITTY ZIP files first.' });
      return;
    }

    setIsParsing(true);
    revokeProductImageUrls(products);
    setProducts([]);
    setImportErrors([]);
    setParsedCount(0);
    setTotalCount(files.length);

    const nextProducts: ParsedProduct[] = [];
    const nextErrors: string[] = [];
    const categoryCounters: Record<ProductCategory, number> = {
      Shirt: 0,
      Trousers: 0,
      Jeans: 0,
      Shoes: 0,
      Perfume: 0,
      Unknown: 0,
    };
    let discoveredCount = 0;

    try {
      for (const file of files) {
        try {
          const productZips = await expandZipFile(file);
          discoveredCount += productZips.length;
          setTotalCount(Math.max(files.length, discoveredCount));

          for (const productZip of productZips) {
            nextProducts.push(await createParsedProduct({ ...productZip, categoryCounters }));
            setParsedCount(nextProducts.length);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Invalid ZIP file.';
          nextErrors.push(`${file.name}: ${message}`);
        }
      }

      const titleCounts = nextProducts.reduce<Record<string, number>>((acc, product) => {
        const key = product.productTitle.trim().toLowerCase();
        if (key) acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});

      const productsWithDuplicateWarnings = nextProducts.map((product) => {
        const key = product.productTitle.trim().toLowerCase();
        if (!key || titleCounts[key] <= 1) {
          return product;
        }

        const warnings = product.warnings.includes('Duplicate product title')
          ? product.warnings
          : [...product.warnings, 'Duplicate product title'];

        return {
          ...product,
          warnings,
          status: deriveStatus(product.errors, product.reviewIssues),
        };
      });

      setProducts(productsWithDuplicateWarnings);
      setImportErrors(nextErrors);

      toast({
        title: 'ZIP parsing complete',
        description: `${productsWithDuplicateWarnings.length} product ZIP(s) parsed.`,
      });
    } finally {
      setIsParsing(false);
      setTotalCount(Math.max(discoveredCount, files.length, nextProducts.length));
    }
  };

  const downloadReport = () => {
    if (products.length === 0) {
      toast({ variant: 'destructive', title: 'No report available', description: 'Parse ZIPs before downloading a report.' });
      return;
    }

    downloadBlob(new Blob([createReportCsv(products)], { type: 'text/csv;charset=utf-8;' }), 'mitty-bulk-import-parse-report.csv');
  };

  const downloadFinalCatalog = () => {
    if (!finalExportValidation.ready) {
      toast({
        variant: 'destructive',
        title: 'Final catalog not ready',
        description: finalExportValidation.errors.slice(0, 3).join(' '),
      });
      return;
    }

    downloadBlob(
      new Blob([createFinalCatalogCsv(products, catalogDefaults)], { type: 'text/csv;charset=utf-8;' }),
      'mitty-final-catalog.csv'
    );
  };

  const assertUploadSession = async () => {
    if (!hasSupabaseBrowserConfig()) {
      throw new Error('Image upload failed. Please check Supabase Storage permissions or login session.');
    }

    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.auth.getSession();

    if (error || !data.session) {
      throw new Error('Image upload failed. Please check Supabase Storage permissions or login session.');
    }
  };

  const updateProductUploadState = (productId: string, patch: Partial<ParsedProduct>) => {
    setProducts((prev) => prev.map((product) => (
      product.id === productId ? { ...product, ...patch } : product
    )));
  };

  const uploadProductImages = async (product: ParsedProduct, productIndex: number, totalProducts: number) => {
    const slotMapping = getImageSlotMapping(product.category);
    const image1Role = slotMapping.image1;
    const image1Asset = image1Role ? product.imageAssets[image1Role] : null;

    if (product.status === 'Blocked' || !image1Role || !image1Asset) {
      const reason = !image1Asset ? 'Image 1 is missing; upload skipped.' : 'Product is blocked; upload skipped.';
      updateProductUploadState(product.id, {
        uploadStatus: 'Failed',
        uploadErrors: [reason],
      });
      return;
    }

    const requiredImageRole = image1Role;
    updateProductUploadState(product.id, {
      uploadStatus: 'Uploading',
      uploadErrors: [],
      uploadWarnings: [],
    });

    const folder = `bulk-catalog/${sanitizeStorageSegment(product.productCode)}`;
    const uploadedRoleUrls: Partial<Record<ImageRole, string>> = {};
    const uploadErrors: string[] = [];
    const uploadWarnings: string[] = [];

    const uploadRole = async (role: ImageRole, required: boolean) => {
      const asset = product.imageAssets[role];

      if (!asset) {
        if (!required) uploadWarnings.push(`${role} image not present; URL left blank.`);
        return;
      }

      setUploadProgress({
        currentProduct: productIndex,
        totalProducts,
        productTitle: product.productTitle,
        imageLabel: role === 'flatLay' ? 'flatlay' : role,
      });

      try {
        const path = `${folder}/${imageRoleStorageNames[role]}`;
        const publicUrl = await uploadFileToPublicStorage({
          bucket: PRODUCT_IMAGES_BUCKET,
          path,
          file: asset.file,
        });

        if (!isPublicStorageUrl(publicUrl, PRODUCT_IMAGES_BUCKET)) {
          throw new Error(`${asset.name}: upload returned an invalid public URL.`);
        }

        uploadedRoleUrls[role] = publicUrl;
      } catch (error) {
        const message = `${asset.name}: ${getUploadErrorMessage(error)}`;
        if (required) {
          uploadErrors.push(message);
        } else {
          uploadWarnings.push(message);
        }
      }
    };

    await uploadRole(requiredImageRole, true);

    if (!uploadedRoleUrls[requiredImageRole]) {
      updateProductUploadState(product.id, {
        uploadStatus: 'Failed',
        imageUrls: createEmptyImageUrls(),
        uploadErrors,
        uploadWarnings,
      });
      return;
    }

    const optionalRoles = Array.from(new Set(
      imageSlots
        .slice(1)
        .map((slot) => slotMapping[slot])
        .filter((role): role is ImageRole => Boolean(role))
    ));

    for (const role of optionalRoles) {
      await uploadRole(role, false);
    }

    const imageUrls = createEmptyImageUrls();
    for (const slot of imageSlots) {
      const role = slotMapping[slot];
      imageUrls[slot] = role ? uploadedRoleUrls[role] || '' : '';
    }

    updateProductUploadState(product.id, {
      uploadStatus: 'Uploaded',
      imageUrls,
      uploadErrors,
      uploadWarnings,
    });
  };

  const uploadImages = async (onlyFailed = false) => {
    const uploadTargets = products.filter((product) => (
      onlyFailed ? product.uploadStatus === 'Failed' : product.uploadStatus !== 'Uploaded'
    ));

    if (uploadTargets.length === 0) {
      toast({ title: 'Nothing to upload', description: 'No parsed products need image upload.' });
      return;
    }

    try {
      await assertUploadSession();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Upload blocked',
        description: getUploadErrorMessage(error),
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress({ currentProduct: 0, totalProducts: uploadTargets.length, productTitle: '', imageLabel: '' });

    try {
      for (let index = 0; index < uploadTargets.length; index += 1) {
        await uploadProductImages(uploadTargets[index], index + 1, uploadTargets.length);
      }

      toast({ title: 'Image upload finished', description: `${uploadTargets.length} product(s) processed.` });
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  return (
    <section className="grid gap-5">
      <div className="rounded-lg border border-black/10 bg-white/85 p-5 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-[#171717] text-[#f4d99f] hover:bg-[#171717]">Phase 3</Badge>
              <Badge variant="outline">Browser ZIP parser</Badge>
              <Badge variant="outline">Supabase image upload</Badge>
            </div>
            <h2 className="mt-3 text-2xl font-semibold text-[#171717]">Bulk Catalog Import</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
              Parse MITTY product ZIPs locally, preview product fields, upload public image URLs, and download the final catalog CSV.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 lg:w-auto lg:max-w-[52rem]">
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void parseFiles()} disabled={isParsing || isUploading || files.length === 0} className="h-10 min-w-32 bg-[#171717] text-white hover:bg-[#2a2a2a]">
                {isParsing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileArchive className="mr-2 h-4 w-4" />}
                Parse ZIPs
              </Button>
              <Button variant="outline" onClick={() => void uploadImages()} disabled={isUploading || products.length === 0} className="h-10 min-w-36">
                {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Upload Images
              </Button>
              <Button
                variant="outline"
                onClick={downloadFinalCatalog}
                disabled={finalCsvDisabled}
                className="h-10 min-w-28"
              >
                <Download className="mr-2 h-4 w-4" />
                Final CSV
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={downloadReport} disabled={products.length === 0} className="h-10 min-w-24">
                <Download className="mr-2 h-4 w-4" />
                Report
              </Button>
              <Button variant="outline" onClick={() => void uploadImages(true)} disabled={isUploading || !products.some((product) => product.uploadStatus === 'Failed')} className="h-10 min-w-32">
                <RotateCcw className="mr-2 h-4 w-4" />
                Retry Failed
              </Button>
              <Button variant="outline" onClick={clearImport} disabled={isParsing || isUploading} className="h-10 min-w-32">
                <RotateCcw className="mr-2 h-4 w-4" />
                Clear Import
              </Button>
            </div>
            {finalExportValidation.imageUploadIssue && (
              <p className="text-xs font-medium text-amber-700">Upload images first to unlock final CSV.</p>
            )}
          </div>
        </div>

        <div className="mt-5 grid gap-4 rounded-lg border border-black/10 p-4">
          <div className="grid gap-2">
            <Label htmlFor="bulk-zip-upload">Upload ZIPs or one master ZIP</Label>
            <Input
              id="bulk-zip-upload"
              type="file"
              accept=".zip,application/zip,application/x-zip-compressed"
              multiple
              disabled={isParsing}
              onChange={(event) => {
                setFiles(Array.from(event.target.files || []).filter((file) => isZipName(file.name)));
              }}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>{files.length} selected file(s)</span>
            <span>ZIP files stay local.</span>
            <span>Extracted images upload only when you choose.</span>
            <span>ZIPs are never sent to the server.</span>
            <span>Final catalog export only downloads when you click it.</span>
          </div>
          {(isParsing || parsedCount > 0) && (
            <div className="grid gap-2">
              <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                <span>Parsed {parsedCount} of {totalCount}</span>
                <span>{progressValue}%</span>
              </div>
              <Progress value={progressValue} className="h-2" />
            </div>
          )}
          {(isUploading || uploadProgress) && (
            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-3 text-xs font-medium text-muted-foreground">
                <span>
                  Uploading product {uploadProgress?.currentProduct || 0} of {uploadProgress?.totalProducts || 0}
                  {uploadProgress?.productTitle ? `: ${uploadProgress.productTitle}` : ''}
                </span>
                <span>{uploadProgress?.imageLabel ? `Image: ${uploadProgress.imageLabel}` : `${uploadProgressValue}%`}</span>
              </div>
              <Progress value={uploadProgressValue} className="h-2" />
            </div>
          )}
          {products.length > 0 && (
            <div className={cn(
              'grid gap-2 rounded-lg border p-3 text-sm',
              finalExportValidation.ready
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                : 'border-amber-200 bg-amber-50 text-amber-950'
            )}>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={finalExportValidation.ready ? 'bg-emerald-700 text-white hover:bg-emerald-700' : 'bg-amber-600 text-white hover:bg-amber-600'}>
                  {finalExportValidation.ready ? 'Final CSV ready' : 'Final CSV blocked'}
                </Badge>
                <Badge variant="outline">{finalExportValidation.rowCount} catalog rows</Badge>
                {finalExportValidation.imageUploadIssue && (
                  <Badge variant="outline">{finalExportValidation.imageUploadIssue.productsNeedingUpload} products need upload</Badge>
                )}
                <Badge variant="outline">{finalExportValidation.blockedProducts} product data blocker(s)</Badge>
              </div>
              {!finalExportValidation.ready && (
                <div className="grid gap-3 text-xs leading-5">
                  {finalExportValidation.imageUploadIssue && (
                    <div className="rounded-md border border-amber-300 bg-amber-100/70 p-3">
                      <p className="font-semibold">{finalExportValidation.imageUploadIssue.message}</p>
                      <p>Products needing upload: {finalExportValidation.imageUploadIssue.productsNeedingUpload}</p>
                      <p>Required Image 1 URLs missing: {finalExportValidation.imageUploadIssue.missingImage1Count}</p>
                    </div>
                  )}
                  {finalExportValidation.defaultIssues.length > 0 && (
                    <div>
                      <p className="font-semibold">Missing Catalog Defaults:</p>
                      <ul className="list-inside list-disc">
                        {finalExportValidation.defaultIssues.map((issue) => (
                          <li key={issue}>{issue}</li>
                        ))}
                      </ul>
                      {finalExportValidation.affectedCounts.map((count) => (
                        <p key={count}>{count}</p>
                      ))}
                      {onOpenCatalogDefaults && (
                        <Button type="button" variant="outline" size="sm" onClick={onOpenCatalogDefaults} className="mt-2 h-8">
                          Open Catalog Defaults
                        </Button>
                      )}
                    </div>
                  )}
                  {finalExportValidation.productIssues.length > 0 && (
                    <div>
                      <p className="font-semibold">Product-level blockers:</p>
                      {finalExportValidation.productIssues.slice(0, 8).map((error) => (
                        <p key={error}>{error}</p>
                      ))}
                      {finalExportValidation.productIssues.length > 8 && (
                        <p>{finalExportValidation.productIssues.length - 8} more product issue(s). Fix upload/defaults before final export.</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {(products.length > 0 || importErrors.length > 0) && (
        <div className="grid gap-4 rounded-lg border border-black/10 bg-white/85 p-5 shadow-sm backdrop-blur">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{summary.total} products</Badge>
            <Badge className="bg-emerald-700 text-white hover:bg-emerald-700">{summary.ready} ready</Badge>
            <Badge className="bg-amber-600 text-white hover:bg-amber-600">{summary.review} review</Badge>
            <Badge className="bg-red-700 text-white hover:bg-red-700">{summary.blocked} blocked</Badge>
            <Badge variant="outline">{products.filter((product) => product.uploadStatus === 'Uploaded').length} uploaded</Badge>
            <Badge variant="outline">{products.filter((product) => product.uploadStatus === 'Failed').length} upload failed</Badge>
            <Badge variant="outline">{summary.shirts} shirts</Badge>
            <Badge variant="outline">{summary.trousers} trousers</Badge>
            <Badge variant="outline">{summary.jeans} jeans</Badge>
            <Badge variant="outline">{summary.shoes} shoes</Badge>
            <Badge variant="outline">{summary.perfume} perfume</Badge>
          </div>

          {importErrors.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-800">
              {importErrors.map((error) => (
                <p key={error}>{error}</p>
              ))}
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-32">Status</TableHead>
                <TableHead className="min-w-72">Product Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="min-w-36">Product Code</TableHead>
                <TableHead className="min-w-32">Upload Status</TableHead>
                <TableHead>MRP</TableHead>
                <TableHead className="min-w-32">Colour</TableHead>
                <TableHead className="min-w-32">Gender/Target</TableHead>
                <TableHead>Sizes Count</TableHead>
                <TableHead>Front Image</TableHead>
                <TableHead>Side Image</TableHead>
                <TableHead>Back Image</TableHead>
                <TableHead>Flat Lay Image</TableHead>
                <TableHead>Image 1 URL</TableHead>
                <TableHead>Image 2 URL</TableHead>
                <TableHead>Image 3 URL</TableHead>
                <TableHead>Image 4 URL</TableHead>
                <TableHead className="min-w-80">Missing Fields / Warnings</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <StatusBadge status={product.status} />
                  </TableCell>
                  <TableCell>
                    <div className="grid gap-1">
                      <span className="font-medium text-[#171717]">{product.productTitle}</span>
                      <span className="text-xs text-muted-foreground">{product.sourceName}</span>
                    </div>
                  </TableCell>
                  <TableCell>{product.category === 'Unknown' ? 'Needs Review' : product.category}</TableCell>
                  <TableCell className="font-mono text-xs">{product.productCode}</TableCell>
                  <TableCell>
                    <UploadStatusBadge status={product.uploadStatus} />
                    {product.uploadStatus === 'Failed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isUploading}
                        onClick={() => void uploadImages(true)}
                        className="mt-2 h-8"
                      >
                        Retry
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>{product.mrp || 'Needs Review'}</TableCell>
                  <TableCell>{product.colour || 'Needs Review'}</TableCell>
                  <TableCell>{product.genderTarget || 'Needs Review'}</TableCell>
                  <TableCell>
                    <div className="grid gap-1">
                      <span>{product.sizes.length}</span>
                      {product.sizes.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {product.sizes.slice(0, 3).map((row) => row.sku).join(', ')}
                          {product.sizes.length > 3 ? '...' : ''}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <ImageCell preview={product.imagePreviews.front} required />
                  <ImageCell preview={product.imagePreviews.side} />
                  <ImageCell preview={product.imagePreviews.back} />
                  <ImageCell preview={product.imagePreviews.flatLay} />
                  <UrlCell url={product.imageUrls.image1} required />
                  <UrlCell url={product.imageUrls.image2} />
                  <UrlCell url={product.imageUrls.image3} />
                  <UrlCell url={product.imageUrls.image4} />
                  <TableCell>
                    {[...product.errors, ...product.reviewIssues, ...product.uploadErrors, ...product.uploadWarnings, ...product.warnings, ...product.info].length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {product.errors.map((error) => (
                          <Badge key={error} variant="destructive">{error}</Badge>
                        ))}
                        {product.uploadErrors.map((error) => (
                          <Badge key={error} variant="destructive">{error}</Badge>
                        ))}
                        {product.reviewIssues.map((issue) => (
                          <Badge key={issue} className="bg-amber-600 text-white hover:bg-amber-600">{issue}</Badge>
                        ))}
                        {product.uploadWarnings.map((warning) => (
                          <Badge key={warning} className="bg-blue-100 text-blue-900 hover:bg-blue-100">{warning}</Badge>
                        ))}
                        {product.warnings.map((warning) => (
                          <Badge key={warning} className="bg-amber-100 text-amber-900 hover:bg-amber-100">{warning}</Badge>
                        ))}
                        {product.info.map((info) => (
                          <Badge key={info} variant="outline">{info}</Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">No issues</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}

function StatusBadge({ status }: { status: ParsedProduct['status'] }) {
  const className = cn(
    'inline-flex items-center gap-1',
    status === 'Ready' && 'bg-emerald-700 text-white hover:bg-emerald-700',
    status === 'Needs Review' && 'bg-amber-600 text-white hover:bg-amber-600',
    status === 'Blocked' && 'bg-red-700 text-white hover:bg-red-700'
  );

  return (
    <Badge className={className}>
      {status === 'Ready' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
      {status}
    </Badge>
  );
}

function UploadStatusBadge({ status }: { status: UploadStatus }) {
  const className = cn(
    'inline-flex items-center gap-1',
    status === 'Uploaded' && 'bg-emerald-700 text-white hover:bg-emerald-700',
    status === 'Uploading' && 'bg-blue-700 text-white hover:bg-blue-700',
    status === 'Failed' && 'bg-red-700 text-white hover:bg-red-700'
  );

  return (
    <Badge variant={status === 'Not uploaded' ? 'outline' : 'default'} className={className}>
      {status === 'Uploading' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {status}
    </Badge>
  );
}

function UrlCell({ url, required }: { url: string; required?: boolean }) {
  const copyUrl = async () => {
    await navigator.clipboard.writeText(url);
  };

  if (!url) {
    return (
      <TableCell>
        <Badge variant={required ? 'destructive' : 'outline'}>{required ? 'Required' : 'Blank'}</Badge>
      </TableCell>
    );
  }

  return (
    <TableCell>
      <div className="flex items-center gap-1">
        <Badge className="bg-emerald-700 text-white hover:bg-emerald-700">URL ready</Badge>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => void copyUrl()} title="Copy URL">
          <Copy className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(url, '_blank', 'noopener,noreferrer')} title="Open URL">
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>
    </TableCell>
  );
}

function ImageCell({ preview, required }: { preview: ImagePreview | null; required?: boolean }) {
  return (
    <TableCell>
      {preview ? (
        <div className="grid w-24 gap-1" title={preview.name}>
          {/* Object URLs from ZIP blobs cannot be optimized by next/image. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview.url}
            alt=""
            className="h-16 w-16 rounded border border-black/10 bg-white object-cover"
          />
          <span className="line-clamp-2 text-[11px] leading-4 text-muted-foreground">{preview.name.split('/').pop()}</span>
        </div>
      ) : (
        <Badge variant={required ? 'destructive' : 'outline'}>{required ? 'Missing' : 'Optional'}</Badge>
      )}
    </TableCell>
  );
}
