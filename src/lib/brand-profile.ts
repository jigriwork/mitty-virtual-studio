export const enabledCategoryGroups = [
  'menswear',
  'womenswear',
  'ethnic',
  'sarees',
  'jewellery',
  'watches',
  'footwear',
  'perfume_beauty',
  'bags_accessories',
  'boutique_multibrand',
  'd2c',
  'marketplace',
] as const;

export const currentGeneratorCategories = [
  'shirt',
  'trousers',
  'jeans',
  'shoes',
  'perfume',
] as const;

export type EnabledCategoryGroup = (typeof enabledCategoryGroups)[number];
export type CurrentGeneratorCategory = (typeof currentGeneratorCategories)[number];

// Phase 2 foundation:
// This static brand profile is intentionally code-based for MITTY only.
// It will later move to Organization/Brand Profile settings when the
// SaaS organization model is built. Do not use this file to add permissions,
// billing, database storage, or generator behavior yet.
export const currentBrandProfile = {
  brandName: 'MITTY',
  platformName: 'MITTY Studio',
  website: 'mitty.co.in',
  businessType: 'Premium menswear and retail product brand',
  city: 'Brahmapur',
  state: 'Odisha',
  country: 'India',
  tagline: 'From Odisha, For India',
  tone: 'premium, clean, confident, retail-friendly',
  languagePreference: 'English with simple Indian retail-friendly wording',
  targetAudience: 'modern Indian shoppers',
  defaultCTA: 'Shop online at mitty.co.in',
  currentWorkspaceName: 'MITTY Internal Workspace',
  catalogBrandPrefix: 'MITTY',
  productCodePrefixBase: 'MITTY',
  supportEmail: null,
  enabledCategoryGroups,
  currentGeneratorCategories,
} as const;

export type BrandProfile = typeof currentBrandProfile;

export const getCurrentBrandProfile = (): BrandProfile => currentBrandProfile;

export const getPlatformName = () => currentBrandProfile.platformName;

export const getBrandName = () => currentBrandProfile.brandName;

export const getDefaultCTA = () => currentBrandProfile.defaultCTA;

export const getCurrentGeneratorCategories = (): readonly CurrentGeneratorCategory[] =>
  currentBrandProfile.currentGeneratorCategories;

export const getEnabledCategoryGroups = (): readonly EnabledCategoryGroup[] =>
  currentBrandProfile.enabledCategoryGroups;
