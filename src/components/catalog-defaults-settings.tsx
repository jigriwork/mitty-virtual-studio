'use client';

import { Copy, ExternalLink, Loader2, RotateCcw, Save, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  CATALOG_DEFAULTS_STORAGE_KEY,
  EMPTY_CATALOG_DEFAULTS,
  type CatalogDefaults,
  mergeCatalogDefaults,
} from '@/lib/catalog';
import { useToast } from '@/hooks/use-toast';
import { getSupabaseBrowserClient, hasSupabaseBrowserConfig } from '@/lib/supabase/client';
import { SIZE_CHARTS_BUCKET, isPublicStorageUrl, uploadFileToPublicStorage } from '@/lib/supabase/storage';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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

type CatalogDefaultsSettingsProps = {
  role: 'owner' | 'staff';
};

type TextField = {
  key: keyof CatalogDefaults;
  label: string;
};

const hsnFields: TextField[] = [
  { key: 'shirtHsnCode', label: 'Shirt HSN Code' },
  { key: 'trouserHsnCode', label: 'Trouser HSN Code' },
  { key: 'jeansHsnCode', label: 'Jeans HSN Code' },
  { key: 'shoesHsnCode', label: 'Shoes HSN Code' },
  { key: 'perfumeHsnCode', label: 'Perfume HSN Code' },
];

const sizeChartFields: TextField[] = [
  { key: 'jeansSizeChartUrl', label: 'Jeans Size Chart URL' },
  { key: 'shoesSizeChartUrl', label: 'Shoes Size Chart URL' },
  { key: 'perfumeSizeChartUrl', label: 'Perfume Size Chart URL' },
];

const sizeChartUploadPaths = {
  shirtSizeChartUrl: 'size-charts/shirt-size-chart.png',
  trouserSizeChartUrl: 'size-charts/trouser-size-chart.png',
} satisfies Partial<Record<keyof CatalogDefaults, string>>;

