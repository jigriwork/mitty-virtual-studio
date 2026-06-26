'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { generateHdFlatlay } from '@/ai/flows/generate-hd-flatlay';
import { generateFrontView } from '@/ai/flows/generate-front-view';
import { generateSideView } from '@/ai/flows/generate-side-view';
import { generateBackView } from '@/ai/flows/generate-back-view';
import { generateTextureView } from '@/ai/flows/generate-texture-view';
import { generateProductTitleDescription } from '@/ai/flows/generate-product-title-description';
import { generatePerfumeBottleFront } from '@/ai/flows/generate-perfume-bottle-front';
import { generatePerfumeBoxFront } from '@/ai/flows/generate-perfume-box-front';
import { generatePerfumeBoxBack } from '@/ai/flows/generate-perfume-box-back';
import { generatePerfumeHeroView } from '@/ai/flows/generate-perfume-hero-view';

import { logAiUsage } from '@/app/actions/ai-usage';
import { AppShell, type AppSection } from '@/components/app-shell';
import { AuthGate, type AuthContextValue } from '@/components/auth-gate';
import { BulkCatalogImport } from '@/components/bulk-catalog-import';
import { CatalogDefaultsSettings } from '@/components/catalog-defaults-settings';
import { PlaceholderSection } from '@/components/placeholder-section';
import { ProductForm } from '@/components/product-form';
import { ProductHistory } from '@/components/product-history';
import { ResultsDisplay } from '@/components/results-display';
import { StudioWorkspace } from '@/components/studio-workspace';
import { UsageLogs } from '@/components/usage-logs';
import { useToast } from '@/hooks/use-toast';
import type {
  GenerationProgressState,
  GenerationProgressStep,
  GenerationResults,
  ProductFormValues,
  SeoContentPack,
  AvailableSizeRow,
} from '@/lib/types';
import { productFormSchema } from '@/lib/types';
import { getSafeGenerationErrorMessage } from '@/lib/ai-error-message';
import { optimizeImage, estimatePayload, type OptimizedImage } from '@/lib/image-compression';
import {
  WORKFLOW_DRAFT_UPDATED_EVENT,
  getSerializableProductFormDraft,
  removeWorkflowDraftFile,
  readWorkflowDraft,
  type WorkflowDraftFileField,
  writeWorkflowDraft,
} from '@/lib/workflow-draft';
import { incrementProductsGenerated } from '@/lib/workflow-metrics';
import type { GenerateProductViewInput } from '@/ai/flows/types';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  GEMINI_IMAGE_MODEL,
  GEMINI_TEXT_MODEL,
  type AiUsageGenerationType,
  type AiUsageStatus,
} from '@/lib/ai-usage-costs';

type GeneratingState = {
  all: boolean;
  frontView: boolean;
  sideView: boolean;
  backView: boolean;
  textureView: boolean;
  flatlay: boolean;
  heroView: boolean;
};

type ProductCategory = ProductFormValues['productCategory'];

