export const USD_TO_INR = 95;
export const GEMINI_IMAGE_COST_USD = 0.039;
export const SAFE_COST_PER_IMAGE_INR = 5;
export const TEXT_COST_ESTIMATE_INR_PER_PRODUCT = 0.5;
export const AI_USAGE_PROVIDER = 'gemini';
export const GEMINI_TEXT_MODEL = 'googleai/gemini-2.5-flash';
export const GEMINI_IMAGE_MODEL = 'googleai/gemini-2.5-flash-image';

export type AiUsageGenerationType = 'title_description' | 'full_product_images' | 'regenerate_image';
export type AiUsageStatus = 'success' | 'partial_success' | 'failed';

export const getImageCostEstimateInr = (successfulImages: number) =>
  Math.max(0, successfulImages) * SAFE_COST_PER_IMAGE_INR;

export const getTextCostEstimateInr = (generationType: AiUsageGenerationType, status: AiUsageStatus) =>
  generationType === 'title_description' && status === 'success' ? TEXT_COST_ESTIMATE_INR_PER_PRODUCT : 0;

export const getTotalCostEstimateInr = ({
  generationType,
  status,
  successfulImages,
}: {
  generationType: AiUsageGenerationType;
  status: AiUsageStatus;
  successfulImages: number;
}) => getImageCostEstimateInr(successfulImages) + getTextCostEstimateInr(generationType, status);
