'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { generateHdFlatlay } from '@/ai/flows/generate-hd-flatlay';
import { generateProductImages } from '@/ai/flows/generate-product-images';
import { generateProductTitleDescription } from '@/ai/flows/generate-product-title-description';
import { MittyLogo } from '@/components/mitty-logo';
import { ProductForm } from '@/components/product-form';
import { ResultsDisplay } from '@/components/results-display';
import { useToast } from '@/hooks/use-toast';
import type { GenerationResults, ProductFormValues } from '@/lib/types';
import { productFormSchema } from '@/lib/types';
import { fileToDataUri } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

type GeneratingState = {
  all: boolean;
  modelImages: boolean;
  flatlay: boolean;
};

export default function Home() {
  const [results, setResults] = useState<GenerationResults | null>(null);
  const [productImageUri, setProductImageUri] = useState<string | null>(null);
  const [generating, setGenerating] = useState<GeneratingState>({
    all: false,
    modelImages: false,
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
    },
  });

  const onSubmit = async (data: ProductFormValues) => {
    setGenerating({ all: true, modelImages: true, flatlay: true });
    setResults(null);
    try {
      const imageUri = await fileToDataUri(data.productImage[0]);
      setProductImageUri(imageUri);
      
      const flowInput = { ...data, productImage: imageUri };

      const [modelImages, flatlay, text] = await Promise.all([
        generateProductImages(flowInput),
        generateHdFlatlay({ productImage: imageUri }),
        generateProductTitleDescription(flowInput),
      ]);
      
      setResults({
        frontView: modelImages.frontView,
        sideView: modelImages.sideView,
        backView: modelImages.backView,
        hdFlatlayImage: flatlay.hdFlatlayImage,
        productTitle: text.productTitle,
        productDescription: text.productDescription,
      });

    } catch (e) {
      console.error(e);
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description: 'An error occurred while generating assets. Please check the console and try again.',
      });
    } finally {
      setGenerating({ all: false, modelImages: false, flatlay: false });
    }
  };

  const handleRegenerateModelImages = async () => {
    if (!productImageUri) return;
    setGenerating((prev) => ({ ...prev, modelImages: true }));
    try {
      const data = form.getValues();
      const flowInput = { ...data, productImage: productImageUri };
      const modelImages = await generateProductImages(flowInput);
      setResults((prev) => (prev ? { ...prev, ...modelImages } : null));
       toast({ title: "Model Images Regenerated", description: "The front, side, and back views have been updated." });
    } catch (e) {
      console.error(e);
      toast({
        variant: 'destructive',
        title: 'Regeneration Failed',
        description: 'Could not regenerate model images.',
      });
    } finally {
      setGenerating((prev) => ({ ...prev, modelImages: false }));
    }
  };

  const handleRegenerateFlatlay = async () => {
    if (!productImageUri) return;
    setGenerating((prev) => ({ ...prev, flatlay: true }));
    try {
      const flatlay = await generateHdFlatlay({ productImage: productImageUri });
      setResults((prev) => prev ? { ...prev, hdFlatlayImage: flatlay.hdFlatlayImage } : null);
      toast({ title: "HD Flat Lay Regenerated", description: "The flat lay image has been updated." });
    } catch (e) {
      console.error(e);
      toast({
        variant: 'destructive',
        title: 'Regeneration Failed',
        description: 'Could not regenerate the flat lay image.',
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
              onRegenerateModelImages={handleRegenerateModelImages}
              onRegenerateFlatlay={handleRegenerateFlatlay}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
