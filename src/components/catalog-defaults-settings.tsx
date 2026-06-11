'use client';

import { Copy, ExternalLink, Loader2, RotateCcw, Save, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  EMPTY_CATALOG_DEFAULTS,
  type CatalogDefaults,
} from '@/lib/catalog';
import {
  cacheAndNotifyCatalogDefaults,
  getSafeCatalogDefaultsErrorMessage,
  loadCatalogDefaults,
  readLocalCatalogDefaults,
  saveCatalogDefaultsToSupabase,
} from '@/lib/catalog-defaults-store';
import { useToast } from '@/hooks/use-toast';
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
  shirtSizeChartUrl: 'shirt-size-chart.png',
  trouserSizeChartUrl: 'trouser-size-chart.png',
} satisfies Partial<Record<keyof CatalogDefaults, string>>;

export function CatalogDefaultsSettings({ role }: CatalogDefaultsSettingsProps) {
  const [defaults, setDefaults] = useState<CatalogDefaults>(EMPTY_CATALOG_DEFAULTS);
  const [uploadingField, setUploadingField] = useState<keyof CatalogDefaults | null>(null);
  const [loadingDefaults, setLoadingDefaults] = useState(true);
  const [savingDefaults, setSavingDefaults] = useState(false);
  const [defaultsSource, setDefaultsSource] = useState<'supabase' | 'localStorage' | 'built-in'>('built-in');
  const [loadWarning, setLoadWarning] = useState('');
  const { toast } = useToast();
  const canEdit = role === 'owner';

  useEffect(() => {
    let isMounted = true;

    const loadDefaults = async () => {
      setLoadingDefaults(true);
      const result = await loadCatalogDefaults();

      if (!isMounted) {
        return;
      }

      setDefaults(result.defaults);
      setDefaultsSource(result.source);
      setLoadWarning(result.errorMessage || '');
      setLoadingDefaults(false);
    };

    void loadDefaults();

    return () => {
      isMounted = false;
    };
  }, []);

  const updateField = (field: keyof CatalogDefaults, value: string) => {
    setDefaults((prev) => ({ ...prev, [field]: value }));
  };

  const saveDefaults = async (nextDefaults = defaults) => {
    if (!canEdit) {
      return;
    }

    setSavingDefaults(true);

    try {
      const savedDefaults = await saveCatalogDefaultsToSupabase(nextDefaults);
      setDefaults(savedDefaults);
      setDefaultsSource('supabase');
      setLoadWarning('');
      toast({ title: 'Catalog defaults saved', description: 'Defaults are saved in Supabase and cached on this browser.' });
    } catch (error) {
      cacheAndNotifyCatalogDefaults(nextDefaults);
      toast({
        variant: 'destructive',
        title: 'Catalog defaults saved locally only',
        description: `Supabase save failed. ${getSafeCatalogDefaultsErrorMessage(error)}`,
      });
    } finally {
      setSavingDefaults(false);
    }
  };

  const syncLocalDefaults = async () => {
    if (!canEdit) {
      return;
    }

    const localDefaults = readLocalCatalogDefaults();
    setDefaults(localDefaults);
    await saveDefaults(localDefaults);
  };

  const clearDefaults = async () => {
    setDefaults(EMPTY_CATALOG_DEFAULTS);
    await saveDefaults(EMPTY_CATALOG_DEFAULTS);
    toast({ title: 'Catalog defaults cleared' });
  };

  const uploadSizeChart = async (field: keyof typeof sizeChartUploadPaths, file: File | undefined) => {
    if (!file || !canEdit) {
      return;
    }

    setUploadingField(field);

    try {
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
      const savedDefaults = await saveCatalogDefaultsToSupabase(nextDefaults);
      setDefaults(savedDefaults);
      setDefaultsSource('supabase');
      setLoadWarning('');
      toast({ title: 'Size chart uploaded', description: 'The public URL was saved in Supabase Catalog Defaults.' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Size chart upload failed',
        description: `Size chart upload failed. Please check login session, file type, file size, or Supabase Storage permissions. ${getSafeCatalogDefaultsErrorMessage(error)}`,
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
                <Badge variant="outline">{loadingDefaults ? 'Loading defaults' : `Source: ${defaultsSource}`}</Badge>
              </div>
              <h2 className="mt-3 text-2xl font-semibold text-[#171717]">Catalog Defaults</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Saved centrally in Supabase and cached on this browser for fallback.
              </p>
              {!canEdit && (
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Only owner can upload or edit catalog defaults. Staff can use saved defaults.
                </p>
              )}
              {loadWarning && (
                <p className="mt-2 max-w-2xl rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900">
                  Supabase defaults could not be loaded, so local cached defaults are being used. {loadWarning}
                </p>
              )}
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
            <Button type="button" onClick={() => void saveDefaults()} disabled={!canEdit || savingDefaults} className="bg-[#171717] text-white hover:bg-[#2a2a2a]">
              {savingDefaults ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Defaults
            </Button>
            <Button type="button" variant="outline" onClick={() => void syncLocalDefaults()} disabled={!canEdit || savingDefaults}>
              <Upload className="mr-2 h-4 w-4" />
              Sync Local Defaults to Supabase
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