type UsageLogInput = {
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

type RegenerateUsageSnapshot = {
  category?: string;
  productTitle?: string;
  isManualColor: boolean;
};

const PLATFORM_ADMIN_EMAILS = new Set(['admin@gpbm.in']);

const defaultProductFormValues: ProductFormValues = {
  gender: 'Male',
  productCategory: 'Shirt',
  fabricType: '',
  color: '',
  pattern: '',
  sleeveType: 'Full Sleeve',
  fitType: '',
  materialStretch: 'No',
  trouserFrontPocketType: 'Auto Detect',
  trouserBackPocketType: 'Auto Detect',
  trouserVisibleLogo: 'Auto Detect',
  trouserFrontStyle: 'Auto Detect',
  trouserCrease: 'Auto Detect',
  trouserFit: 'Auto Detect',
  trouserFabricFinish: 'Auto Detect',
  trouserTagBrandingVisibility: 'Auto Detect',
  frontPocket: 'Auto Detect',
  patternOverride: 'Auto Detect',
  collarType: 'Auto Detect',
  visibleLogo: 'Auto Detect',
  outputBackgroundStyle: 'Clean Light Grey Studio',
  mrp: '',
  availableSizes: [],
  fragranceName: '',
  fragranceFamily: '',
  sizeMl: '',
};

const uploadFields: WorkflowDraftFileField[] = [
  'productImage',
  'openShirtImage',
  'fabricCloseupImage',
  'collarButtonCloseupImage',
  'pocketLogoDetailImage',
  'backSideImage',
  'productImageFront',
  'productImageFabric',
  'productImageBack',
  'bottleImageFile',
  'boxFrontImageFile',
  'boxBackImageFile',
];

const shirtSpecificFields: Array<keyof ProductFormValues> = [
  'sleeveType',
  'frontPocket',
  'patternOverride',
  'collarType',
  'visibleLogo',
  'outputBackgroundStyle',
];

const trouserSpecificFields: Array<keyof ProductFormValues> = [
  'fitType',
  'materialStretch',
  'trouserFrontPocketType',
  'trouserBackPocketType',
  'trouserVisibleLogo',
  'trouserFrontStyle',
  'trouserCrease',
  'trouserFit',
  'trouserFabricFinish',
  'trouserTagBrandingVisibility',
];

const perfumeSpecificFields: Array<keyof ProductFormValues> = [
  'fragranceName',
  'fragranceFamily',
  'sizeMl',
];

const imageStepIdsByCategory: Record<ProductCategory, string[]> = {
  Shirt: ['front', 'side', 'back', 'flatlay'],
  Jeans: ['front', 'side', 'back', 'flatlay'],
  Shoes: ['front', 'side', 'back', 'flatlay'],
  Trousers: ['front', 'back', 'texture', 'flatlay'],
  Perfume: ['front', 'side', 'back', 'hero'],
};

const getProgressSteps = (category: ProductCategory): GenerationProgressStep[] => {
  const genericImageLabels = {
    front: 'Generating image 1 of 4: front model view',
    side: 'Generating image 2 of 4: side view',
    back: 'Generating image 3 of 4: back view',
    flatlay: 'Generating image 4 of 4: flatlay view',
  };
  const categoryImageLabels: Record<ProductCategory, Record<string, string>> = {
    Shirt: genericImageLabels,
    Jeans: genericImageLabels,
    Shoes: genericImageLabels,
    Trousers: {
      front: 'Generating image 1 of 4: front trouser view',
      back: 'Generating image 2 of 4: back trouser view',
      texture: 'Generating image 3 of 4: fabric texture close-up',
      flatlay: 'Generating image 4 of 4: flatlay view',
    },
    Perfume: {
      front: 'Generating image 1 of 4: bottle front',
      side: 'Generating image 2 of 4: box front',
      back: 'Generating image 3 of 4: box back',
      hero: 'Generating image 4 of 4: hero image',
    },
  };

  return [
    { id: 'details', label: 'Validating product details', status: 'pending' },
    { id: 'prepare', label: 'Preparing product inputs', status: 'pending' },
    { id: 'seo', label: 'Generating title and description', status: 'pending' },
    { id: 'imageBatch', label: 'Generating product images', status: 'pending' },
    ...imageStepIdsByCategory[category].map((id) => ({
      id,
      label: categoryImageLabels[category][id],
      status: 'pending' as const,
    })),
    { id: 'export', label: 'Preparing results and downloads', status: 'pending' },
    { id: 'done', label: 'Done', status: 'pending' },
  ];
};

const getProgressPercent = (steps: GenerationProgressStep[], status: GenerationProgressState['status']) => {
  if (status === 'done') {
    return 100;
  }

  const completedCount = steps.filter((step) => step.status === 'completed').length;
  const rawPercent = (completedCount / steps.length) * 100;

  return Math.min(99, Math.max(0, Math.round(rawPercent)));
};

const createProgressState = (category: ProductCategory): GenerationProgressState => ({
  status: 'running',
  percent: 0,
  imageTotal: imageStepIdsByCategory[category].length,
  imageCompleted: 0,
  succeededViews: [],
  failedViews: [],
  startedAt: Date.now(),
  steps: getProgressSteps(category),
});

const createSeoOnlyResult = (
  textResult: SeoContentPack,
  productCategory: ProductCategory,
  gender: ProductFormValues['gender'],
  color: string,
  selectedColor: string,
  detectedColor: string,
  effectiveColor: string,
  isManualColor: boolean,
  fitType?: string,
  mrp?: string,
  availableSizes?: AvailableSizeRow[]
): GenerationResults => ({
  ...textResult,
  productCategory,
  gender,
  color,
  selectedColor,
  detectedColor,
  effectiveColor,
  isManualColor,
  fitType,
  mrp,
  availableSizes,
});

export default function Home() {
  return <AuthGate>{(auth) => <AuthenticatedStudio auth={auth} />}</AuthGate>;
}

function AuthenticatedStudio({ auth }: { auth: AuthContextValue }) {
  const [activeSection, setActiveSection] = useState<AppSection>('studio');
  const [results, setResults] = useState<GenerationResults | null>(null);
  const [productImageUris, setProductImageUris] = useState<{ [key: string]: string }>({});
  const [progress, setProgress] = useState<GenerationProgressState>({
    status: 'idle',
    percent: 0,
    steps: [],
  });
  const [generating, setGenerating] = useState<GeneratingState>({
    all: false,
    frontView: false,
    sideView: false,
    backView: false,
    textureView: false,
    flatlay: false,
    heroView: false,
  });
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<number | undefined>(undefined);
  const userEditedBeforeDraftHydrationRef = useRef(false);
  const previousCategoryRef = useRef<ProductCategory>(defaultProductFormValues.productCategory);
  const progressSectionRef = useRef<HTMLDivElement | null>(null);
  const resultsSectionRef = useRef<HTMLDivElement | null>(null);
  const scrolledToProgressRef = useRef(false);
  const scrolledToResultsRef = useRef(false);
  const { toast } = useToast();
  const isPlatformAdmin = PLATFORM_ADMIN_EMAILS.has(auth.email.toLowerCase());

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: defaultProductFormValues,
  });

  const writeUsageLog = async (input: UsageLogInput) => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.getSession();

      if (error || !data.session?.access_token) {
        throw new Error(error?.message || 'Missing session for usage logging.');
      }

      const result = await logAiUsage({
        accessToken: data.session.access_token,
        userId: auth.user.id,
        userEmail: auth.email,
        ...input,
      });

      if (!result.ok) {
        throw new Error(result.error || 'Usage log insert failed.');
      }

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown usage logging error.';
      console.warn('AI usage logging skipped:', {
        generationType: input.generationType,
        status: input.status,
        message,
      });
      return false;
    }
  };

  useEffect(() => {
    if (progress.status !== 'running' || scrolledToProgressRef.current) {
      return;
    }

    scrolledToProgressRef.current = true;
    window.setTimeout(() => {
      progressSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }, [progress.status]);

  useEffect(() => {
    if ((progress.status !== 'done' && progress.status !== 'partial') || !results || scrolledToResultsRef.current) {
      return;
    }

    scrolledToResultsRef.current = true;
    window.setTimeout(() => {
      resultsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
  }, [progress.status, results]);

  useEffect(() => {
    if (draftHydrated) {
      return;
    }

    const subscription = form.watch((_values, info) => {
      if (info.type === 'change') {
        userEditedBeforeDraftHydrationRef.current = true;
      }
    });

    return () => subscription.unsubscribe();
  }, [draftHydrated, form]);

  useEffect(() => {
    let cancelled = false;

    const restoreDraft = async () => {
      const draft = await readWorkflowDraft();

      if (cancelled) {
        return;
      }

      const shouldRestoreDraft = !userEditedBeforeDraftHydrationRef.current;

      if (draft?.formValues && shouldRestoreDraft) {
        form.reset({
          ...defaultProductFormValues,
          ...draft.formValues,
        });
      }

      if (draft?.results && shouldRestoreDraft) {
        setResults(draft.results);
      }

      if (draft?.productImageUris && shouldRestoreDraft) {
        setProductImageUris(draft.productImageUris);
      }

      setDraftSavedAt(draft?.updatedAt);
      previousCategoryRef.current = form.getValues('productCategory');
      setDraftHydrated(true);
    };

    void restoreDraft();

    return () => {
      cancelled = true;
    };
  }, [form]);

  useEffect(() => {
    const handleDraftUpdated = () => setDraftSavedAt(Date.now());

    window.addEventListener(WORKFLOW_DRAFT_UPDATED_EVENT, handleDraftUpdated);
    return () => window.removeEventListener(WORKFLOW_DRAFT_UPDATED_EVENT, handleDraftUpdated);
  }, []);

  useEffect(() => {
    if (!draftHydrated) {
      return;
    }

    const resetFields = (fields: Array<keyof ProductFormValues>) => {
      for (const field of fields) {
        form.resetField(field, { defaultValue: defaultProductFormValues[field] });
      }
    };

    const clearUploadFields = () => {
      for (const field of uploadFields) {
        form.setValue(field, null, { shouldDirty: true, shouldValidate: false });
        void removeWorkflowDraftFile(field);
      }
    };

    const subscription = form.watch((values, info) => {
      const nextCategory = values.productCategory as ProductCategory | undefined;

      if (info.name !== 'productCategory' || !nextCategory || nextCategory === previousCategoryRef.current) {
        return;
      }

      previousCategoryRef.current = nextCategory;
      clearUploadFields();
      setProductImageUris({});
      setResults(null);
      setProgress({ status: 'idle', percent: 0, steps: [] });

      if (nextCategory !== 'Shirt') {
        resetFields(shirtSpecificFields);
      }

      if (nextCategory !== 'Trousers') {
        resetFields(trouserSpecificFields);
      }

      if (nextCategory !== 'Perfume') {
        resetFields(perfumeSpecificFields);
      }
    });

    return () => subscription.unsubscribe();
  }, [draftHydrated, form]);

  useEffect(() => {
    if (!draftHydrated) {
      return;
    }

    const subscription = form.watch((values) => {
      void writeWorkflowDraft({
        formValues: getSerializableProductFormDraft(values as ProductFormValues),
      });
    });

    return () => subscription.unsubscribe();
  }, [draftHydrated, form]);

  useEffect(() => {
    if (!draftHydrated) {
      return;
    }

    void writeWorkflowDraft({ results });
  }, [draftHydrated, results]);

  useEffect(() => {
    if (!draftHydrated) {
      return;
    }

    void writeWorkflowDraft({ productImageUris });
  }, [draftHydrated, productImageUris]);

  const onSubmit = async (data: ProductFormValues) => {
    scrolledToProgressRef.current = false;
    scrolledToResultsRef.current = false;
    setGenerating({ all: true, frontView: false, sideView: false, backView: false, textureView: false, flatlay: false, heroView: false });
    setProgress(createProgressState(data.productCategory));
    setProductImageUris({});
    let lastStepId = 'details';
    let failedReason: string | undefined;
    let partialSuccessHandled = false;

    const markStepActive = (stepId: string) => {
      lastStepId = stepId;
      setProgress((prev) => {
        const steps = prev.steps.map((step) =>
          step.id === stepId && step.status === 'pending' ? { ...step, status: 'active' as const } : step
        );

        return {
          ...prev,
          status: 'running',
          currentStepId: stepId,
          steps,
          percent: getProgressPercent(steps, 'running'),
        };
      });
    };

    const markStepCompleted = (stepId: string) => {
      setProgress((prev) => {
        const steps = prev.steps.map((step) =>
          step.id === stepId ? { ...step, status: 'completed' as const, error: undefined } : step
        );
        const isDone = stepId === 'done';
        const status = isDone ? 'done' : prev.status;

        return {
          ...prev,
          status,
          currentStepId: isDone ? undefined : prev.currentStepId,
          completedAt: isDone ? Date.now() : prev.completedAt,
          steps,
          percent: getProgressPercent(steps, status),
        };
      });
    };

    const updateImageProgress = ({
      view,
      status,
    }: {
      view: string;
      status: 'success' | 'failed';
    }) => {
      setProgress((prev) => {
        const succeededViews = status === 'success'
          ? [...(prev.succeededViews || []), view]
          : prev.succeededViews || [];
        const failedViews = status === 'failed'
          ? [...(prev.failedViews || []), view]
          : prev.failedViews || [];

        return {
          ...prev,
          imageCompleted: succeededViews.length,
          succeededViews,
          failedViews,
          summaryMessage: failedViews.length > 0
            ? `${succeededViews.length} of ${prev.imageTotal || 0} images completed. ${failedViews.length} failed.`
            : `${succeededViews.length} of ${prev.imageTotal || 0} images completed.`,
        };
      });
    };

    const markStepFailed = (stepId: string, error: unknown) => {
      const reason = getSafeGenerationErrorMessage(error);
      failedReason = reason;

      setProgress((prev) => {
        const steps = prev.steps.map((step) =>
          step.id === stepId ? { ...step, status: 'failed' as const, error: reason } : step
        );

        return {
          ...prev,
          status: 'failed',
          currentStepId: undefined,
          failedStepId: stepId,
          failedReason: reason,
          completedAt: Date.now(),
          steps,
          percent: getProgressPercent(steps, 'failed'),
        };
      });

      return reason;
    };

    const markImageStepFailed = (stepId: string, error: unknown) => {
      const reason = getSafeGenerationErrorMessage(error);

      setProgress((prev) => {
        const steps = prev.steps.map((step) =>
          step.id === stepId ? { ...step, status: 'failed' as const, error: reason } : step
        );

        return {
          ...prev,
          steps,
          summaryMessage: reason,
          percent: getProgressPercent(steps, prev.status),
        };
      });

      return reason;
    };

    const runImageStep = async <T,>(
      stepId: string,
      viewKey: keyof Pick<
        GenerationResults,
        'frontView' | 'sideView' | 'backView' | 'textureView' | 'hdFlatlayImage' | 'heroView'
      >,
      task: Promise<T>,
      getImage: (result: T) => string
    ) => {
      markStepActive(stepId);

      try {
        const result = await task;
        const image = getImage(result);

        setResults((prev) => (prev ? { ...prev, [viewKey]: image } : prev));
        markStepCompleted(stepId);
        updateImageProgress({ view: stepId, status: 'success' });
        return image;
      } catch (error) {
        markImageStepFailed(stepId, error);
        updateImageProgress({ view: stepId, status: 'failed' });
        throw error;
      }
    };

    const runFullProductImageBatch = async ({
      category,
      productTitle,
      isManualColor,
      items,
    }: {
      category: ProductCategory;
      productTitle?: string;
      isManualColor: boolean;
      items: Array<{ view: string; run: () => Promise<string> }>;
    }) => {
      markStepActive('imageBatch');
      const settled = await Promise.allSettled(items.map((item) => item.run()));
      const successfulImages = settled.filter((result) => result.status === 'fulfilled').length;
      const failedImages = settled.length - successfulImages;
      const firstFailure = settled.find((result) => result.status === 'rejected');
      const status: AiUsageStatus = failedImages === 0
        ? 'success'
        : successfulImages > 0
          ? 'partial_success'
          : 'failed';

      await writeUsageLog({
        generationType: 'full_product_images',
        category,
        productTitle,
        requestedImages: items.length,
        successfulImages,
        failedImages,
        model: GEMINI_IMAGE_MODEL,
        status,
        errorMessage: firstFailure?.status === 'rejected' ? getSafeGenerationErrorMessage(firstFailure.reason) : undefined,
        metadata: {
          views: items.map((item) => item.view).join(','),
          isManualColor,
        },
      });

      if (failedImages === 0) {
        markStepCompleted('imageBatch');
      } else if (successfulImages > 0) {
        partialSuccessHandled = true;
        setProgress((prev) => ({
          ...prev,
          status: 'partial',
          completedAt: Date.now(),
          currentStepId: undefined,
          steps: prev.steps.map((step) =>
            step.id === 'imageBatch' ? { ...step, status: 'completed' as const } : step
          ),
          summaryMessage: `${successfulImages} of ${items.length} images completed. ${failedImages} failed.`,
          failedReason: 'Some images could not be generated. Successful images are still available below.',
          percent: getProgressPercent(prev.steps, 'partial'),
        }));
      }

      if (firstFailure?.status === 'rejected') {
        throw firstFailure.reason;
      }
    };

    try {
      const uris: { [key: string]: string } = {};
      const allOptimized: OptimizedImage[] = [];
      const selectedColor = data.color?.trim() || '';
      const isManualColor = selectedColor.length > 0;

      const getUploadedFile = (files: File[] | null | undefined, fieldName: string) => {
        const file = files?.[0];

        if (!file) {
          throw new Error(`${fieldName} is required.`);
        }

        return file;
      };

      /** Optimize a file and track it for payload estimation. */
      const optimizeAndTrack = async (file: File): Promise<string> => {
        const opt = await optimizeImage(file);
        allOptimized.push(opt);
        return opt.dataUri;
      };

      markStepActive('details');
      markStepCompleted('details');
      markStepActive('prepare');
      const baseFlowInput: Partial<GenerateProductViewInput> = {
        productCategory: data.productCategory,
        gender: data.gender,
        fabricType: data.fabricType,
        color: selectedColor,
        selectedColor,
        isManualColor,
        pattern: data.pattern,
      };

      if (data.productCategory === 'Shirt') {
        Object.assign(baseFlowInput, {
          sleeveType: data.sleeveType,
          frontPocket: data.frontPocket,
          patternOverride: data.patternOverride,
          collarType: data.collarType,
          visibleLogo: data.visibleLogo,
          outputBackgroundStyle: data.outputBackgroundStyle,
        });
      } else if (data.productCategory === 'Trousers') {
        Object.assign(baseFlowInput, {
          fitType: data.fitType,
          materialStretch: data.materialStretch,
          trouserFrontPocketType: data.trouserFrontPocketType,
          trouserBackPocketType: data.trouserBackPocketType,
          trouserVisibleLogo: data.trouserVisibleLogo,
          trouserFrontStyle: data.trouserFrontStyle,
          trouserCrease: data.trouserCrease,
          trouserFit: data.trouserFit,
          trouserFabricFinish: data.trouserFabricFinish,
          trouserTagBrandingVisibility: data.trouserTagBrandingVisibility,
        });
      } else if (data.productCategory === 'Perfume') {
        Object.assign(baseFlowInput, {
          fragranceName: data.fragranceName,
          fragranceFamily: data.fragranceFamily,
          sizeMl: data.sizeMl,
        });
      }

      if (data.productCategory === 'Trousers') {
        const [frontUri, fabricUri, backUri] = await Promise.all([
          optimizeAndTrack(getUploadedFile(data.productImageFront, 'Front view image')),
          optimizeAndTrack(getUploadedFile(data.productImageFabric, 'Fabric close-up image')),
          optimizeAndTrack(getUploadedFile(data.productImageBack, 'Back view image')),
        ]);
        uris.front = frontUri;
        uris.fabric = fabricUri;
        uris.back = backUri;
        baseFlowInput.productImageFront = frontUri;
        baseFlowInput.productImageFabric = fabricUri;
        baseFlowInput.productImageBack = backUri;
      } else if (data.productCategory === 'Perfume') {
        const [bottleUri, boxFrontUri, boxBackUri] = await Promise.all([
          optimizeAndTrack(getUploadedFile(data.bottleImageFile, 'Perfume bottle image')),
          optimizeAndTrack(getUploadedFile(data.boxFrontImageFile, 'Perfume box front image')),
          optimizeAndTrack(getUploadedFile(data.boxBackImageFile, 'Perfume box back image')),
        ]);
        uris.bottle = bottleUri;
        uris.boxFront = boxFrontUri;
        uris.boxBack = boxBackUri;
        baseFlowInput.bottleImageUri = bottleUri;
        baseFlowInput.boxFrontImageUri = boxFrontUri;
        baseFlowInput.boxBackImageUri = boxBackUri;
      } else if (data.productCategory === 'Shirt') {
        const imageUri = await optimizeAndTrack(getUploadedFile(data.productImage, 'Main product photo'));
        uris.main = imageUri;
        baseFlowInput.productImage = imageUri;
        baseFlowInput.mainProductImage = imageUri;

        const optionalReferenceFields = [
          ['open', 'openShirtImage'],
          ['fabricCloseup', 'fabricCloseupImage'],
          ['collarButton', 'collarButtonCloseupImage'],
          ['pocketLogoDetail', 'pocketLogoDetailImage'],
          ['shirtBack', 'backSideImage'],
        ] as const;

        await Promise.all(optionalReferenceFields.map(async ([uriKey, fieldName]) => {
          const file = data[fieldName]?.[0];

          if (!file) {
            return;
          }

          const uri = await optimizeAndTrack(file);
          uris[uriKey] = uri;
          baseFlowInput[fieldName] = uri;
        }));
      } else {
        const imageUri = await optimizeAndTrack(getUploadedFile(data.productImage, 'Product image'));
        uris.main = imageUri;
        baseFlowInput.productImage = imageUri;
      }

      // -- Payload guard --
      const payload = estimatePayload(allOptimized);
      if (payload.exceedsLimit) {
        throw new Error(
          'Images are still too large for web deployment (estimated ' +
          payload.formatted +
          '). Please remove optional references or use smaller photos.'
        );
      }

      setProductImageUris(uris);
      markStepCompleted('prepare');

      // First, generate text and detect color
      markStepActive('seo');
      let textResult: Awaited<ReturnType<typeof generateProductTitleDescription>>;
      try {
        textResult = await generateProductTitleDescription(baseFlowInput as GenerateProductViewInput);
        await writeUsageLog({
          generationType: 'title_description',
          category: data.productCategory,
          productTitle: textResult.productTitle,
          requestedImages: 0,
          successfulImages: 0,
          failedImages: 0,
          model: GEMINI_TEXT_MODEL,
          status: 'success',
          metadata: {
            isManualColor,
          },
        });
      } catch (error) {
        await writeUsageLog({
          generationType: 'title_description',
          category: data.productCategory,
          requestedImages: 0,
          successfulImages: 0,
          failedImages: 0,
          model: GEMINI_TEXT_MODEL,
          status: 'failed',
          errorMessage: getSafeGenerationErrorMessage(error),
          metadata: {
            isManualColor,
          },
        });
        throw error;
      }
      markStepCompleted('seo');
      const detectedColor = textResult.detectedColor;
      const effectiveColor = isManualColor ? selectedColor : detectedColor;

      setResults(
        createSeoOnlyResult(
          textResult,
          data.productCategory,
          data.gender,
          effectiveColor,
          selectedColor,
          detectedColor,
          effectiveColor,
          isManualColor,
          data.fitType,
          data.mrp?.trim(),
          data.availableSizes
        )
      );

      // Now prepare the input for image generation using the final effective color.
      const imageFlowInput: GenerateProductViewInput = {
        ...baseFlowInput,
        color: effectiveColor,
        selectedColor,
        detectedColor,
        effectiveColor,
        isManualColor,
      } as GenerateProductViewInput;


      if (data.productCategory === 'Trousers') {
        setGenerating((prev) => ({ ...prev, frontView: true, backView: true, textureView: true, flatlay: true }));
        await runFullProductImageBatch({
          category: data.productCategory,
          productTitle: textResult.productTitle,
          isManualColor,
          items: [
            { view: 'front', run: () => runImageStep('front', 'frontView', generateFrontView(imageFlowInput), (result) => result.frontView) },
            { view: 'back', run: () => runImageStep('back', 'backView', generateBackView(imageFlowInput), (result) => result.backView) },
            { view: 'texture', run: () => runImageStep('texture', 'textureView', generateTextureView(imageFlowInput), (result) => result.textureView) },
            { view: 'flatlay', run: () => runImageStep('flatlay', 'hdFlatlayImage', generateHdFlatlay(imageFlowInput), (result) => result.hdFlatlayImage) },
          ],
        });

      } else if (data.productCategory === 'Perfume') {
        setGenerating((prev) => ({ ...prev, frontView: true, sideView: true, backView: true, heroView: true }));
        await runFullProductImageBatch({
          category: data.productCategory,
          productTitle: textResult.productTitle,
          isManualColor,
          items: [
            { view: 'front', run: () => runImageStep('front', 'frontView', generatePerfumeBottleFront(imageFlowInput), (result) => result.perfumeBottleFront) },
            { view: 'side', run: () => runImageStep('side', 'sideView', generatePerfumeBoxFront(imageFlowInput), (result) => result.perfumeBoxFront) },
            { view: 'back', run: () => runImageStep('back', 'backView', generatePerfumeBoxBack(imageFlowInput), (result) => result.perfumeBoxBack) },
            { view: 'hero', run: () => runImageStep('hero', 'heroView', generatePerfumeHeroView(imageFlowInput), (result) => result.perfumeHeroView) },
          ],
        });
      } else {
        setGenerating((prev) => ({ ...prev, frontView: true, sideView: true, backView: true, flatlay: true }));
        await runFullProductImageBatch({
          category: data.productCategory,
          productTitle: textResult.productTitle,
          isManualColor,
          items: [
            { view: 'front', run: () => runImageStep('front', 'frontView', generateFrontView(imageFlowInput), (result) => result.frontView) },
            { view: 'side', run: () => runImageStep('side', 'sideView', generateSideView(imageFlowInput), (result) => result.sideView) },
            { view: 'back', run: () => runImageStep('back', 'backView', generateBackView(imageFlowInput), (result) => result.backView) },
            { view: 'flatlay', run: () => runImageStep('flatlay', 'hdFlatlayImage', generateHdFlatlay(imageFlowInput), (result) => result.hdFlatlayImage) },
          ],
        });
      }

      markStepActive('export');
      markStepCompleted('export');
      markStepActive('done');
      markStepCompleted('done');
      incrementProductsGenerated();
    } catch (e) {
      console.error(e);
      if (partialSuccessHandled) {
        toast({
          variant: 'destructive',
          title: 'Partial Generation Complete',
          description: 'Some images could not be generated. Successful images are still available below.',
        });
        return;
      }

      const safeReason = failedReason || markStepFailed(lastStepId, e);
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description: safeReason,
      });
    } finally {
      setGenerating({ all: false, frontView: false, sideView: false, backView: false, textureView: false, flatlay: false, heroView: false });
    }
  };

  const getFlowInputForRegen = (): GenerateProductViewInput => {
    const data = form.getValues();
    const selectedColor = results?.selectedColor ?? data.color?.trim() ?? '';
    const isManualColor = results?.isManualColor ?? selectedColor.length > 0;
    const detectedColor = results?.detectedColor;
    const effectiveColor = results?.effectiveColor || results?.color || (isManualColor ? selectedColor : detectedColor) || data.color;
    const flowInput: GenerateProductViewInput = {
      productCategory: data.productCategory,
      gender: data.gender,
      fabricType: data.fabricType,
      pattern: data.pattern,
      color: effectiveColor,
      selectedColor,
      detectedColor,
      effectiveColor,
      isManualColor,
    };

    if (data.productCategory === 'Shirt') {
      Object.assign(flowInput, {
        sleeveType: data.sleeveType,
        frontPocket: data.frontPocket,
        patternOverride: data.patternOverride,
        collarType: data.collarType,
        visibleLogo: data.visibleLogo,
        outputBackgroundStyle: data.outputBackgroundStyle,
        productImage: productImageUris.main,
        mainProductImage: productImageUris.main,
        openShirtImage: productImageUris.open,
        fabricCloseupImage: productImageUris.fabricCloseup,
        collarButtonCloseupImage: productImageUris.collarButton,
        pocketLogoDetailImage: productImageUris.pocketLogoDetail,
        backSideImage: productImageUris.shirtBack,
      });
    } else if (data.productCategory === 'Trousers') {
      Object.assign(flowInput, {
        fitType: data.fitType,
        materialStretch: data.materialStretch,
        trouserFrontPocketType: data.trouserFrontPocketType,
        trouserBackPocketType: data.trouserBackPocketType,
        trouserVisibleLogo: data.trouserVisibleLogo,
        trouserFrontStyle: data.trouserFrontStyle,
        trouserCrease: data.trouserCrease,
        trouserFit: data.trouserFit,
        trouserFabricFinish: data.trouserFabricFinish,
        trouserTagBrandingVisibility: data.trouserTagBrandingVisibility,
        productImageFront: productImageUris.front,
        productImageFabric: productImageUris.fabric,
        productImageBack: productImageUris.back,
      });
    } else if (data.productCategory === 'Perfume') {
      Object.assign(flowInput, {
        fragranceFamily: data.fragranceFamily,
        fragranceName: data.fragranceName,
        sizeMl: data.sizeMl,
        bottleImageUri: productImageUris.bottle,
        boxFrontImageUri: productImageUris.boxFront,
        boxBackImageUri: productImageUris.boxBack,
      });
    } else {
      Object.assign(flowInput, {
        productImage: productImageUris.main,
      });
    }

    return flowInput;
  }

  const getRegenerateUsageSnapshot = (): RegenerateUsageSnapshot => {
    const formValues = form.getValues();

    return {
      category: results?.productCategory || formValues.productCategory,
      productTitle: results?.productTitle,
      isManualColor: Boolean(results?.isManualColor),
    };
  };

  const logRegenerateUsage = async ({
    view,
    status,
    snapshot,
    error,
  }: {
    view: string;
    status: AiUsageStatus;
    snapshot: RegenerateUsageSnapshot;
    error?: unknown;
  }) => {
    await writeUsageLog({
      generationType: 'regenerate_image',
      category: snapshot.category,
      productTitle: snapshot.productTitle,
      requestedImages: 1,
      successfulImages: status === 'success' ? 1 : 0,
      failedImages: status === 'success' ? 0 : 1,
      model: GEMINI_IMAGE_MODEL,
      status,
      errorMessage: error ? getSafeGenerationErrorMessage(error) : undefined,
      metadata: {
        view,
        isManualColor: snapshot.isManualColor,
      },
    });
  };

  const handleRegenerateFrontView = async () => {
    if (Object.keys(productImageUris).length === 0) return;
    const usageSnapshot = getRegenerateUsageSnapshot();
    setGenerating((prev) => ({ ...prev, frontView: true }));
    try {
      const flowInput = getFlowInputForRegen();
      const newResult = flowInput.productCategory === 'Perfume'
        ? { frontView: (await generatePerfumeBottleFront(flowInput)).perfumeBottleFront }
        : { frontView: (await generateFrontView(flowInput)).frontView };

      setResults((prev) => (prev ? { ...prev, ...newResult } : null));
      await logRegenerateUsage({ view: 'front', status: 'success', snapshot: usageSnapshot });
      toast({ title: "Front View Regenerated", description: "The front view image has been updated." });
    } catch (e) {
      console.error(e);
      await logRegenerateUsage({ view: 'front', status: 'failed', snapshot: usageSnapshot, error: e });
      toast({ variant: 'destructive', title: 'Regeneration Failed', description: getSafeGenerationErrorMessage(e) });
    } finally {
      setGenerating((prev) => ({ ...prev, frontView: false }));
    }
  };

  const handleRegenerateSideView = async () => {
    if (Object.keys(productImageUris).length === 0) return;
    const usageSnapshot = getRegenerateUsageSnapshot();
    setGenerating((prev) => ({ ...prev, sideView: true }));
    try {
      const flowInput = getFlowInputForRegen();
      const newResult = flowInput.productCategory === 'Perfume'
        ? { sideView: (await generatePerfumeBoxFront(flowInput)).perfumeBoxFront }
        : { sideView: (await generateSideView(flowInput)).sideView };

      setResults((prev) => (prev ? { ...prev, ...newResult } : null));
      await logRegenerateUsage({ view: 'side', status: 'success', snapshot: usageSnapshot });
      toast({ title: "Side View Regenerated", description: "The image has been updated." });
    } catch (e) {
      console.error(e);
      await logRegenerateUsage({ view: 'side', status: 'failed', snapshot: usageSnapshot, error: e });
      toast({ variant: 'destructive', title: 'Regeneration Failed', description: getSafeGenerationErrorMessage(e) });
    } finally {
      setGenerating((prev) => ({ ...prev, sideView: false }));
    }
  };

  const handleRegenerateBackView = async () => {
    if (Object.keys(productImageUris).length === 0) return;
    const usageSnapshot = getRegenerateUsageSnapshot();
    setGenerating((prev) => ({ ...prev, backView: true }));
    try {
      const flowInput = getFlowInputForRegen();
      const newResult = flowInput.productCategory === 'Perfume'
        ? { backView: (await generatePerfumeBoxBack(flowInput)).perfumeBoxBack }
        : { backView: (await generateBackView(flowInput)).backView };

      setResults((prev) => (prev ? { ...prev, ...newResult } : null));
      await logRegenerateUsage({ view: 'back', status: 'success', snapshot: usageSnapshot });
      toast({ title: "Back View Regenerated", description: "The back view image has been updated." });
    } catch (e) {
      console.error(e);
      await logRegenerateUsage({ view: 'back', status: 'failed', snapshot: usageSnapshot, error: e });
      toast({ variant: 'destructive', title: 'Regeneration Failed', description: getSafeGenerationErrorMessage(e) });
    } finally {
      setGenerating((prev) => ({ ...prev, backView: false }));
    }
  };

  const handleRegenerateTextureView = async () => { // Only for trousers
    if (!productImageUris.fabric) return;
    const usageSnapshot = getRegenerateUsageSnapshot();
    setGenerating((prev) => ({ ...prev, textureView: true }));
    try {
      const result = await generateTextureView(getFlowInputForRegen());
      setResults((prev) => (prev ? { ...prev, ...result } : null));
      await logRegenerateUsage({ view: 'texture', status: 'success', snapshot: usageSnapshot });
      toast({ title: "Texture View Regenerated", description: "The texture image has been updated." });
    } catch (e) {
      console.error(e);
      await logRegenerateUsage({ view: 'texture', status: 'failed', snapshot: usageSnapshot, error: e });
      toast({ variant: 'destructive', title: 'Regeneration Failed', description: getSafeGenerationErrorMessage(e) });
    } finally {
      setGenerating((prev) => ({ ...prev, textureView: false }));
    }
  };

  const handleRegenerateHeroView = async () => { // Only for perfume
    if (Object.keys(productImageUris).length === 0) return;
    const usageSnapshot = getRegenerateUsageSnapshot();
    setGenerating((prev) => ({ ...prev, heroView: true }));
    try {
      const result = await generatePerfumeHeroView(getFlowInputForRegen());
      setResults((prev) => (prev ? { ...prev, heroView: result.perfumeHeroView } : null));
      await logRegenerateUsage({ view: 'hero', status: 'success', snapshot: usageSnapshot });
      toast({ title: "Hero View Regenerated", description: "The image has been updated." });
    } catch (e) {
      console.error(e);
      await logRegenerateUsage({ view: 'hero', status: 'failed', snapshot: usageSnapshot, error: e });
      toast({
        variant: 'destructive',
        title: 'Regeneration Failed',
        description: getSafeGenerationErrorMessage(e),
      });
    } finally {
      setGenerating((prev) => ({ ...prev, heroView: false }));
    }
  };


  const handleRegenerateFlatlay = async () => {
    if (Object.keys(productImageUris).length === 0) return;
    const usageSnapshot = getRegenerateUsageSnapshot();
    setGenerating((prev) => ({ ...prev, flatlay: true }));
    try {
      const flatlay = await generateHdFlatlay(getFlowInputForRegen());
      setResults((prev) => prev ? { ...prev, hdFlatlayImage: flatlay.hdFlatlayImage } : null);
      await logRegenerateUsage({ view: 'flatlay', status: 'success', snapshot: usageSnapshot });
      toast({ title: "HD Flat Lay / Top View Regenerated", description: "The image has been updated." });
    } catch (e) {
      console.error(e);
      await logRegenerateUsage({ view: 'flatlay', status: 'failed', snapshot: usageSnapshot, error: e });
      toast({
        variant: 'destructive',
        title: 'Regeneration Failed',
        description: getSafeGenerationErrorMessage(e),
      });
    } finally {
      setGenerating((prev) => ({ ...prev, flatlay: false }));
    }
  };

  const studioContent = (
    <StudioWorkspace
      draftReady={draftHydrated}
      draftSavedAt={draftSavedAt}
      formPanel={<ProductForm form={form} onSubmit={onSubmit} isLoading={generating.all} />}
      resultsPanel={
        <div ref={progressSectionRef}>
          <div ref={resultsSectionRef}>
            <ResultsDisplay
              results={results}
              loadingState={generating}
              onRegenerateFrontView={handleRegenerateFrontView}
              onRegenerateSideView={handleRegenerateSideView}
              onRegenerateBackView={handleRegenerateBackView}
              onRegenerateTextureView={handleRegenerateTextureView}
              onRegenerateFlatlay={handleRegenerateFlatlay}
              onRegenerateHeroView={handleRegenerateHeroView}
              progress={progress}
              onRetryGeneration={() => {
                void form.handleSubmit(onSubmit)();
              }}
            />
          </div>
        </div>
      }
    />
  );

  const renderSection = () => {
    let sectionContent: ReactNode = null;

    if (activeSection === 'studio') {
      sectionContent = studioContent;
    } else if (activeSection === 'products') {
      sectionContent = <ProductHistory />;
    } else if (activeSection === 'usage') {
      sectionContent = isPlatformAdmin ? <UsageLogs /> : <PlaceholderSection section="usage" />;
    } else if (activeSection === 'staff' && auth.role !== 'owner') {
      sectionContent = <PlaceholderSection section="settings" />;
    } else if (activeSection !== 'bulkImport' && activeSection !== 'settings') {
      sectionContent = <PlaceholderSection section={activeSection} />;
    }

    return (
      <>
        <div className={activeSection === 'bulkImport' ? 'block' : 'hidden'}>
          <BulkCatalogImport onOpenCatalogDefaults={() => setActiveSection('settings')} />
        </div>
        <div className={activeSection === 'settings' ? 'block' : 'hidden'}>
          <CatalogDefaultsSettings role={auth.role} />
        </div>
        {sectionContent}
      </>
    );
  };

  return (
    <AppShell
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      userEmail={auth.email}
      userRole={auth.role}
      isPlatformAdmin={isPlatformAdmin}
      onLogout={() => {
        void auth.logout();
      }}
    >
      {renderSection()}
    </AppShell>
  );
}
