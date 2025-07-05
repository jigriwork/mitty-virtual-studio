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
import { MittyLogo } from '@/components/mitty-logo';
import { ProductForm } from '@/components/product-form';
import { ResultsDisplay } from '@/components/results-display';
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
};

export default function Home() {
  const [results, setResults] = useState<GenerationResults | null>(null);
  const [productImageUris, setProductImageUris] = useState<{[key:string]: string}>({});
  const [generating, setGenerating] = useState<GeneratingState>({
    all: false,
    frontView: false,
    sideView: false,
    backView: false,
    textureView: false,
    flatlay: false,
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
    },
  });

  const onSubmit = async (data: ProductFormValues) => {
    setGenerating({ all: true, frontView: true, sideView: true, backView: true, textureView: true, flatlay: true });
    setResults(null);
    setProductImageUris({});
    
    try {
      const uris: {[key: string]: string} = {};
      const flowInput: GenerateProductViewInput = { ...data, fitType: data.fitType || undefined };

      if (data.productCategory === 'Trousers') {
        const [frontUri, fabricUri, backUri] = await Promise.all([
          fileToDataUri(data.productImageFront[0]),
          fileToDataUri(data.productImageFabric[0]),
          fileToDataUri(data.productImageBack[0]),
        ]);
        uris.front = frontUri;
        uris.fabric = fabricUri;
        uris.back = backUri;
        flowInput.productImageFront = frontUri;
        flowInput.productImageFabric = fabricUri;
        flowInput.productImageBack = backUri;

        const [frontResult, backResult, textureResult, flatlayResult, textResult] = await Promise.all([
          generateFrontView(flowInput),
          generateBackView(flowInput),
          generateTextureView(flowInput),
          generateHdFlatlay(flowInput),
          generateProductTitleDescription(flowInput),
        ]);
        
        setResults({
          frontView: frontResult.frontView,
          backView: backResult.backView,
          textureView: textureResult.textureView,
          hdFlatlayImage: flatlayResult.hdFlatlayImage,
          productTitle: textResult.productTitle,
          productDescription: textResult.productDescription,
          productCategory: data.productCategory,
          color: data.color,
          fitType: data.fitType,
        });

      } else {
        const imageUri = await fileToDataUri(data.productImage[0]);
        uris.main = imageUri;
        flowInput.productImage = imageUri;
        
        const [frontResult, sideResult, backResult, flatlayResult, textResult] = await Promise.all([
          generateFrontView(flowInput),
          generateSideView(flowInput),
          generateBackView(flowInput),
          generateHdFlatlay(flowInput),
          generateProductTitleDescription(flowInput),
        ]);
        
        setResults({
          frontView: frontResult.frontView,
          sideView: sideResult.sideView,
          backView: backResult.backView,
          hdFlatlayImage: flatlayResult.hdFlatlayImage,
          productTitle: textResult.productTitle,
          productDescription: textResult.productDescription,
          productCategory: data.productCategory,
        });
      }
      setProductImageUris(uris);

    } catch (e) {
      console.error(e);
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description: 'An error occurred while generating assets. Please check the console and try again.',
      });
    } finally {
      setGenerating({ all: false, frontView: false, sideView: false, backView: false, textureView: false, flatlay: false });
    }
  };

  const getFlowInputForRegen = (): GenerateProductViewInput => {
    const data = form.getValues();
    return {
      ...data,
      fitType: data.fitType || undefined,
      productImage: productImageUris.main,
      productImageFront: productImageUris.front,
      productImageFabric: productImageUris.fabric,
      productImageBack: productImageUris.back,
    };
  }

  const handleRegenerateFrontView = async () => {
    if (Object.keys(productImageUris).length === 0) return;
    setGenerating((prev) => ({ ...prev, frontView: true }));
    try {
      const result = await generateFrontView(getFlowInputForRegen());
      setResults((prev) => (prev ? { ...prev, ...result } : null));
       toast({ title: "Front View Regenerated", description: "The front view image has been updated." });
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Regeneration Failed', description: 'Could not regenerate the front view image.' });
    } finally {
      setGenerating((prev) => ({ ...prev, frontView: false }));
    }
  };

  const handleRegenerateSideView = async () => {
    if (!productImageUris.main) return;
    setGenerating((prev) => ({ ...prev, sideView: true }));
    try {
      const result = await generateSideView(getFlowInputForRegen());
      setResults((prev) => (prev ? { ...prev, ...result } : null));
       toast({ title: "Side View Regenerated", description: "The side view image has been updated." });
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Regeneration Failed', description: 'Could not regenerate the side view image.' });
    } finally {
      setGenerating((prev) => ({ ...prev, sideView: false }));
    }
  };

  const handleRegenerateBackView = async () => {
    if (Object.keys(productImageUris).length === 0) return;
    setGenerating((prev) => ({ ...prev, backView: true }));
    try {
      const result = await generateBackView(getFlowInputForRegen());
      setResults((prev) => (prev ? { ...prev, ...result } : null));
       toast({ title: "Back View Regenerated", description: "The back view image has been updated." });
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Regeneration Failed', description: 'Could not regenerate the back view image.' });
    } finally {
      setGenerating((prev) => ({ ...prev, backView: false }));
    }
  };

  const handleRegenerateTextureView = async () => {
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

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans">
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6">
        <div className="flex items-center gap-2">
          <MittyLogo className="h-8 w-8 text-primary" />
          <h1 className="text-xl font-semibold text-foreground">MITTY Virtual Studio</h1>
        </div>
      </header>
      <main className="flex-1">
        <div className="grid md:grid-cols-[400px_1fr] lg:grid-cols-[450px_1fr]">
          <div className="relative flex h-full min-h-[calc(100vh_-_4rem)] flex-col border-r">
             <ProductForm form={form} onSubmit={onSubmit} isLoading={generating.all} />
          </div>
          <div className="flex flex-col">
            <ResultsDisplay 
              results={results} 
              loadingState={generating}
              onRegenerateFrontView={handleRegenerateFrontView}
              onRegenerateSideView={handleRegenerateSideView}
              onRegenerateBackView={handleRegenerateBackView}
              onRegenerateTextureView={handleRegenerateTextureView}
              onRegenerateFlatlay={handleRegenerateFlatlay}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
