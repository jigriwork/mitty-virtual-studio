'use client';

import { getSupabaseBrowserClient } from './client';

export const PRODUCT_IMAGES_BUCKET = 'product-generated-images';
export const SIZE_CHARTS_BUCKET = 'size-charts';

const dataUriToBlob = async (dataUri: string): Promise<Blob> => {
  const response = await fetch(dataUri);
  return response.blob();
};

export const sanitizeStorageSegment = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || `product-${Date.now()}`;

export const uploadDataUriToPublicStorage = async ({
  bucket,
  path,
  dataUri,
}: {
  bucket: string;
  path: string;
  dataUri: string;
}) => {
  const supabase = getSupabaseBrowserClient();
  const blob = await dataUriToBlob(dataUri);
  const contentType = blob.type || 'image/png';
  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    cacheControl: '31536000',
    contentType,
    upsert: true,
  });

  if (error) {
    throw new Error(error.message);
  }

  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
};

export const uploadFileToPublicStorage = async ({
  bucket,
  path,
  file,
}: {
  bucket: string;
  path: string;
  file: File;
}) => {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '31536000',
    contentType: file.type || 'image/png',
    upsert: true,
  });

  if (error) {
    throw new Error(error.message);
  }

  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
};
