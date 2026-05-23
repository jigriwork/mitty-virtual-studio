'use client';

import { useState } from 'react';
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
import { PlaceholderSection } from '@/components/placeholder-section';
import { ProductForm } from '@/components/product-form';
import { ResultsDisplay } from '@/components/results-display';
import { StudioWorkspace } from '@/components/studio-workspace';
import { useToast } from '@/hooks/use-toast';
import type { GenerationResults, ProductFormValues } from '@/lib/types';
import { productFormSchema } from '@/lib/types';
import { fileToDataUri } from '@/lib/utils';
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

export default function Home() {
  const [activeSection, setActiveSection] = useState<AppSection>('studio');
  const [results, setResults] = useState<GenerationResults | null>(null);
  const [productImageUris, setProductImageUris] = useState<{[key:string]: string}>({});
  const [generating, setGenerating] = useState<GeneratingState>({
    all: false,
    frontView: false,
    sideView: false,
    backView: false,
    textureView: false,
    flatlay: false,
    heroView: false,
  });
  const { toast } = useToast();

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      gender: 'Male',
      productCategory: 'Shirt',
      fabricType: '',
      color: '',
      pattern: '',
      sleeveType: 'Full Sleeve',
      fitType: '',
      materialStretch: 'No',
      fragranceName: '',
      fragranceFamily: '',
      sizeMl: '',
    },
  });

  const onSubmit = async (data: ProductFormValues) => {
    setGenerating({ all: true, frontView: true, sideView: true, backView: true, textureView: true, flatlay: true, heroView: true });
    setResults(null);
    setProductImageUris({});
    
    try {
      const uris: {[key: string]: string} = {};
      const getUploadedFile = (files: File[] | null | undefined, fieldName: string) => {
        const file = files?.[0];

        if (!file) {
          throw new Error(`${fieldName} is required.`);
        }

        return file;
      };
      const baseFlowInput: Partial<GenerateProductViewInput> = { 
        productCategory: data.productCategory,
        gender: data.gender,
        sleeveType: data.sleeveType,
        fabricType: data.fabricType,
        color: data.color,
        pattern: data.pattern,
        fitType: data.fitType,
        materialStretch: data.materialStretch,
        fragranceName: data.fragranceName,
        fragranceFamily: data.fragranceFamily,
        sizeMl: data.sizeMl,
      };

      if (data.productCategory === 'Trousers') {
        const [frontUri, fabricUri, backUri] = await Promise.all([
          fileToDataUri(getUploadedFile(data.productImageFront, 'Front view image')),
          fileToDataUri(getUploadedFile(data.productImageFabric, 'Fabric close-up image')),
          fileToDataUri(getUploadedFile(data.productImageBack, 'Back view image')),
        ]);
        uris.front = frontUri;
        uris.fabric = fabricUri;
        uris.back = backUri;
        baseFlowInput.productImageFront = frontUri;
        baseFlowInput.productImageFabric = fabricUri;
        baseFlowInput.productImageBack = backUri;
      } else if (data.productCategory === 'Perfume') {
        const [bottleUri, boxFrontUri, boxBackUri] = await Promise.all([
            fileToDataUri(getUploadedFile(data.bottleImageFile, 'Perfume bottle image')),
            fileToDataUri(getUploadedFile(data.boxFrontImageFile, 'Perfume box front image')),
            fileToDataUri(getUploadedFile(data.boxBackImageFile, 'Perfume box back image')),
        ]);
        uris.bottle = bottleUri;
        uris.boxFront = boxFrontUri;
        uris.boxBack = boxBackUri;
        baseFlowInput.bottleImageUri = bottleUri;
        baseFlowInput.boxFrontImageUri = boxFrontUri;
        baseFlowInput.boxBackImageUri = boxBackUri;
      } else {
        const imageUri = await fileToDataUri(getUploadedFile(data.productImage, 'Product image'));
        uris.main = imageUri;
        baseFlowInput.productImage = imageUri;
      }
      setProductImageUris(uris);

      // First, generate text and detect color
      const textResult = await generateProductTitleDescription(baseFlowInput as GenerateProductViewInput);
      const detectedColor = textResult.detectedColor;

      // Now prepare the input for image generation using the detected color
      const imageFlowInput: GenerateProductViewInput = {
        ...baseFlowInput,
        color: detectedColor,
      } as GenerateProductViewInput;


      if (data.productCategory === 'Trousers') {
        const [frontResult, backResult, textureResult, flatlayResult] = await Promise.all([
          generateFrontView(imageFlowInput),
          generateBackView(imageFlowInput),
          generateTextureView(imageFlowInput),
          generateHdFlatlay(imageFlowInput),
        ]);
        
        setResults({
          frontView: frontResult.frontView,
          backView: backResult.backView,
          textureView: textureResult.textureView,
          hdFlatlayImage: flatlayResult.hdFlatlayImage,
          productTitle: textResult.productTitle,
          productDescription: textResult.productDescription,
          productCategory: data.productCategory,
          color: detectedColor,
          fitType: data.fitType,
        });

      } else if (data.productCategory === 'Perfume') {
        // Individual calls with error handling for each
        let bottleFront = '', boxFront = '', boxBack = '', hero = '';
        
        try {
           const res = await generatePerfumeBottleFront(imageFlowInput);
           bottleFront = res.perfumeBottleFront;
        } catch (e) { console.error("Bottle Front Failed", e); }

        try {
           const res = await generatePerfumeBoxFront(imageFlowInput);
           boxFront = res.perfumeBoxFront;
        } catch (e) { console.error("Box Front Failed", e); }

        try {
           const res = await generatePerfumeBoxBack(imageFlowInput);
           boxBack = res.perfumeBoxBack;
        } catch (e) { console.error("Box Back Failed", e); }

        try {
           const res = await generatePerfumeHeroView(imageFlowInput);
           hero = res.perfumeHeroView;
        } catch (e) { console.error("Hero View Failed", e); }

        if (!bottleFront && !boxFront && !boxBack && !hero) {
            throw new Error("All perfume image generations failed.");
        }

        setResults({
            frontView: bottleFront, 
            sideView: boxFront,       
            backView: boxBack,         
            heroView: hero,           
            productTitle: textResult.productTitle,
            productDescription: textResult.productDescription,
            productCategory: data.productCategory,
            color: detectedColor,
        });
      } else {
        const [frontResult, sideResult, backResult, flatlayResult] = await Promise.all([
          generateFrontView(imageFlowInput),
          generateSideView(imageFlowInput),
          generateBackView(imageFlowInput),
          generateHdFlatlay(imageFlowInput),
        ]);
        
        setResults({
          frontView: frontResult.frontView,
          sideView: sideResult.sideView,
          backView: backResult.backView,
          hdFlatlayImage: flatlayResult.hdFlatlayImage,
          productTitle: textResult.productTitle,
          productDescription: textResult.productDescription,
          productCategory: data.productCategory,
          color: detectedColor,
        });
      }

    } catch (e) {
      console.error(e);
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description: 'An error occurred while generating assets. Please check the console and try again.',
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
      fragranceFamily: data.fragranceFamily,
      fragranceName: data.fragranceName,
      sizeMl: data.sizeMl,
      color: results?.color || data.color,
      productImage: productImageUris.main,
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
      toast({ variant: 'destructive', title: 'Regeneration Failed', description: 'Could not regenerate the front view image.' });
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
      toast({ variant: 'destructive', title: 'Regeneration Failed', description: 'Could not regenerate the image.' });
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
      toast({ variant: 'destructive', title: 'Regeneration Failed', description: 'Could not regenerate the back view image.' });
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
      toast({ variant: 'destructive', title: 'Regeneration Failed', description: 'Could not regenerate the texture view image.' });
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
        description: 'Could not regenerate the image.',
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
        description: 'Could not regenerate the image.',
      });
    } finally {
      setGenerating((prev) => ({ ...prev, flatlay: false }));
    }
  };

  const studioContent = (
    <StudioWorkspace
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
        />
      }
    />
  );

  const renderSection = () => {
    if (activeSection === 'studio' || activeSection === 'generate') {
      return studioContent;
    }

    return <PlaceholderSection section={activeSection} />;
  };

  return (
    <AppShell activeSection={activeSection} onSectionChange={setActiveSection}>
      {renderSection()}
    </AppShell>
  );
}
