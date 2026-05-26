'use client';

import { Download, Eye, Loader2, Plus, Trash2, Upload } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { GenerationResults } from '@/lib/types';
import {
  CATALOG_DEFAULTS_STORAGE_KEY,
  CATALOG_STORAGE_KEY,
  type CatalogDefaults,
  type CatalogFormValues,
  type CatalogImageUrls,
  type CatalogSizeRow,
  createCatalogDefaults,
  downloadCsv,
  exportMittyCatalogCsv,
  getCategoryHsnCode,
  getCategorySizeChartUrl,
  mergeCatalogDefaults,
  type SavedCatalogItem,
} from '@/lib/catalog';
import {
  PRODUCT_IMAGES_BUCKET,
  SIZE_CHARTS_BUCKET,
  sanitizeStorageSegment,
  uploadDataUriToPublicStorage,
  uploadFileToPublicStorage,
} from '@/lib/supabase/storage';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

type CatalogBuilderProps = {
  results: GenerationResults;
};

const requiredFieldNames: Array<keyof CatalogFormValues> = [
  'productCode',
  'skuBase',
  'sellingPrice',
  'mrp',
  'costPrice',
  'gstPercent',
  'productType',
  'sizeType',
  'colour',
  'returnExchangeCondition',
  'visibility',
  'pickupAddressCode',
  'hsnCode',
];

const imageSourcesFromResults = (results: GenerationResults) => ({
  front: results.frontView,
  side: results.sideView || results.textureView,
  back: results.backView,
  flatlay: results.hdFlatlayImage || results.heroView,
});

const extensionFromFile = (file: File) => {
  const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '');
  return extension || 'png';
};

const readCatalogDefaults = (): CatalogDefaults => {
  try {
    const stored = window.localStorage.getItem(CATALOG_DEFAULTS_STORAGE_KEY);
    return stored ? mergeCatalogDefaults(JSON.parse(stored) as Partial<CatalogDefaults>) : mergeCatalogDefaults(null);
  } catch {
    return mergeCatalogDefaults(null);
  }
};

