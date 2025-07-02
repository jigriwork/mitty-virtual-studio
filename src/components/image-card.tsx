'use client';

import { Download, Loader2, RefreshCw } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface ImageCardProps {
  title: string;
  imageSrc: string;
  isLoading: boolean;
  onRegenerate: () => void;
  fileName: string;
}

export function ImageCard({ title, imageSrc, isLoading, onRegenerate, fileName }: ImageCardProps) {
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageSrc;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  return (
    <Card className="overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="flex-row items-center justify-between py-3 px-4 border-b">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0 aspect-square relative">
        {isLoading ? (
          <div className="flex items-center justify-center h-full bg-muted">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Image src={imageSrc} alt={title} layout="fill" objectFit="cover" />
        )}
      </CardContent>
      <CardFooter className="p-2 bg-muted/50 flex justify-end gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onRegenerate} disabled={isLoading}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Regenerate</p></TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleDownload} disabled={isLoading}>
                <Download className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Download</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </CardFooter>
    </Card>
  );
}

export const ImageCardSkeleton = () => (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-center justify-between py-3 px-4 border-b">
        <Skeleton className="h-5 w-24" />
      </CardHeader>
      <CardContent className="p-0 aspect-square">
        <Skeleton className="h-full w-full" />
      </CardContent>
      <CardFooter className="p-2 bg-muted/50 flex justify-end gap-2">
        <Skeleton className="h-9 w-9 rounded-md" />
        <Skeleton className="h-9 w-9 rounded-md" />
      </CardFooter>
    </Card>
);
