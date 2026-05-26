import type { GenerationResults } from '@/lib/types';

export const MITTY_CATALOG_HEADERS = [
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
  'GST %',
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
  'Size Type',
  'Size',
  'Colour',
  'Description',
  'Return/Exchange Condition',
  'Visibility',
  'Size Chart',
  'Pickup Address Code',
  'HSN Code',
  'Customisation Id',
  'Associated Pixel',
] as const;

export type MittyCatalogHeader = (typeof MITTY_CATALOG_HEADERS)[number];

export type CatalogSizeRow = {
  id: string;
  size: string;
  quantity: string;
};

export type CatalogFormValues = {
  productCode: string;
  amazonAsin: string;
  name: string;
  skuBase: string;
  sellingPrice: string;
  mrp: string;
  costPrice: string;
  packagingLength: string;
  packagingBreadth: string;
  packagingHeight: string;
  packagingWeight: string;
  gstPercent: string;
  productType: string;
  sizeType: string;
  colour: string;
  description: string;
  returnExchangeCondition: string;
  visibility: string;
  sizeChartUrl: string;
  pickupAddressCode: string;
  hsnCode: string;
  customisationId: string;
  associatedPixel: string;
  video1: string;
  video2: string;
  sizeRows: CatalogSizeRow[];
};

export type CatalogImageUrls = {
  image1: string;
  image2: string;
  image3: string;
  image4: string;
};

export type SavedCatalogItem = CatalogFormValues & {
  id: string;
  createdAt: string;
  imageUrls: CatalogImageUrls;
};

export const CATALOG_STORAGE_KEY = 'mitty-catalog-builder-items';

export const getDefaultSizeType = (category: GenerationResults['productCategory']) => {
  if (category === 'Shoes') return 'Shoe Size';
  if (category === 'Perfume') return 'Volume';
  return 'Standard';
};

export const createCatalogDefaults = (results: GenerationResults): CatalogFormValues => ({
  productCode: '',
  amazonAsin: '',
  name: results.productTitle || results.seoTitle || '',
  skuBase: '',
  sellingPrice: '',
  mrp: '',
  costPrice: '',
  packagingLength: '',
  packagingBreadth: '',
  packagingHeight: '',
  packagingWeight: '',
  gstPercent: '5',
  productType: results.productCategory || '',
  sizeType: getDefaultSizeType(results.productCategory),
  colour: results.detectedColor || results.color || '',
  description: results.longDescription || results.productDescription || '',
  returnExchangeCondition: 'Standard return/exchange policy',
  visibility: 'Visible',
  sizeChartUrl: '',
  pickupAddressCode: '',
  hsnCode: '',
  customisationId: '',
  associatedPixel: '',
  video1: '',
  video2: '',
  sizeRows: [{ id: crypto.randomUUID(), size: '', quantity: '1' }],
});

const escapeCsvValue = (value: string) => {
  const normalized = value ?? '';
  if (/[",\r\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
};

const getRowsForItem = (item: SavedCatalogItem) => {
  const rows = item.sizeRows.filter((row) => row.size.trim() || row.quantity.trim());
  const exportRows = rows.length > 0 ? rows : [{ id: 'single', size: '', quantity: '1' }];

  return exportRows.map((sizeRow) => {
    const size = sizeRow.size.trim();
    const sku = size && item.skuBase.trim() ? `${item.skuBase.trim()}-${size}` : item.skuBase.trim();

    return {
      'Product Code': item.productCode,
      'Amazon ASIN': item.amazonAsin,
      Name: item.name,
      'Sku Id': sku,
      'Selling Price': item.sellingPrice,
      MRP: item.mrp,
      'Cost Price': item.costPrice,
      Quantity: sizeRow.quantity || '1',
      'Packaging Length (in cm)': item.packagingLength,
      'Packaging Breadth (in cm)': item.packagingBreadth,
      'Packaging Height (in cm)': item.packagingHeight,
      'Packaging Weight (in kg)': item.packagingWeight,
      'GST %': item.gstPercent,
      'Image 1': item.imageUrls.image1,
      'Image 2': item.imageUrls.image2,
      'Image 3': item.imageUrls.image3,
      'Image 4': item.imageUrls.image4,
      'Image 5': '',
      'Image 6': '',
      'Image 7': '',
      'Image 8': '',
      'Image 9': '',
      'Image 10': '',
      'Video 1': item.video1,
      'Video 2': item.video2,
      'Product Type': item.productType,
      'Size Type': item.sizeType,
      Size: size,
      Colour: item.colour,
      Description: item.description,
      'Return/Exchange Condition': item.returnExchangeCondition,
      Visibility: item.visibility,
      'Size Chart': item.sizeChartUrl,
      'Pickup Address Code': item.pickupAddressCode,
      'HSN Code': item.hsnCode,
      'Customisation Id': item.customisationId,
      'Associated Pixel': item.associatedPixel,
    } satisfies Record<MittyCatalogHeader, string>;
  });
};

export const exportMittyCatalogCsv = (items: SavedCatalogItem[]) => {
  const rows = items.flatMap(getRowsForItem);
  return [
    MITTY_CATALOG_HEADERS.join(','),
    ...rows.map((row) => MITTY_CATALOG_HEADERS.map((header) => escapeCsvValue(row[header])).join(',')),
  ].join('\r\n');
};

export const downloadCsv = (csv: string, fileName = 'mitty-catalog.csv') => {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};