export function CatalogBuilder({ results }: CatalogBuilderProps) {
  const [items, setItems] = useState<SavedCatalogItem[]>([]);
  const [formValues, setFormValues] = useState<CatalogFormValues>(() => createCatalogDefaults(results));
  const [catalogDefaults, setCatalogDefaults] = useState<CatalogDefaults>(() => mergeCatalogDefaults(null));
  const [samePrice, setSamePrice] = useState(false);
  const [open, setOpen] = useState(false);
  const [showCatalog, setShowCatalog] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sizeChartFile, setSizeChartFile] = useState<File | null>(null);
  const { toast } = useToast();

  const imageSources = useMemo(() => imageSourcesFromResults(results), [results]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(CATALOG_STORAGE_KEY);
      if (stored) {
        setItems(JSON.parse(stored) as SavedCatalogItem[]);
      }
    } catch {
      setItems([]);
    }

    setCatalogDefaults(readCatalogDefaults());
  }, []);

  useEffect(() => {
    window.localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event('mitty-catalog-updated'));
  }, [items]);

  useEffect(() => {
    setFormValues(createCatalogDefaults(results, catalogDefaults));
    setSizeChartFile(null);
    setSamePrice(false);
  }, [results, catalogDefaults]);

  useEffect(() => {
    const refreshDefaults = () => setCatalogDefaults(readCatalogDefaults());
    window.addEventListener('storage', refreshDefaults);
    window.addEventListener('mitty-catalog-defaults-updated', refreshDefaults);
    return () => {
      window.removeEventListener('storage', refreshDefaults);
      window.removeEventListener('mitty-catalog-defaults-updated', refreshDefaults);
    };
  }, []);

  const updateField = (field: keyof CatalogFormValues, value: string) => {
    setFormValues((prev) => {
      if (samePrice && field === 'mrp') {
        return { ...prev, mrp: value, sellingPrice: value, costPrice: value };
      }

      return { ...prev, [field]: value };
    });
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      const latestDefaults = readCatalogDefaults();
      setCatalogDefaults(latestDefaults);
      setFormValues((prev) => ({
        ...createCatalogDefaults(results, latestDefaults),
        productCode: prev.productCode,
        amazonAsin: prev.amazonAsin,
        name: prev.name,
        skuBase: prev.skuBase,
        sellingPrice: prev.sellingPrice,
        mrp: prev.mrp,
        costPrice: prev.costPrice,
        packagingLength: prev.packagingLength,
        packagingBreadth: prev.packagingBreadth,
        packagingHeight: prev.packagingHeight,
        packagingWeight: prev.packagingWeight,
        colour: prev.colour,
        description: prev.description,
        customisationId: prev.customisationId,
        associatedPixel: prev.associatedPixel,
        video1: prev.video1,
        video2: prev.video2,
        sizeRows: prev.sizeRows,
      }));
    }

    setOpen(nextOpen);
  };

  const updateSamePrice = (checked: boolean) => {
    setSamePrice(checked);
    if (checked) {
      setFormValues((prev) => ({
        ...prev,
        sellingPrice: prev.mrp,
        costPrice: prev.mrp,
      }));
    }
  };

  const updateSizeRow = (id: string, patch: Partial<CatalogSizeRow>) => {
    setFormValues((prev) => ({
      ...prev,
      sizeRows: prev.sizeRows.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    }));
  };

  const addSizeRow = () => {
    setFormValues((prev) => ({
      ...prev,
      sizeRows: [...prev.sizeRows, { id: crypto.randomUUID(), size: '', quantity: '1' }],
    }));
  };

  const removeSizeRow = (id: string) => {
    setFormValues((prev) => ({
      ...prev,
      sizeRows: prev.sizeRows.length > 1 ? prev.sizeRows.filter((row) => row.id !== id) : prev.sizeRows,
    }));
  };

  const applyDefaultFallbacks = (values: CatalogFormValues, defaults: CatalogDefaults): CatalogFormValues => ({
    ...values,
    gstPercent: values.gstPercent.trim() || defaults.defaultGstPercent,
    pickupAddressCode: values.pickupAddressCode.trim() || defaults.defaultPickupAddressCode,
    returnExchangeCondition: values.returnExchangeCondition.trim() || defaults.defaultReturnExchangeCondition,
    hsnCode: values.hsnCode.trim() || getCategoryHsnCode(results.productCategory, defaults),
    sizeChartUrl: values.sizeChartUrl.trim() || getCategorySizeChartUrl(results.productCategory, defaults),
  });

  const validateRequiredFields = (values: CatalogFormValues) => {
    const missing = requiredFieldNames.filter((field) => !String(values[field] || '').trim());
    if (missing.length > 0) {
      toast({
        variant: 'destructive',
        title: 'Catalog fields missing',
        description: `Please fill: ${missing.join(', ')}`,
      });
      return false;
    }

    if (!values.name.trim() || !values.description.trim()) {
      toast({
        variant: 'destructive',
        title: 'Catalog fields missing',
        description: 'Name and Description are required for export.',
      });
      return false;
    }

    return true;
  };

  const uploadProductImages = async (folder: string): Promise<CatalogImageUrls> => {
    const missingImages = Object.entries(imageSources)
      .filter(([, value]) => !value)
      .map(([key]) => key);

    if (missingImages.length > 0) {
      throw new Error(`Missing generated images: ${missingImages.join(', ')}.`);
    }

    const [image1, image2, image3, image4] = await Promise.all([
      uploadDataUriToPublicStorage({
        bucket: PRODUCT_IMAGES_BUCKET,
        path: `${folder}/front.png`,
        dataUri: imageSources.front as string,
      }),
      uploadDataUriToPublicStorage({
        bucket: PRODUCT_IMAGES_BUCKET,
        path: `${folder}/side.png`,
        dataUri: imageSources.side as string,
      }),
      uploadDataUriToPublicStorage({
        bucket: PRODUCT_IMAGES_BUCKET,
        path: `${folder}/back.png`,
        dataUri: imageSources.back as string,
      }),
      uploadDataUriToPublicStorage({
        bucket: PRODUCT_IMAGES_BUCKET,
        path: `${folder}/flatlay.png`,
        dataUri: imageSources.flatlay as string,
      }),
    ]);

    return { image1, image2, image3, image4 };
  };

  const uploadSizeChartIfNeeded = async (folder: string) => {
    if (!sizeChartFile) {
      return formValues.sizeChartUrl.trim();
    }

    return uploadFileToPublicStorage({
      bucket: SIZE_CHARTS_BUCKET,
      path: `${folder}/size-chart.${extensionFromFile(sizeChartFile)}`,
      file: sizeChartFile,
    });
  };

  const saveProduct = async () => {
    const latestDefaults = readCatalogDefaults();
    const valuesForSave = applyDefaultFallbacks(formValues, latestDefaults);
    setFormValues(valuesForSave);

    if (!validateRequiredFields(valuesForSave)) return;

    setSaving(true);
    const folder = sanitizeStorageSegment(valuesForSave.productCode);

    try {
      const [imageUrls, sizeChartUrl] = await Promise.all([
        uploadProductImages(folder),
        sizeChartFile
          ? uploadSizeChartIfNeeded(folder)
          : Promise.resolve(valuesForSave.sizeChartUrl.trim()),
      ]);

      const item: SavedCatalogItem = {
        ...valuesForSave,
        sizeChartUrl,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        imageUrls,
      };

      setItems((prev) => [item, ...prev]);
      setOpen(false);
      toast({ title: 'Product saved', description: 'Public image URLs are ready for the Mitty CSV.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Image upload failed.';
      const shouldSaveIncomplete = window.confirm(
        `Upload failed: ${message}\n\nSave this product without complete public image URLs?`
      );

      if (shouldSaveIncomplete) {
        setItems((prev) => [
          {
            ...valuesForSave,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            imageUrls: { image1: '', image2: '', image3: '', image4: '' },
          },
          ...prev,
        ]);
        setOpen(false);
      } else {
        toast({
          variant: 'destructive',
          title: 'Upload failed',
          description: message,
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const downloadCatalog = () => {
    if (items.length === 0) {
      toast({ variant: 'destructive', title: 'Catalog empty', description: 'Save a product before exporting CSV.' });
      return;
    }

    downloadCsv(exportMittyCatalogCsv(items));
  };

  const clearCatalog = () => {
    setItems([]);
    window.localStorage.removeItem(CATALOG_STORAGE_KEY);
  };

  return (
    <section className="grid gap-4 rounded-lg border border-black/10 bg-white/80 p-4 shadow-sm backdrop-blur sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-[#171717] text-[#f4d99f] hover:bg-[#171717]">Catalog Builder</Badge>
            <Badge variant="outline">{items.length} saved</Badge>
          </div>
          <h2 className="mt-3 text-xl font-semibold text-[#171717]">Mitty Catalog CSV</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setOpen(true)} className="bg-[#171717] text-white hover:bg-[#2a2a2a]">
            <Plus className="mr-2 h-4 w-4" />
            Add to Catalog
          </Button>
          <Button variant="outline" onClick={() => setShowCatalog((prev) => !prev)}>
            <Eye className="mr-2 h-4 w-4" />
            View Catalog
          </Button>
          <Button variant="outline" onClick={downloadCatalog}>
            <Download className="mr-2 h-4 w-4" />
            Download Catalog CSV
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={items.length === 0}>
                <Trash2 className="mr-2 h-4 w-4" />
                Clear Catalog
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear saved catalog?</AlertDialogTitle>
                <AlertDialogDescription>
                  This removes all saved catalog products from this browser.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={clearCatalog}>Clear Catalog</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {showCatalog && items.length > 0 && (
        <div className="grid gap-3">
          {items.map((item) => (
            <Card key={item.id} className="border-black/10">
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#171717]">{item.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.productCode} / {item.skuBase} / {item.sizeRows.length} size row(s)
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setItems((prev) => prev.filter((saved) => saved.id !== item.id))}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add product to catalog</DialogTitle>
            <DialogDescription>
              Save public image URLs and export in the Mitty catalog template.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6">
            <p className="rounded-lg border border-[#d8c39b] bg-[#fff8ea] px-3 py-2 text-sm text-[#7a5726]">
              Defaults applied from Catalog Settings. You can edit before saving.
            </p>

            <div className="grid gap-3 rounded-lg border border-black/10 p-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="same-price"
                  checked={samePrice}
                  onCheckedChange={(checked) => updateSamePrice(checked === true)}
                />
                <Label htmlFor="same-price">Use same value for MRP, Selling Price and Cost Price</Label>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="MRP" value={formValues.mrp} onChange={(value) => updateField('mrp', value)} required />
                <Field
                  label="Selling Price"
                  value={formValues.sellingPrice}
                  onChange={(value) => updateField('sellingPrice', value)}
                  required
                  disabled={samePrice}
                />
                <Field
                  label="Cost Price"
                  value={formValues.costPrice}
                  onChange={(value) => updateField('costPrice', value)}
                  required
                  disabled={samePrice}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Product Code" value={formValues.productCode} onChange={(value) => updateField('productCode', value)} required />
              <Field label="SKU Base / Sku Id" value={formValues.skuBase} onChange={(value) => updateField('skuBase', value)} required />
              <Field label="Amazon ASIN" value={formValues.amazonAsin} onChange={(value) => updateField('amazonAsin', value)} />
              <Field label="GST %" value={formValues.gstPercent} onChange={(value) => updateField('gstPercent', value)} required />
              <Field label="Product Type" value={formValues.productType} onChange={(value) => updateField('productType', value)} required />
              <Field label="Size Type" value={formValues.sizeType} onChange={(value) => updateField('sizeType', value)} required />
              <Field label="Colour" value={formValues.colour} onChange={(value) => updateField('colour', value)} required />
              <Field label="Return/Exchange Condition" value={formValues.returnExchangeCondition} onChange={(value) => updateField('returnExchangeCondition', value)} required />
              <Field label="Visibility" value={formValues.visibility} onChange={(value) => updateField('visibility', value)} required />
              <Field label="Pickup Address Code" value={formValues.pickupAddressCode} onChange={(value) => updateField('pickupAddressCode', value)} required />
              <Field label="HSN Code" value={formValues.hsnCode} onChange={(value) => updateField('hsnCode', value)} required />
              <Field label="Customisation Id" value={formValues.customisationId} onChange={(value) => updateField('customisationId', value)} />
              <Field label="Associated Pixel" value={formValues.associatedPixel} onChange={(value) => updateField('associatedPixel', value)} />
              <Field label="Video 1" value={formValues.video1} onChange={(value) => updateField('video1', value)} />
              <Field label="Video 2" value={formValues.video2} onChange={(value) => updateField('video2', value)} />
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <Field label="Packaging Length (in cm)" value={formValues.packagingLength} onChange={(value) => updateField('packagingLength', value)} />
              <Field label="Packaging Breadth (in cm)" value={formValues.packagingBreadth} onChange={(value) => updateField('packagingBreadth', value)} />
              <Field label="Packaging Height (in cm)" value={formValues.packagingHeight} onChange={(value) => updateField('packagingHeight', value)} />
              <Field label="Packaging Weight (in kg)" value={formValues.packagingWeight} onChange={(value) => updateField('packagingWeight', value)} />
            </div>

            <div className="grid gap-4">
              <Field label="Name" value={formValues.name} onChange={(value) => updateField('name', value)} required />
              <div className="grid gap-2">
                <Label>Description</Label>
                <Textarea value={formValues.description} onChange={(event) => updateField('description', event.target.value)} className="min-h-32" />
              </div>
            </div>

            <div className="grid gap-3 rounded-lg border border-black/10 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#171717]">Size-wise quantity</p>
                  <p className="mt-1 text-xs text-muted-foreground">Each size exports as its own CSV row.</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addSizeRow}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Size
                </Button>
              </div>
              {formValues.sizeRows.map((row) => (
                <div key={row.id} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                  <Input placeholder="Size" value={row.size} onChange={(event) => updateSizeRow(row.id, { size: event.target.value })} />
                  <Input placeholder="Quantity" value={row.quantity} onChange={(event) => updateSizeRow(row.id, { quantity: event.target.value })} />
                  <Button type="button" variant="outline" size="icon" onClick={() => removeSizeRow(row.id)} aria-label="Remove size row">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="grid gap-4 rounded-lg border border-black/10 p-4 md:grid-cols-2">
              <Field label="Size Chart URL" value={formValues.sizeChartUrl} onChange={(value) => updateField('sizeChartUrl', value)} />
              <div className="grid gap-2">
                <Label htmlFor="size-chart-upload">Upload Size Chart Image</Label>
                <Input
                  id="size-chart-upload"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => setSizeChartFile(event.target.files?.[0] ?? null)}
                />
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="button" onClick={() => void saveProduct()} disabled={saving} className="bg-[#171717] text-white hover:bg-[#2a2a2a]">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Save Product
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-2">
      <Label>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} />
    </div>
  );
}
