'use client';

import JSZip from 'jszip';
import { AlertCircle, CheckCircle2, Download, FileArchive, Loader2, RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
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
import { downloadBlob } from '@/lib/file-actions';
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
      imagePreviews[role] = {
        name,
        url: URL.createObjectURL(blob),
      };
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
    'MRP',
    'Colour',
    'Sizes Count',
    'Future SKUs',
    'Front Image',
    'Side Image',
    'Back Image',
    'Flat Lay Image',
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
    product.mrp,
    product.colour,
    String(product.sizes.length),
    product.sizes.map((row) => row.sku).join(' | '),
    product.images.front,
    product.images.side,
    product.images.back,
    product.images.flatLay,
    product.info.join(' | '),
    product.reviewIssues.join(' | '),
    product.warnings.join(' | '),
    product.errors.join(' | '),
  ]);

  return [headers, ...rows].map((row) => row.map(escapeCsvValue).join(',')).join('\r\n');
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

export function BulkCatalogImport() {
  const [files, setFiles] = useState<File[]>([]);
  const [products, setProducts] = useState<ParsedProduct[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedCount, setParsedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
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

  useEffect(() => () => {
    revokeProductImageUrls(products);
  }, [products]);

  const progressValue = totalCount > 0 ? Math.round((parsedCount / totalCount) * 100) : 0;

  const clearImport = () => {
    revokeProductImageUrls(products);
    setFiles([]);
    setProducts([]);
    setImportErrors([]);
    setParsedCount(0);
    setTotalCount(0);
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

  return (
    <section className="grid gap-5">
      <div className="rounded-lg border border-black/10 bg-white/85 p-5 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-[#171717] text-[#f4d99f] hover:bg-[#171717]">Phase 1</Badge>
              <Badge variant="outline">Browser ZIP parser</Badge>
            </div>
            <h2 className="mt-3 text-2xl font-semibold text-[#171717]">Bulk Catalog Import</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
              Parse MITTY product ZIPs locally, preview product fields, and catch catalog issues before image upload or export.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[32rem]">
            <Button onClick={() => void parseFiles()} disabled={isParsing || files.length === 0} className="h-10 bg-[#171717] text-white hover:bg-[#2a2a2a]">
              {isParsing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileArchive className="mr-2 h-4 w-4" />}
              Parse ZIPs
            </Button>
            <Button variant="outline" onClick={downloadReport} disabled={products.length === 0} className="h-10">
              <Download className="mr-2 h-4 w-4" />
              Parse Report
            </Button>
            <Button variant="outline" onClick={clearImport} disabled={isParsing && products.length === 0} className="h-10">
              <RotateCcw className="mr-2 h-4 w-4" />
              Clear Import
            </Button>
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
            <span>Images stay local in this phase.</span>
            <span>No Supabase upload or catalog export is performed.</span>
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
        </div>
      </div>

      {(products.length > 0 || importErrors.length > 0) && (
        <div className="grid gap-4 rounded-lg border border-black/10 bg-white/85 p-5 shadow-sm backdrop-blur">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{summary.total} products</Badge>
            <Badge className="bg-emerald-700 text-white hover:bg-emerald-700">{summary.ready} ready</Badge>
            <Badge className="bg-amber-600 text-white hover:bg-amber-600">{summary.review} review</Badge>
            <Badge className="bg-red-700 text-white hover:bg-red-700">{summary.blocked} blocked</Badge>
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
                <TableHead>MRP</TableHead>
                <TableHead className="min-w-32">Colour</TableHead>
                <TableHead className="min-w-32">Gender/Target</TableHead>
                <TableHead>Sizes Count</TableHead>
                <TableHead>Front Image</TableHead>
                <TableHead>Side Image</TableHead>
                <TableHead>Back Image</TableHead>
                <TableHead>Flat Lay Image</TableHead>
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
                  <TableCell>
                    {[...product.errors, ...product.reviewIssues, ...product.warnings, ...product.info].length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {product.errors.map((error) => (
                          <Badge key={error} variant="destructive">{error}</Badge>
                        ))}
                        {product.reviewIssues.map((issue) => (
                          <Badge key={issue} className="bg-amber-600 text-white hover:bg-amber-600">{issue}</Badge>
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
