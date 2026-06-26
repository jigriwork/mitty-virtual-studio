'use client';

import { Download, Loader2, Share2, Shirt } from 'lucide-react';
import { useState } from 'react';
import JSZip from 'jszip';
import type { GenerationProgressState, GenerationResults } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ImageCard } from './image-card';
import { SeoPreviewPanel } from './seo-preview-panel';
import { GenerationProgressPanel, StickyGenerationProgress } from './generation-progress-panel';
import { CatalogBuilder } from './catalog-builder';
import { upscaleToBlob } from '@/lib/image-upscaler';
import { downloadBlob, shareFileOrDownload } from '@/lib/file-actions';
import { incrementZipExports } from '@/lib/workflow-metrics';
import { getBrandName } from '@/lib/brand-profile';

interface ResultsDisplayProps {
  results: GenerationResults | null;
  loadingState: { 
    all: boolean; 
    frontView: boolean; 
    sideView: boolean;
    backView: boolean;
    textureView: boolean;
    flatlay: boolean; 
    heroView: boolean;
  };
  onRegenerateFrontView: () => void;
  onRegenerateSideView: () => void;
  onRegenerateBackView: () => void;
  onRegenerateTextureView: () => void;
  onRegenerateFlatlay: () => void;
  onRegenerateHeroView: () => void;
  progress: GenerationProgressState;
  onRetryGeneration: () => void;
}

