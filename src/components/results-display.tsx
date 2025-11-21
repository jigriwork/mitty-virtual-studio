'use client';

import { Download, Package, RefreshCw, Shirt } from 'lucide-react';
import JSZip from 'jszip';
import type { GenerationResults } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ImageCard, ImageCardSkeleton } from './image-card';
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
        addImageToZip(frontView, `${baseImageName} - Bottle Front.png`);
        if(sideView) addImageToZip(sideView, `${baseImageName} - Box Front.png`);
        addImageToZip(backView, `${baseImageName} - Box Back.png`);
        if(heroView) addImageToZip(heroView, `${baseImageName} - Hero View.png`);
    } else {
        addImageToZip(frontView, `${baseImageName} - Front.png`);
        addImageToZip(backView, `${baseImageName} - Back.png`);

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
      <div className="flex flex-col items-center justify-center h-full p-12 text-center bg-background">
        <div className="p-4 rounded-full bg-primary/10 mb-4">
          <Shirt className="h-12 w-12 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold text-foreground">Ready to Create?</h2>
        <p className="mt-2 text-muted-foreground">
          Fill out the product details on the left and click 'Generate' to see the magic happen.
        </p>
      </div>
    );
  }

  const { productTitle, productDescription, frontView, sideView, backView, textureView, hdFlatlayImage, heroView, productCategory, color, fitType } = results;
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
    <div className="p-6 bg-background h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <Card className="flex-1">
            <CardHeader>
              <CardTitle>Generated Details</CardTitle>
            </CardHeader>
            <CardContent>
              <h2 className="text-2xl font-bold font-headline text-foreground">{productTitle}</h2>
              <p className="mt-2 text-muted-foreground">{productDescription}</p>
            </CardContent>
          </Card>
          <Button onClick={handleDownloadAll} size="lg">
            <Package className="mr-2 h-5 w-5" />
            Download All (.zip)
          </Button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
          {isPerfume ? (
            <>
              <ImageCard
                title="Perfume Bottle - Front"
                imageSrc={frontView}
                isLoading={loadingState.frontView}
                onRegenerate={onRegenerateFrontView}
                fileName={`${baseImageName} - Bottle Front.png`}
              />
              {sideView && (
                <ImageCard
                  title="Perfume Box - Front"
                  imageSrc={sideView}
                  isLoading={loadingState.sideView}
                  onRegenerate={onRegenerateSideView}
                  fileName={`${baseImageName} - Box Front.png`}
                />
              )}
              <ImageCard
                title="Perfume Box - Back"
                imageSrc={backView}
                isLoading={loadingState.backView}
                onRegenerate={onRegenerateBackView}
                fileName={`${baseImageName} - Box Back.png`}
              />
              {heroView && (
                 <ImageCard
                  title="Bottle + Box Hero View"
                  imageSrc={heroView}
                  isLoading={loadingState.heroView}
                  onRegenerate={onRegenerateHeroView}
                  fileName={`${baseImageName} - Hero View.png`}
                />
              )}
            </>
          ) : (
            <>
              <ImageCard
                title="Front View"
                imageSrc={frontView}
                isLoading={loadingState.frontView}
                onRegenerate={onRegenerateFrontView}
                fileName={`${baseImageName} - Front.png`}
              />
              
              {isTrousers && textureView ? (
                <ImageCard
                  title="Material Texture"
                  imageSrc={textureView}
                  isLoading={loadingState.textureView}
                  onRegenerate={onRegenerateTextureView}
                  fileName={`${baseImageName} - Texture.png`}
                />
              ) : (
                sideView && <ImageCard
                  title="Side View"
                  imageSrc={sideView}
                  isLoading={loadingState.sideView}
                  onRegenerate={onRegenerateSideView}
                  fileName={`${baseImageName} - Side.png`}
                />
              )}

              <ImageCard
                title="Back View"
                imageSrc={backView}
                isLoading={loadingState.backView}
                onRegenerate={onRegenerateBackView}
                fileName={`${baseImageName} - Back.png`}
              />
              
              {hdFlatlayImage && (
                <ImageCard
                  title={isTrousers ? "Flat Lay" : (isShoes ? "Top View" : "HD Flat Lay")}
                  imageSrc={hdFlatlayImage}
                  isLoading={loadingState.flatlay}
                  onRegenerate={onRegenerateFlatlay}
                  fileName={`${baseImageName} - ${isTrousers ? 'Flat Lay' : (isShoes ? 'Top' : 'Flat Lay')}.png`}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const LoadingSkeleton = () => (
   <div className="p-6 bg-background h-full">
      <div className="max-w-4xl mx-auto animate-pulse">
         <div className="flex justify-between gap-4 mb-6">
          <div className="flex-1 space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-5/6" />
          </div>
          <Skeleton className="h-12 w-48 rounded-md" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <ImageCardSkeleton />
          <ImageCardSkeleton />
          <ImageCardSkeleton />
          <ImageCardSkeleton />
        </div>
      </div>
    </div>
);
