'use client';

import { Camera, ImagePlus, UploadCloud, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { ChangeEvent } from 'react';
import { useCallback, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import type { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ProductFormValues } from '@/lib/types';
import { optimizeImage, formatBytes, exceedsPerImageLimit, type OptimizedImage } from '@/lib/image-compression';

type FileFieldName =
  | 'productImage'
  | 'openShirtImage'
  | 'fabricCloseupImage'
  | 'collarButtonCloseupImage'
  | 'pocketLogoDetailImage'
  | 'backSideImage'
  | 'productImageFront'
  | 'productImageFabric'
  | 'productImageBack'
  | 'bottleImageFile'
  | 'boxFrontImageFile'
  | 'boxBackImageFile';

interface FileUploadProps {
  form: UseFormReturn<ProductFormValues>;
  name: FileFieldName;
  title?: string;
  helperText?: string;
  badge?: string;
  compact?: boolean;
  /** Marks this upload slot as the main / required image (higher size limit). */
  isMainImage?: boolean;
}

export function FileUpload({ form, name, title, helperText, badge, compact = false, isMainImage = false }: FileUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [sizeInfo, setSizeInfo] = useState<OptimizedImage | null>(null);
  const [compressing, setCompressing] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const { setValue, formState: { errors } } = form;

  const setFiles = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        setCompressing(true);
        try {
          const optimized = await optimizeImage(file);
          // Store the optimised file in the form
          setValue(name, [optimized.file], { shouldValidate: true });
          setPreview(optimized.dataUri);
          setSizeInfo(optimized);
        } catch {
          // Fallback – use original
          setValue(name, acceptedFiles, { shouldValidate: true });
          const reader = new FileReader();
          reader.onload = () => setPreview(reader.result as string);
          reader.readAsDataURL(file);
          setSizeInfo(null);
        } finally {
          setCompressing(false);
        }
      }
    },
    [name, setValue]
  );

  const onDrop = useCallback((acceptedFiles: File[]) => { void setFiles(acceptedFiles); }, [setFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxFiles: 1,
  });

  const handleCameraChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    void setFiles(files);
    event.target.value = '';
  };

  const removeFile = () => {
    setValue(name, null, { shouldValidate: true });
    setPreview(null);
    setSizeInfo(null);
  };
  
  const errorMessage = errors[name]?.message as string | undefined;
  const tooLarge = sizeInfo ? exceedsPerImageLimit(sizeInfo, isMainImage) : false;

  return (
    <div className="space-y-2">
      {(title || badge || helperText) && (
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {title && <p className="text-sm font-medium text-[#171717]">{title}</p>}
            {badge && (
              <span className="rounded-full border border-[#d8c39b] bg-[#fff8ea] px-2 py-0.5 text-xs font-medium text-[#8a6635]">
                {badge}
              </span>
            )}
          </div>
          {helperText && <p className="mt-1 text-xs leading-5 text-muted-foreground">{helperText}</p>}
        </div>
      )}
      <div
        {...getRootProps()}
        className={cn(
          'relative flex h-48 w-full cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed bg-white transition-colors sm:h-52',
          compact ? 'h-36 sm:h-40' : '',
          isDragActive ? 'border-[#b78d4a] bg-[#fff8ea]' : 'border-black/15 hover:border-[#b78d4a]',
          errorMessage ? 'border-destructive' : ''
        )}
      >
        <input {...getInputProps()} />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleCameraChange}
        />
        {compressing ? (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#b78d4a] border-t-transparent" />
            <p className="text-sm font-medium">Optimizing image…</p>
          </div>
        ) : preview ? (
          <>
            {/* Upload previews are local data URIs; native img keeps mobile/camera previews simple. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Product preview" className="h-full w-full rounded-lg object-contain p-2" />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 h-7 w-7 z-10"
              onClick={(e) => {
                e.stopPropagation();
                removeFile();
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <div className="flex w-full max-w-xs flex-col items-center gap-2 p-4 text-center text-muted-foreground">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#171717] text-[#f4d99f]">
              <UploadCloud className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold text-[#171717]">
              {isDragActive ? 'Drop the file here' : 'Drag & drop image or choose a source'}
            </p>
            <p className="text-xs">PNG, JPG, WEBP up to 5MB</p>
            <div className="mt-2 grid w-full gap-2 sm:grid-cols-2">
              <Button type="button" size="sm" className="h-9 bg-[#171717] text-white hover:bg-[#2a2a2a]">
                <ImagePlus className="mr-1 h-3.5 w-3.5" />
                Choose Image
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 bg-white"
                onClick={(event) => {
                  event.stopPropagation();
                  cameraInputRef.current?.click();
                }}
              >
                <Camera className="mr-1 h-3.5 w-3.5" />
                Take Photo
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Size info strip */}
      {sizeInfo && (
        <div className={cn(
          'flex items-center gap-2 rounded-md px-3 py-1.5 text-xs',
          tooLarge
            ? 'border border-amber-300 bg-amber-50 text-amber-800'
            : 'border border-emerald-200 bg-emerald-50 text-emerald-800'
        )}>
          {tooLarge ? (
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          )}
          <span>
            {sizeInfo.wasCompressed
              ? `${formatBytes(sizeInfo.originalSize)} → ${formatBytes(sizeInfo.optimizedSize)}`
              : formatBytes(sizeInfo.optimizedSize)
            }
          </span>
          {sizeInfo.wasCompressed && (
            <span className="text-[10px] opacity-70">· Optimized for web generation</span>
          )}
          {tooLarge && (
            <span className="ml-auto font-medium">Still large — consider a smaller photo</span>
          )}
        </div>
      )}

      {errorMessage && (
        <p className="mt-2 text-sm text-destructive">{errorMessage}</p>
      )}
    </div>
  );
}
