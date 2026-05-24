'use client';

import { Download, Loader2, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
  badge?: string;
}

export function ImageCard({ title, imageSrc, isLoading, onRegenerate, fileName, badge }: ImageCardProps) {
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageSrc;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  return (
    <Card className="overflow-hidden border-black/10 bg-white shadow-sm transition-shadow duration-300 hover:shadow-lg">
      <CardHeader className="flex-row items-center justify-between gap-3 border-b border-black/10 px-4 py-3">
        <CardTitle className="min-w-0 truncate text-base font-medium text-[#171717]">{title}</CardTitle>
        {badge && (
          <Badge variant="outline" className="shrink-0 border-[#d8c39b] bg-[#fff8ea] text-[#8a6635]">
            {badge}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="p-0 aspect-square relative">
        {isLoading ? (
          <div className="flex items-center justify-center h-full bg-muted">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          // Generated assets are data URIs; a native image avoids Next/Image warnings with huge base64 URLs.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageSrc} alt={title} className="h-full w-full object-cover" />
        )}
      </CardContent>
      <CardFooter className="flex justify-end gap-2 bg-[#fbf8f1] p-2">
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