export function CatalogDefaultsSettings({ role }: CatalogDefaultsSettingsProps) {
  const [defaults, setDefaults] = useState<CatalogDefaults>(EMPTY_CATALOG_DEFAULTS);
  const [uploadingField, setUploadingField] = useState<keyof CatalogDefaults | null>(null);
  const { toast } = useToast();
  const canEdit = role === 'owner';

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(CATALOG_DEFAULTS_STORAGE_KEY);
      setDefaults(stored ? mergeCatalogDefaults(JSON.parse(stored) as Partial<CatalogDefaults>) : EMPTY_CATALOG_DEFAULTS);
    } catch {
      setDefaults(EMPTY_CATALOG_DEFAULTS);
    }
  }, []);

  const updateField = (field: keyof CatalogDefaults, value: string) => {
    setDefaults((prev) => ({ ...prev, [field]: value }));
  };

  const persistDefaults = (nextDefaults: CatalogDefaults) => {
    window.localStorage.setItem(CATALOG_DEFAULTS_STORAGE_KEY, JSON.stringify(nextDefaults));
    window.dispatchEvent(new Event('mitty-catalog-defaults-updated'));
  };

  const saveDefaults = () => {
    persistDefaults(defaults);
    toast({ title: 'Catalog defaults saved', description: 'New catalog entries will use these defaults.' });
  };

  const clearDefaults = () => {
    setDefaults(EMPTY_CATALOG_DEFAULTS);
    window.localStorage.removeItem(CATALOG_DEFAULTS_STORAGE_KEY);
    window.dispatchEvent(new Event('mitty-catalog-defaults-updated'));
    toast({ title: 'Catalog defaults cleared' });
  };

  const uploadSizeChart = async (field: keyof typeof sizeChartUploadPaths, file: File | undefined) => {
    if (!file || !canEdit) {
      return;
    }

    setUploadingField(field);

    try {
      if (!hasSupabaseBrowserConfig()) {
        throw new Error('missing-config');
      }

      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.getSession();

      if (error || !data.session) {
        throw new Error('missing-session');
      }

      const publicUrl = await uploadFileToPublicStorage({
        bucket: SIZE_CHARTS_BUCKET,
        path: sizeChartUploadPaths[field],
        file,
      });

      if (!isPublicStorageUrl(publicUrl, SIZE_CHARTS_BUCKET)) {
        throw new Error('invalid-public-url');
      }

      const nextDefaults = { ...defaults, [field]: publicUrl };
      setDefaults(nextDefaults);
      persistDefaults(nextDefaults);
      toast({ title: 'Size chart uploaded', description: 'The public URL was saved in Catalog Defaults.' });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Size chart upload failed',
        description: 'Size chart upload failed. Please check Supabase Storage permissions or login session.',
      });
    } finally {
      setUploadingField(null);
    }
  };

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-5">
      <Card className="border-black/10 bg-white/85 shadow-sm backdrop-blur">
        <CardContent className="grid gap-6 p-5 sm:p-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-[#171717] text-[#f4d99f] hover:bg-[#171717]">Settings</Badge>
                <Badge variant="outline">{canEdit ? 'Owner editable' : 'Read only'}</Badge>
              </div>
              <h2 className="mt-3 text-2xl font-semibold text-[#171717]">Catalog Defaults</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Saved on this browser and applied automatically when a product is added to the Mitty catalog.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Default GST %"
              value={defaults.defaultGstPercent}
              onChange={(value) => updateField('defaultGstPercent', value)}
              disabled={!canEdit}
            />
            <Field
              label="Default Pickup Address Code"
              value={defaults.defaultPickupAddressCode}
              onChange={(value) => updateField('defaultPickupAddressCode', value)}
              disabled={!canEdit}
            />
            <div className="grid gap-2 md:col-span-2">
              <Label>Default Return/Exchange Condition</Label>
              <Textarea
                value={defaults.defaultReturnExchangeCondition}
                onChange={(event) => updateField('defaultReturnExchangeCondition', event.target.value)}
                disabled={!canEdit}
                className="min-h-24"
              />
            </div>
          </div>

          <div className="grid gap-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-[#8a6635]">HSN codes</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {hsnFields.map((field) => (
                <Field
                  key={field.key}
                  label={field.label}
                  value={defaults[field.key]}
                  onChange={(value) => updateField(field.key, value)}
                  disabled={!canEdit}
                />
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-[#8a6635]">Size chart URLs</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <SizeChartUploadField
                label="Shirt Size Chart"
                value={defaults.shirtSizeChartUrl}
                disabled={!canEdit}
                isUploading={uploadingField === 'shirtSizeChartUrl'}
                onChange={(value) => updateField('shirtSizeChartUrl', value)}
                onUpload={(file) => void uploadSizeChart('shirtSizeChartUrl', file)}
              />
              <SizeChartUploadField
                label="Trouser Size Chart"
                value={defaults.trouserSizeChartUrl}
                disabled={!canEdit}
                isUploading={uploadingField === 'trouserSizeChartUrl'}
                onChange={(value) => updateField('trouserSizeChartUrl', value)}
                onUpload={(file) => void uploadSizeChart('trouserSizeChartUrl', file)}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {sizeChartFields.map((field) => (
                <Field
                  key={field.key}
                  label={field.label}
                  value={defaults[field.key]}
                  onChange={(value) => updateField(field.key, value)}
                  disabled={!canEdit}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="outline" disabled={!canEdit}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Clear Defaults
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear catalog defaults?</AlertDialogTitle>
                  <AlertDialogDescription>
                    New catalog products will no longer auto-fill these saved defaults.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={clearDefaults}>Clear Defaults</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button type="button" onClick={saveDefaults} disabled={!canEdit} className="bg-[#171717] text-white hover:bg-[#2a2a2a]">
              <Save className="mr-2 h-4 w-4" />
              Save Defaults
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SizeChartUploadField({
  label,
  value,
  onChange,
  onUpload,
  disabled,
  isUploading,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onUpload: (file: File | undefined) => void;
  disabled?: boolean;
  isUploading?: boolean;
}) {
  const copyUrl = async () => {
    if (value) {
      await navigator.clipboard.writeText(value);
    }
  };

  return (
    <div className="grid gap-3 rounded-lg border border-black/10 p-3">
      <Label>{label}</Label>
      <div className="grid gap-2">
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          placeholder="Upload an image to create the public URL"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" disabled={disabled || isUploading} asChild>
            <label className="cursor-pointer">
              {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Upload Image
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={(event) => {
                  onUpload(event.target.files?.[0]);
                  event.currentTarget.value = '';
                }}
              />
            </label>
          </Button>
          <Button type="button" variant="ghost" size="icon" disabled={!value} onClick={() => void copyUrl()} title="Copy URL">
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={!value}
            onClick={() => window.open(value, '_blank', 'noopener,noreferrer')}
            title="Open URL"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {value && (
        <a href={value} target="_blank" rel="noreferrer" className="block w-fit">
          {/* Supabase public image URLs are user-managed assets. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt={`${label} preview`} className="h-28 w-28 rounded border border-black/10 bg-white object-cover" />
        </a>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} />
    </div>
  );
}
