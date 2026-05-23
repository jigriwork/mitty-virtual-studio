'use client';

import { Package, Shirt, Sparkles } from 'lucide-react';
import JSZip from 'jszip';
import type { GenerationResults } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ImageCard, ImageCardSkeleton } from './image-card';
import { SeoPreviewPanel } from './seo-preview-panel';
import { Skeleton } from './ui/skeleton';

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
}: ResultsDisplayProps) {
  
  const handleDownloadAll = async () => {
    if (!results) return;

    const zip = new JSZip();
    const { productTitle, productDescription, frontView, sideView, backView, textureView, hdFlatlayImage, heroView, productCategory, color, fitType } = results;
    
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

    const addImageToZip = (dataUri: string, filename: string) => {
      const base64 = dataUri.split(',')[1];
      zip.file(filename, base64, { base64: true });
    };

    if (isPerfume) {
        if(frontView) addImageToZip(frontView, `${baseImageName} - Bottle Front.png`);
        if(sideView) addImageToZip(sideView, `${baseImageName} - Box Front.png`);
        if(backView) addImageToZip(backView, `${baseImageName} - Box Back.png`);
        if(heroView) addImageToZip(heroView, `${baseImageName} - Hero View.png`);
    } else {
        if(frontView) addImageToZip(frontView, `${baseImageName} - Front.png`);
        if(backView) addImageToZip(backView, `${baseImageName} - Back.png`);

        if (isTrousers && textureView) {
            addImageToZip(textureView, `${baseImageName} - Texture.png`);
        }
        if (sideView && !isTrousers) {
            addImageToZip(sideView, `${baseImageName} - Side.png`);
        }
        if (hdFlatlayImage) {
            addImageToZip(hdFlatlayImage, `${baseImageName} - ${isShoes ? 'Top' : 'Flat Lay'}.png`);
        }
    }
    
    const txtContent = `Product Title: ${productTitle}\n\nProduct Description:\n${productDescription}`;
    zip.file('Product_Info.txt', txtContent);

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(zipBlob);
    link.download = zipFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  if (loadingState.all) {
    return <LoadingSkeleton />;
  }
  
  if (!results) {
    return (
      <div className="grid gap-5">
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
        <Button onClick={handleDownloadAll} size="lg" disabled={!productTitle} className="h-11 bg-[#171717] text-white hover:bg-[#2a2a2a]">
            <Package className="mr-2 h-5 w-5" />
            Download All (.zip)
        </Button>
      </div>

      <SeoPreviewPanel results={results} />
        
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

const LoadingSkeleton = () => (
   <div className="grid gap-5">
      <Card className="border-black/10 bg-white/80 shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#171717] text-[#f4d99f]">
              <Sparkles className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#171717]">Generating studio assets</h2>
              <p className="text-sm text-muted-foreground">AI is creating copy and product views.</p>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <ImageCardSkeleton />
        <ImageCardSkeleton />
        <ImageCardSkeleton />
        <ImageCardSkeleton />
      </div>
    </div>
);
