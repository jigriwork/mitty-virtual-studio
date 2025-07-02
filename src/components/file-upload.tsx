'use client';

import { UploadCloud, File as FileIcon, X } from 'lucide-react';
import Image from 'next/image';
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import type { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ProductFormValues } from '@/lib/types';

interface FileUploadProps {
  form: UseFormReturn<ProductFormValues>;
  name: keyof ProductFormValues;
}

export function FileUpload({ form, name }: FileUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const { setValue, formState: { errors } } = form;

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        setValue(name, acceptedFiles as any, { shouldValidate: true });
        const reader = new FileReader();
        reader.onload = () => setPreview(reader.result as string);
        reader.readAsDataURL(file);
      }
    },
    [name, setValue]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.png', '.webp'] },
    maxFiles: 1,
  });

  const removeFile = () => {
    setValue(name, null as any, { shouldValidate: true });
    setPreview(null);
  };
  
  const errorMessage = errors[name]?.message as string | undefined;

  return (
    <div>
      <div
        {...getRootProps()}
        className={cn(
          'relative flex h-48 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors',
          isDragActive ? 'border-primary bg-primary/10' : 'border-input hover:border-primary/50',
          errorMessage ? 'border-destructive' : ''
        )}
      >
        <input {...getInputProps()} />
        {preview ? (
          <>
            <Image src={preview} alt="Product preview" layout="fill" objectFit="contain" className="rounded-lg p-2" />
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
          <div className="flex flex-col items-center gap-2 text-muted-foreground text-center p-4">
            <UploadCloud className="h-10 w-10" />
            <p className="font-semibold">
              {isDragActive ? 'Drop the file here' : 'Drag & drop image or click to upload'}
            </p>
            <p className="text-xs">PNG, JPG, WEBP up to 5MB</p>
          </div>
        )}
      </div>
      {errorMessage && (
        <p className="mt-2 text-sm text-destructive">{errorMessage}</p>
      )}
    </div>
  );
}
