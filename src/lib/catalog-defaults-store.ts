'use client';

import {
  CATALOG_DEFAULTS_STORAGE_KEY,
  type CatalogDefaults,
  mergeCatalogDefaults,
} from '@/lib/catalog';
import { getSupabaseBrowserClient, hasSupabaseBrowserConfig } from '@/lib/supabase/client';

export const CATALOG_DEFAULTS_UPDATED_EVENT = 'mitty-catalog-defaults-updated';
export const CATALOG_DEFAULTS_GLOBAL_ID = 'global';

type CatalogDefaultsRow = {
  id: string;
  gst_percent: string | null;
  pickup_address_code: string | null;
  return_exchange_condition: string | null;
  shirt_hsn_code: string | null;
  trouser_hsn_code: string | null;
  jeans_hsn_code: string | null;
  shoes_hsn_code: string | null;
  perfume_hsn_code: string | null;
  shirt_size_chart_url: string | null;
  trouser_size_chart_url: string | null;
  jeans_size_chart_url: string | null;
  shoes_size_chart_url: string | null;
  perfume_size_chart_url: string | null;
  updated_by?: string | null;
};

export type CatalogDefaultsLoadResult = {
  defaults: CatalogDefaults;
  source: 'supabase' | 'localStorage' | 'built-in';
  errorMessage?: string;
};

const safeErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'object' && error && 'message' in error) {
    return String((error as { message?: unknown }).message || 'Unknown error');
  }

  return 'Unknown error';
};

export const readLocalCatalogDefaults = () => {
  try {
    const stored = window.localStorage.getItem(CATALOG_DEFAULTS_STORAGE_KEY);
    return stored ? mergeCatalogDefaults(JSON.parse(stored) as Partial<CatalogDefaults>) : mergeCatalogDefaults(null);
  } catch {
    return mergeCatalogDefaults(null);
  }
};

export const cacheCatalogDefaults = (defaults: CatalogDefaults) => {
  window.localStorage.setItem(CATALOG_DEFAULTS_STORAGE_KEY, JSON.stringify(defaults));
};

export const notifyCatalogDefaultsUpdated = () => {
  window.dispatchEvent(new Event(CATALOG_DEFAULTS_UPDATED_EVENT));
};

export const cacheAndNotifyCatalogDefaults = (defaults: CatalogDefaults) => {
  cacheCatalogDefaults(defaults);
  notifyCatalogDefaultsUpdated();
};

const rowToCatalogDefaults = (row: CatalogDefaultsRow): CatalogDefaults => mergeCatalogDefaults({
  defaultGstPercent: row.gst_percent || '',
  defaultPickupAddressCode: row.pickup_address_code || '',
  defaultReturnExchangeCondition: row.return_exchange_condition || '',
  shirtHsnCode: row.shirt_hsn_code || '',
  trouserHsnCode: row.trouser_hsn_code || '',
  jeansHsnCode: row.jeans_hsn_code || '',
  shoesHsnCode: row.shoes_hsn_code || '',
  perfumeHsnCode: row.perfume_hsn_code || '',
  shirtSizeChartUrl: row.shirt_size_chart_url || '',
  trouserSizeChartUrl: row.trouser_size_chart_url || '',
  jeansSizeChartUrl: row.jeans_size_chart_url || '',
  shoesSizeChartUrl: row.shoes_size_chart_url || '',
  perfumeSizeChartUrl: row.perfume_size_chart_url || '',
});

const catalogDefaultsToRow = (defaults: CatalogDefaults, updatedBy?: string | null): CatalogDefaultsRow => ({
  id: CATALOG_DEFAULTS_GLOBAL_ID,
  gst_percent: defaults.defaultGstPercent || null,
  pickup_address_code: defaults.defaultPickupAddressCode || null,
  return_exchange_condition: defaults.defaultReturnExchangeCondition || null,
  shirt_hsn_code: defaults.shirtHsnCode || null,
  trouser_hsn_code: defaults.trouserHsnCode || null,
  jeans_hsn_code: defaults.jeansHsnCode || null,
  shoes_hsn_code: defaults.shoesHsnCode || null,
  perfume_hsn_code: defaults.perfumeHsnCode || null,
  shirt_size_chart_url: defaults.shirtSizeChartUrl || null,
  trouser_size_chart_url: defaults.trouserSizeChartUrl || null,
  jeans_size_chart_url: defaults.jeansSizeChartUrl || null,
  shoes_size_chart_url: defaults.shoesSizeChartUrl || null,
  perfume_size_chart_url: defaults.perfumeSizeChartUrl || null,
  updated_by: updatedBy || null,
});

export const loadCatalogDefaults = async (): Promise<CatalogDefaultsLoadResult> => {
  if (!hasSupabaseBrowserConfig()) {
    const localDefaults = readLocalCatalogDefaults();
    return { defaults: localDefaults, source: 'localStorage', errorMessage: 'Supabase is not configured.' };
  }

  try {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('catalog_defaults')
      .select('*')
      .eq('id', CATALOG_DEFAULTS_GLOBAL_ID)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data) {
      const defaults = rowToCatalogDefaults(data as CatalogDefaultsRow);
      cacheCatalogDefaults(defaults);
      return { defaults, source: 'supabase' };
    }

    const localDefaults = readLocalCatalogDefaults();
    return { defaults: localDefaults, source: 'localStorage' };
  } catch (error) {
    const localDefaults = readLocalCatalogDefaults();
    return { defaults: localDefaults, source: 'localStorage', errorMessage: safeErrorMessage(error) };
  }
};

export const saveCatalogDefaultsToSupabase = async (defaults: CatalogDefaults) => {
  if (!hasSupabaseBrowserConfig()) {
    throw new Error('Supabase is not configured.');
  }

  const supabase = getSupabaseBrowserClient();
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !sessionData.session) {
    throw new Error(sessionError?.message || 'Login session is missing.');
  }

  const row = catalogDefaultsToRow(defaults, sessionData.session.user.id);
  const { data, error } = await supabase
    .from('catalog_defaults')
    .upsert(row, { onConflict: 'id' })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  const savedDefaults = rowToCatalogDefaults(data as CatalogDefaultsRow);
  cacheAndNotifyCatalogDefaults(savedDefaults);
  return savedDefaults;
};

export const getSafeCatalogDefaultsErrorMessage = (error: unknown) => {
  const message = safeErrorMessage(error);
  const normalized = message.toLowerCase();

  if (
    normalized.includes('permission')
    || normalized.includes('policy')
    || normalized.includes('row-level security')
    || normalized.includes('unauthorized')
    || normalized.includes('session')
    || normalized.includes('auth')
  ) {
    return 'Please check login session or Catalog Defaults permissions.';
  }

  return message;
};
