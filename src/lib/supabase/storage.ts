'use client';

import { getSupabaseBrowserClient } from './client';

export const PRODUCT_IMAGES_BUCKET = 'product-generated-images';
export const SIZE_CHARTS_BUCKET = 'size-charts';
const STORAGE_PUBLIC_PATH = '/storage/v1/object/public/';

const dataUriToBlob = async (dataUri: string): Promise<Blob> => {
  const response = await fetch(dataUri);
  return response.blob();
};

const getUploadErrorMessage = (message: string) => {
  const normalized = message.toLowerCase();

  if (normalized.includes('bucket') || normalized.includes('not found')) {
    return 'Image storage is not ready. Please ask the administrator to finish storage setup.';
  }

  if (normalized.includes('row-level security') || normalized.includes('policy') || normalized.includes('unauthorized')) {
    return 'This account does not have permission to upload images yet.';
  }

  return message || 'Image upload failed.';
};

export const sanitizeStorageSegment = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || `product-${Date.now()}`;

export const isPublicStorageUrl = (url: string, bucket?: string) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl || !url) {
    return false;
  }

  const expectedPrefix = `${supabaseUrl}${STORAGE_PUBLIC_PATH}${bucket ? `${bucket}/` : ''}`;
  return url.startsWith(expectedPrefix);
};

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
    throw new Error(getUploadErrorMessage(error.message));
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
    throw new Error(getUploadErrorMessage(error.message));
  }

  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
};
