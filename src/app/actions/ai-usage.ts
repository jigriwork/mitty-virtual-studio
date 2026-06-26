'use server';

import { createClient } from '@supabase/supabase-js';
import {
  AI_USAGE_PROVIDER,
  type AiUsageGenerationType,
  type AiUsageStatus,
  getImageCostEstimateInr,
  getTextCostEstimateInr,
  getTotalCostEstimateInr,
} from '@/lib/ai-usage-costs';

type LogAiUsageInput = {
  accessToken: string;
  userId: string;
  userEmail?: string;
  generationType: AiUsageGenerationType;
  category?: string;
  productTitle?: string;
  requestedImages?: number;
  successfulImages?: number;
  failedImages?: number;
  model?: string;
  status: AiUsageStatus;
  errorMessage?: string;
  metadata?: Record<string, string | number | boolean | null>;
};

const truncate = (value: string | undefined, maxLength: number) => {
  if (!value) return null;
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;
};

export async function logAiUsage(input: LogAiUsageInput) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return { ok: false, error: 'Supabase is not configured.' };
  }

  const requestedImages = Math.max(0, input.requestedImages || 0);
  const successfulImages = Math.max(0, input.successfulImages || 0);
  const failedImages = Math.max(0, input.failedImages || 0);
  const estimatedImageCostInr = getImageCostEstimateInr(successfulImages);
  const estimatedTextCostInr = getTextCostEstimateInr(input.generationType, input.status);
  const estimatedTotalCostInr = getTotalCostEstimateInr({
    generationType: input.generationType,
    status: input.status,
    successfulImages,
  });

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { error } = await supabase.from('ai_usage_logs').insert({
    user_id: input.userId,
    user_email: truncate(input.userEmail, 320),
    generation_type: input.generationType,
    category: truncate(input.category, 80),
    product_title: truncate(input.productTitle, 180),
    requested_images: requestedImages,
    successful_images: successfulImages,
    failed_images: failedImages,
    estimated_image_cost_inr: estimatedImageCostInr,
    estimated_text_cost_inr: estimatedTextCostInr,
    estimated_total_cost_inr: estimatedTotalCostInr,
    model: truncate(input.model, 120),
    provider: AI_USAGE_PROVIDER,
    status: input.status,
    error_message: truncate(input.errorMessage, 500),
    metadata: input.metadata || {},
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
