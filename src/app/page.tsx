'use client';

import { useEffect, useState } from 'react';
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

import { AppShell, type AppSection } from '@/components/app-shell';
import { AuthGate, type AuthContextValue } from '@/components/auth-gate';
import { CatalogDefaultsSettings } from '@/components/catalog-defaults-settings';
import { PlaceholderSection } from '@/components/placeholder-section';
import { ProductForm } from '@/components/product-form';
import { ProductHistory } from '@/components/product-history';
import { ResultsDisplay } from '@/components/results-display';
import { StudioWorkspace } from '@/components/studio-workspace';
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
  readWorkflowDraft,
  writeWorkflowDraft,
} from '@/lib/workflow-draft';
import { incrementProductsGenerated } from '@/lib/workflow-metrics';
import type { GenerateProductViewInput } from '@/ai/flows/types';

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

const progressBands = [0, 10, 20, 40, 60, 80, 100];

const defaultProductFormValues: ProductFormValues = {
  gender: 'Male',
  productCategory: 'Shirt',
  fabricType: '',
  color: '',
  pattern: '',
  sleeveType: 'Full Sleeve',
  fitType: '',
  materialStretch: 'No',
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

const imageStepIdsByCategory: Record<ProductCategory, string[]> = {
  Shirt: ['front', 'side', 'back', 'flatlay'],
  Jeans: ['front', 'side', 'back', 'flatlay'],
  Shoes: ['front', 'side', 'back', 'flatlay'],
  Trousers: ['front', 'back', 'texture', 'flatlay'],
  Perfume: ['front', 'side', 'back', 'hero'],
};

const getProgressSteps = (category: ProductCategory): GenerationProgressStep[] => {
  const genericImageLabels = {
    front: 'Generating front model image',
    side: 'Generating side/angle image',
    back: 'Generating back image',
    flatlay: 'Generating clean flatlay',
  };
  const categoryImageLabels: Record<ProductCategory, Record<string, string>> = {
    Shirt: genericImageLabels,
    Jeans: genericImageLabels,
    Shoes: genericImageLabels,
    Trousers: {
      front: 'Generating front trouser image',
      back: 'Generating back trouser image',
      texture: 'Generating fabric texture close-up',
      flatlay: 'Generating flatlay',
    },
    Perfume: {
      front: 'Generating bottle front image',
      side: 'Generating box front image',
      back: 'Generating box back image',
      hero: 'Generating hero image',
    },
  };

  return [
    { id: 'prepare', label: 'Preparing reference photos', status: 'pending' },
    { id: 'details', label: 'Reading product details', status: 'pending' },
    { id: 'accuracyLock', label: 'Applying product accuracy lock', status: 'pending' },
    { id: 'studioConsistency', label: 'Applying studio consistency rules', status: 'pending' },
    { id: 'seo', label: 'Generating SEO pack', status: 'pending' },
    { id: 'color', label: 'Detecting final product color', status: 'pending' },
    ...imageStepIdsByCategory[category].map((id) => ({
      id,
      label: categoryImageLabels[category][id],
      status: 'pending' as const,
    })),
    { id: 'finalizeSeo', label: 'Finalizing SEO pack', status: 'pending' },
    { id: 'export', label: 'Preparing download/export', status: 'pending' },
    { id: 'done', label: 'Done', status: 'pending' },
  ];
};

const getProgressPercent = (steps: GenerationProgressStep[], status: GenerationProgressState['status']) => {
  if (status === 'done') {
    return 100;
  }

  const completedCount = steps.filter((step) => step.status === 'completed').length;
  const rawPercent = (completedCount / steps.length) * 100;

  return progressBands.reduce((nearest, band) =>
    Math.abs(band - rawPercent) < Math.abs(nearest - rawPercent) ? band : nearest
  );
};

const createProgressState = (category: ProductCategory): GenerationProgressState => ({
  status: 'running',
  percent: 0,
  startedAt: Date.now(),
  steps: getProgressSteps(category),
});

const createSeoOnlyResult = (
  textResult: SeoContentPack,
  productCategory: ProductCategory,
  color: string,
  fitType?: string,
  mrp?: string,
  availableSizes?: AvailableSizeRow[]
): GenerationResults => ({
  ...textResult,
  productCategory,
  color,
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
  const [productImageUris, setProductImageUris] = useState<{[key:string]: string}>({});
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
  const { toast } = useToast();

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: defaultProductFormValues,
  });

  useEffect(() => {
    let cancelled = false;

    const restoreDraft = async () => {
      const draft = await readWorkflowDraft();

      if (cancelled) {
        return;
      }

      if (draft?.formValues) {
        form.reset({
          ...defaultProductFormValues,
          ...draft.formValues,
        });
      }

      if (draft?.results) {
        setResults(draft.results);
      }

      if (draft?.productImageUris) {
        setProductImageUris(draft.productImageUris);
      }

      setDraftSavedAt(draft?.updatedAt);
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
    setGenerating({ all: true, frontView: false, sideView: false, backView: false, textureView: false, flatlay: false, heroView: false });
    setProgress(createProgressState(data.productCategory));
    setProductImageUris({});
    let lastStepId = 'prepare';
    let failedReason: string | undefined;

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
        return image;
      } catch (error) {
        markStepFailed(stepId, error);
        throw error;
      }
    };
    
    try {
      const uris: {[key: string]: string} = {};
      const allOptimized: OptimizedImage[] = [];

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

      markStepActive('prepare');
      const baseFlowInput: Partial<GenerateProductViewInput> = { 
        productCategory: data.productCategory,
        gender: data.gender,
        sleeveType: data.sleeveType,
        fabricType: data.fabricType,
        color: data.color,
        pattern: data.pattern,
        frontPocket: data.frontPocket,
        patternOverride: data.patternOverride,
        collarType: data.collarType,
        visibleLogo: data.visibleLogo,
        outputBackgroundStyle: data.outputBackgroundStyle,
        fitType: data.fitType,
        materialStretch: data.materialStretch,
        fragranceName: data.fragranceName,
        fragranceFamily: data.fragranceFamily,
        sizeMl: data.sizeMl,
      };

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
      markStepActive('details');
      markStepCompleted('details');
      markStepActive('accuracyLock');
      markStepCompleted('accuracyLock');
      markStepActive('studioConsistency');
      markStepCompleted('studioConsistency');

      // First, generate text and detect color
      markStepActive('seo');
      const textResult = await generateProductTitleDescription(baseFlowInput as GenerateProductViewInput);
      markStepCompleted('seo');
      markStepActive('color');
      const detectedColor = textResult.detectedColor;
      markStepCompleted('color');

      setResults(
        createSeoOnlyResult(
          textResult,
          data.productCategory,
          detectedColor,
          data.fitType,
          data.mrp?.trim(),
          data.availableSizes
        )
      );

      // Now prepare the input for image generation using the detected color
      const imageFlowInput: GenerateProductViewInput = {
        ...baseFlowInput,
        color: detectedColor,
      } as GenerateProductViewInput;


      if (data.productCategory === 'Trousers') {
        setGenerating((prev) => ({ ...prev, frontView: true, backView: true, textureView: true, flatlay: true }));
        await Promise.all([
          runImageStep('front', 'frontView', generateFrontView(imageFlowInput), (result) => result.frontView),
          runImageStep('back', 'backView', generateBackView(imageFlowInput), (result) => result.backView),
          runImageStep('texture', 'textureView', generateTextureView(imageFlowInput), (result) => result.textureView),
          runImageStep('flatlay', 'hdFlatlayImage', generateHdFlatlay(imageFlowInput), (result) => result.hdFlatlayImage),
        ]);

      } else if (data.productCategory === 'Perfume') {
        setGenerating((prev) => ({ ...prev, frontView: true, sideView: true, backView: true, heroView: true }));
        await Promise.all([
          runImageStep('front', 'frontView', generatePerfumeBottleFront(imageFlowInput), (result) => result.perfumeBottleFront),
          runImageStep('side', 'sideView', generatePerfumeBoxFront(imageFlowInput), (result) => result.perfumeBoxFront),
          runImageStep('back', 'backView', generatePerfumeBoxBack(imageFlowInput), (result) => result.perfumeBoxBack),
          runImageStep('hero', 'heroView', generatePerfumeHeroView(imageFlowInput), (result) => result.perfumeHeroView),
        ]);
      } else {
        setGenerating((prev) => ({ ...prev, frontView: true, sideView: true, backView: true, flatlay: true }));
        await Promise.all([
          runImageStep('front', 'frontView', generateFrontView(imageFlowInput), (result) => result.frontView),
          runImageStep('side', 'sideView', generateSideView(imageFlowInput), (result) => result.sideView),
          runImageStep('back', 'backView', generateBackView(imageFlowInput), (result) => result.backView),
          runImageStep('flatlay', 'hdFlatlayImage', generateHdFlatlay(imageFlowInput), (result) => result.hdFlatlayImage),
        ]);
      }

      markStepActive('finalizeSeo');
      markStepCompleted('finalizeSeo');
      markStepActive('export');
      markStepCompleted('export');
      markStepActive('done');
      markStepCompleted('done');
      incrementProductsGenerated();
    } catch (e) {
      console.error(e);
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
    const flowInput: GenerateProductViewInput = {
      productCategory: data.productCategory,
      gender: data.gender,
      sleeveType: data.sleeveType,
      fitType: data.fitType,
      materialStretch: data.materialStretch,
      fabricType: data.fabricType,
      pattern: data.pattern,
      frontPocket: data.frontPocket,
      patternOverride: data.patternOverride,
      collarType: data.collarType,
      visibleLogo: data.visibleLogo,
      outputBackgroundStyle: data.outputBackgroundStyle,
      fragranceFamily: data.fragranceFamily,
      fragranceName: data.fragranceName,
      sizeMl: data.sizeMl,
      color: results?.color || data.color,
      productImage: productImageUris.main,
      mainProductImage: productImageUris.main,
      openShirtImage: productImageUris.open,
      fabricCloseupImage: productImageUris.fabricCloseup,
      collarButtonCloseupImage: productImageUris.collarButton,
      pocketLogoDetailImage: productImageUris.pocketLogoDetail,
      backSideImage: productImageUris.shirtBack,
      productImageFront: productImageUris.front,
      productImageFabric: productImageUris.fabric,
      productImageBack: productImageUris.back,
      bottleImageUri: productImageUris.bottle,
      boxFrontImageUri: productImageUris.boxFront,
      boxBackImageUri: productImageUris.boxBack,
    };
    return flowInput;
  }

  const handleRegenerateFrontView = async () => {
    if (Object.keys(productImageUris).length === 0) return;
    setGenerating((prev) => ({ ...prev, frontView: true }));
    try {
      const flowInput = getFlowInputForRegen();
      const newResult = flowInput.productCategory === 'Perfume'
        ? { frontView: (await generatePerfumeBottleFront(flowInput)).perfumeBottleFront }
        : { frontView: (await generateFrontView(flowInput)).frontView };

      setResults((prev) => (prev ? { ...prev, ...newResult } : null));
       toast({ title: "Front View Regenerated", description: "The front view image has been updated." });
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Regeneration Failed', description: getSafeGenerationErrorMessage(e) });
    } finally {
      setGenerating((prev) => ({ ...prev, frontView: false }));
    }
  };

  const handleRegenerateSideView = async () => {
    if (Object.keys(productImageUris).length === 0) return;
    setGenerating((prev) => ({ ...prev, sideView: true }));
    try {
      const flowInput = getFlowInputForRegen();
      const newResult = flowInput.productCategory === 'Perfume'
        ? { sideView: (await generatePerfumeBoxFront(flowInput)).perfumeBoxFront }
        : { sideView: (await generateSideView(flowInput)).sideView };

      setResults((prev) => (prev ? { ...prev, ...newResult } : null));
       toast({ title: "Side View Regenerated", description: "The image has been updated." });
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Regeneration Failed', description: getSafeGenerationErrorMessage(e) });
    } finally {
      setGenerating((prev) => ({ ...prev, sideView: false }));
    }
  };

  const handleRegenerateBackView = async () => {
    if (Object.keys(productImageUris).length === 0) return;
    setGenerating((prev) => ({ ...prev, backView: true }));
    try {
      const flowInput = getFlowInputForRegen();
      const newResult = flowInput.productCategory === 'Perfume'
        ? { backView: (await generatePerfumeBoxBack(flowInput)).perfumeBoxBack }
        : { backView: (await generateBackView(flowInput)).backView };
      
      setResults((prev) => (prev ? { ...prev, ...newResult } : null));
       toast({ title: "Back View Regenerated", description: "The back view image has been updated." });
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Regeneration Failed', description: getSafeGenerationErrorMessage(e) });
    } finally {
      setGenerating((prev) => ({ ...prev, backView: false }));
    }
  };

  const handleRegenerateTextureView = async () => { // Only for trousers
    if (!productImageUris.fabric) return;
    setGenerating((prev) => ({ ...prev, textureView: true }));
    try {
      const result = await generateTextureView(getFlowInputForRegen());
      setResults((prev) => (prev ? { ...prev, ...result } : null));
      toast({ title: "Texture View Regenerated", description: "The texture image has been updated." });
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Regeneration Failed', description: getSafeGenerationErrorMessage(e) });
    } finally {
      setGenerating((prev) => ({ ...prev, textureView: false }));
    }
  };
  
  const handleRegenerateHeroView = async () => { // Only for perfume
    if (Object.keys(productImageUris).length === 0) return;
    setGenerating((prev) => ({ ...prev, heroView: true }));
    try {
      const result = await generatePerfumeHeroView(getFlowInputForRegen());
      setResults((prev) => (prev ? { ...prev, heroView: result.perfumeHeroView } : null));
      toast({ title: "Hero View Regenerated", description: "The image has been updated." });
    } catch (e) {
      console.error(e);
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
    setGenerating((prev) => ({ ...prev, flatlay: true }));
    try {
      const flatlay = await generateHdFlatlay(getFlowInputForRegen());
      setResults((prev) => prev ? { ...prev, hdFlatlayImage: flatlay.hdFlatlayImage } : null);
      toast({ title: "HD Flat Lay / Top View Regenerated", description: "The image has been updated." });
    } catch (e) {
      console.error(e);
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
      }
    />
  );

  const renderSection = () => {
    if (activeSection === 'studio') {
      return studioContent;
    }

    if (activeSection === 'products') {
      return <ProductHistory />;
    }

    if (activeSection === 'staff' && auth.role !== 'owner') {
      return <PlaceholderSection section="settings" />;
    }

    if (activeSection === 'settings') {
      return <CatalogDefaultsSettings role={auth.role} />;
    }

    return <PlaceholderSection section={activeSection} />;
  };

  return (
    <AppShell
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      userEmail={auth.email}
      userRole={auth.role}
      onLogout={() => {
        void auth.logout();
      }}
    >
      {renderSection()}
    </AppShell>
  );
}
