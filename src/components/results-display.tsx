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
    flatlay: boolean; 
  };
  onRegenerateFrontView: () => void;
  onRegenerateSideView: () => void;
  onRegenerateBackView: () => void;
  onRegenerateFlatlay: () => void;
}

export function ResultsDisplay({
  results,
  loadingState,
  onRegenerateFrontView,
  onRegenerateSideView,
  onRegenerateBackView,
  onRegenerateFlatlay,
}: ResultsDisplayProps) {
  
  const handleDownloadAll = async () => {
    if (!results) return;

    const zip = new JSZip();
    const { productTitle, productDescription, frontView, sideView, backView, hdFlatlayImage } = results;
    
    const shortTitle = productTitle
      .replace(/Mitty\s/i, '')
      .replace(/\sfor\s(Men|Women|Unisex)$/i, '')
      .replace(/\s+/g, ' ')
      .trim();

    const addImageToZip = (dataUri: string, filename: string) => {
      const base64 = dataUri.split(',')[1];
      zip.file(filename, base64, { base64: true });
    };

    addImageToZip(frontView, `${shortTitle} Front.png`);
    addImageToZip(sideView, `${shortTitle} Side.png`);
    addImageToZip(backView, `${shortTitle} Back.png`);
    addImageToZip(hdFlatlayImage, `${shortTitle} Flat Lay.png`);

    const txtContent = `Product Title: ${productTitle}\n\nProduct Description:\n${productDescription}`;
    zip.file('Product_Info.txt', txtContent);

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(zipBlob);
    link.download = `${productTitle}.zip`;
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

  const { productTitle, productDescription, frontView, sideView, backView, hdFlatlayImage } = results;

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
          <ImageCard
            title="Front View"
            imageSrc={frontView}
            isLoading={loadingState.frontView}
            onRegenerate={onRegenerateFrontView}
            fileName={`${productTitle} Front.png`}
          />
          <ImageCard
            title="Side View"
            imageSrc={sideView}
            isLoading={loadingState.sideView}
            onRegenerate={onRegenerateSideView}
            fileName={`${productTitle} Side.png`}
          />
          <ImageCard
            title="Back View"
            imageSrc={backView}
            isLoading={loadingState.backView}
            onRegenerate={onRegenerateBackView}
            fileName={`${productTitle} Back.png`}
          />
          <ImageCard
            title="HD Flat Lay"
            imageSrc={hdFlatlayImage}
            isLoading={loadingState.flatlay}
            onRegenerate={onRegenerateFlatlay}
            fileName={`${productTitle} Flat Lay.png`}
          />
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