export function ResultsDisplay({
  results,
  loadingState,
  onRegenerateFrontView,
  onRegenerateSideView,
  onRegenerateBackView,
  onRegenerateTextureView,
  onRegenerateFlatlay,
  onRegenerateHeroView,
  progress,
  onRetryGeneration,
}: ResultsDisplayProps) {
  const [zipping, setZipping] = useState(false);
  const brandName = getBrandName();
  
  const createProductZip = async () => {
    if (!results) return;

    const zip = new JSZip();
    const {
      seoTitle,
      productTitle,
      shortDescription,
      longDescription,
      productDescription,
      bulletFeatures,
      metaTitle,
      metaDescription,
      slug,
      imageAltTexts,
      categoryTags,
      stylingSuggestions,
      detectedColor,
      selectedColor,
      effectiveColor,
      isManualColor,
      frontView,
      sideView,
      backView,
      textureView,
      hdFlatlayImage,
      heroView,
      productCategory,
      gender = 'Male',
      color,
      fitType,
      mrp,
      availableSizes,
    } = results;
    
    const isTrousers = productCategory === 'Trousers';
    const isShoes = productCategory === 'Shoes';
    const isPerfume = productCategory === 'Perfume';
    
    let zipFileName = `${productTitle}.zip`;
    let baseImageName = productTitle
        .replace(/Mitty\s/i, '')
        .replace(/\sfor\s(Men|Women|Unisex)$/i, '')
        .replace(/\s+/g, ' ')
        .trim();
    
    if (isTrousers && color && fitType) {
      baseImageName = `Mitty ${color} ${fitType} Trousers`;
      zipFileName = `${baseImageName}.zip`;
    }

    const addImageToZip = async (dataUri: string, filename: string) => {
      try {
        const blob = await upscaleToBlob(dataUri);
        zip.file(filename, blob);
      } catch {
        // Fallback: use original data if upscale fails
        const base64 = dataUri.split(',')[1];
        zip.file(filename, base64, { base64: true });
      }
    };

    if (isPerfume) {
        if(frontView) await addImageToZip(frontView, `${baseImageName} - Bottle Front.png`);
        if(sideView) await addImageToZip(sideView, `${baseImageName} - Box Front.png`);
        if(backView) await addImageToZip(backView, `${baseImageName} - Box Back.png`);
        if(heroView) await addImageToZip(heroView, `${baseImageName} - Hero View.png`);
    } else {
        if(frontView) await addImageToZip(frontView, `${baseImageName} - Front.png`);
        if(backView) await addImageToZip(backView, `${baseImageName} - Back.png`);

        if (isTrousers && textureView) {
            await addImageToZip(textureView, `${baseImageName} - Texture.png`);
        }
        if (sideView && !isTrousers) {
            await addImageToZip(sideView, `${baseImageName} - Side.png`);
        }
        if (hdFlatlayImage) {
            await addImageToZip(hdFlatlayImage, `${baseImageName} - ${isShoes ? 'Top' : 'Flat Lay'}.png`);
        }
    }
    
    const txtContent = [
      `SEO Title: ${seoTitle}`,
      `Product Title: ${productTitle}`,
      `Gender/Target: ${gender}`,
      `MRP: ${mrp?.trim() ? `₹${mrp.trim()}` : 'Not provided'}`,
      `Available Sizes / Quantity:\n${availableSizes?.some((row) => row.size.trim() || row.quantity.trim())
        ? availableSizes
            .filter((row) => row.size.trim() || row.quantity.trim())
            .map((row) => `${row.size.trim() || 'Size not specified'} - ${row.quantity.trim() || '1'}`)
            .join('\n')
        : 'Not provided'}`,
      `Short Description: ${shortDescription}`,
      `Long Description:\n${longDescription || productDescription}`,
      `Bullet Features:\n${bulletFeatures.map((feature) => `- ${feature}`).join('\n')}`,
      `Meta Title: ${metaTitle}`,
      `Meta Description: ${metaDescription}`,
      `Slug: ${slug}`,
      `Image Alt Texts:\n${imageAltTexts.map((altText) => `- ${altText}`).join('\n')}`,
      `Category Tags:\n${categoryTags.map((tag) => `- ${tag}`).join('\n')}`,
      `Styling Suggestions:\n${stylingSuggestions}`,
      `Selected Color: ${isManualColor ? selectedColor || color || 'N/A' : 'Auto Detect'}`,
      `Detected Color: ${detectedColor || 'N/A'}`,
      `Final Color Used: ${effectiveColor || color || detectedColor || 'N/A'}`,
    ].join('\n\n');
    zip.file('Product_Info.txt', txtContent);

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    return { zipBlob, zipFileName, productTitle };
  };
  
  const handleDownloadAll = async () => {
    if (!results) return;
    setZipping(true);

    try {
      const zipResult = await createProductZip();
      if (zipResult) {
        downloadBlob(zipResult.zipBlob, zipResult.zipFileName);
        incrementZipExports();
      }
    } finally {
      setZipping(false);
    }
  };

  const handleShareAll = async () => {
    if (!results) return;
    setZipping(true);

    try {
      const zipResult = await createProductZip();
      if (zipResult) {
        await shareFileOrDownload({
          blob: zipResult.zipBlob,
          fileName: zipResult.zipFileName,
          title: zipResult.productTitle,
          text: `${brandName} product images and product details.`,
        });
        incrementZipExports();
      }
    } finally {
      setZipping(false);
    }
  };
  
  if (!results) {
    return (
      <div className="grid gap-5">
        <StickyGenerationProgress progress={progress} />
        {progress.status !== 'idle' && (
          <GenerationProgressPanel progress={progress} onRetry={onRetryGeneration} />
        )}
        <Card className="border-black/10 bg-white/80 shadow-sm backdrop-blur">
          <CardContent className="flex min-h-[460px] flex-col items-center justify-center p-8 text-center sm:p-12">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-[#171717] text-[#f4d99f]">
              <Shirt className="h-8 w-8" />
            </div>
            <Badge className="mt-6 bg-[#171717] text-[#f4d99f] hover:bg-[#171717]">
              Step 2
            </Badge>
            <h2 className="mt-4 text-2xl font-semibold text-[#171717]">AI Outputs Await</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Fill out the product details and generate model photos, packshots, and basic SEO copy for review.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { productTitle, frontView, sideView, backView, textureView, hdFlatlayImage, heroView, productCategory, color, fitType } = results;
  const isShoes = productCategory === 'Shoes';
  const isTrousers = productCategory === 'Trousers';
  const isPerfume = productCategory === 'Perfume';
  
  let baseImageName = productTitle
        .replace(/Mitty\s/i, '')
        .replace(/\sfor\s(Men|Women|Unisex)$/i, '')
        .replace(/\s+/g, ' ')
        .trim();
    
    if (isTrousers && color && fitType) {
      baseImageName = `Mitty ${color} ${fitType} Trousers`;
    }

  return (
    <div className="grid gap-5">
      <StickyGenerationProgress progress={progress} />
      {progress.status !== 'idle' && progress.status !== 'done' && (
        <GenerationProgressPanel progress={progress} onRetry={onRetryGeneration} />
      )}

      <div className="flex flex-col gap-4 rounded-lg border border-black/10 bg-white/80 p-4 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-[#171717] text-[#f4d99f] hover:bg-[#171717]">Review</Badge>
            <Badge variant="outline" className="border-[#d8c39b] bg-[#fff8ea] text-[#8a6635]">
              Review before publishing
            </Badge>
          </div>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[#171717]">Generated Output Review</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Regenerate individual views, download single assets, or export the full product pack.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:shrink-0 sm:flex-row sm:items-center sm:justify-end">
          <Button
            onClick={() => void handleDownloadAll()}
            size="lg"
            disabled={!productTitle || loadingState.all || zipping}
            className="h-11 w-full justify-center gap-2 rounded-md bg-[#171717] px-5 text-sm font-semibold text-white hover:bg-[#2a2a2a] sm:w-44"
          >
            {zipping ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : <Download className="h-4 w-4 shrink-0" />}
            <span>{zipping ? 'Preparing ZIP' : 'Download ZIP'}</span>
          </Button>
          <Button
            onClick={() => void handleShareAll()}
            variant="outline"
            size="lg"
            disabled={!productTitle || loadingState.all || zipping}
            className="h-11 w-full justify-center gap-2 rounded-md border-[#d8c39b] bg-white px-5 text-sm font-semibold text-[#171717] hover:bg-[#fff8ea] sm:w-36"
          >
            <Share2 className="h-4 w-4 shrink-0" />
            <span>Share ZIP</span>
          </Button>
        </div>
      </div>

      <SeoPreviewPanel results={results} />

      <CatalogBuilder results={results} />
        
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {isPerfume ? (
            <>
              {frontView && <ImageCard
                title="Perfume Bottle - Front"
                imageSrc={frontView}
                isLoading={loadingState.frontView}
                onRegenerate={onRegenerateFrontView}
                fileName={`${baseImageName} - Bottle Front.png`}
                badge="Bottle"
              />}
              {sideView && (
                <ImageCard
                  title="Perfume Box - Front"
                  imageSrc={sideView}
                  isLoading={loadingState.sideView}
                  onRegenerate={onRegenerateSideView}
                  fileName={`${baseImageName} - Box Front.png`}
                  badge="Box Front"
                />
              )}
              {backView && <ImageCard
                title="Perfume Box - Back"
                imageSrc={backView}
                isLoading={loadingState.backView}
                onRegenerate={onRegenerateBackView}
                fileName={`${baseImageName} - Box Back.png`}
                badge="Box Back"
              />}
              {heroView && (
                 <ImageCard
                  title="Bottle + Box Hero View"
                  imageSrc={heroView}
                  isLoading={loadingState.heroView}
                  onRegenerate={onRegenerateHeroView}
                  fileName={`${baseImageName} - Hero View.png`}
                  badge="Hero"
                />
              )}
            </>
          ) : (
            <>
              {frontView && <ImageCard
                title="Front View"
                imageSrc={frontView}
                isLoading={loadingState.frontView}
                onRegenerate={onRegenerateFrontView}
                fileName={`${baseImageName} - Front.png`}
                badge="Front"
              />}
              
              {isTrousers && textureView ? (
                <ImageCard
                  title="Material Texture"
                  imageSrc={textureView}
                  isLoading={loadingState.textureView}
                  onRegenerate={onRegenerateTextureView}
                  fileName={`${baseImageName} - Texture.png`}
                  badge="Texture"
                />
              ) : (
                sideView && <ImageCard
                  title="Side View"
                  imageSrc={sideView}
                  isLoading={loadingState.sideView}
                  onRegenerate={onRegenerateSideView}
                  fileName={`${baseImageName} - Side.png`}
                  badge="Side"
                />
              )}

              {backView && <ImageCard
                title="Back View"
                imageSrc={backView}
                isLoading={loadingState.backView}
                onRegenerate={onRegenerateBackView}
                fileName={`${baseImageName} - Back.png`}
                badge="Back"
              />}
              
              {hdFlatlayImage && (
                <ImageCard
                  title={isTrousers ? "Flat Lay" : (isShoes ? "Top View" : "HD Flat Lay")}
                  imageSrc={hdFlatlayImage}
                  isLoading={loadingState.flatlay}
                  onRegenerate={onRegenerateFlatlay}
                  fileName={`${baseImageName} - ${isTrousers ? 'Flat Lay' : (isShoes ? 'Top' : 'Flat Lay')}.png`}
                  badge={isShoes ? 'Top' : 'Flatlay'}
                />
              )}
            </>
          )}
      </div>
    </div>
  );
}
