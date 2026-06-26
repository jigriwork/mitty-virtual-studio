'use client';

import { Download, Loader2, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { upscaleForDownload } from '@/lib/image-upscaler';

interface ImageCardProps {
  title: string;
  imageSrc: string;
  isLoading: boolean;
  onRegenerate: () => void;
  fileName: string;
  badge?: string;
}

export function ImageCard({ title, imageSrc, isLoading, onRegenerate, fileName, badge }: ImageCardProps) {
  const [downloading, setDownloading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      // Upscale to HD (2048px) before download for e-commerce quality.
      const hdUri = await upscaleForDownload(imageSrc);
      const link = document.createElement('a');
      link.href = hdUri;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      // Fallback. Download original if upscale fails.
      const link = document.createElement('a');
      link.href = imageSrc;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <Card className="overflow-hidden border-black/10 bg-white shadow-sm transition-shadow duration-300 hover:shadow-lg">
        <CardHeader className="flex-row items-center justify-between gap-3 border-b border-black/10 px-4 py-3">
          <CardTitle className="min-w-0 truncate text-base font-medium text-[#171717]">{title}</CardTitle>
          {badge && (
            <Badge variant="outline" className="shrink-0 border-[#d8c39b] bg-[#fff8ea] text-[#8a6635]">
              {badge}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="relative aspect-square p-0">
          {isLoading ? (
            <div className="flex h-full items-center justify-center bg-muted">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="group h-full w-full cursor-zoom-in overflow-hidden text-left focus:outline-none focus:ring-2 focus:ring-[#8a6635] focus:ring-offset-2"
              aria-label={`Open large preview for ${title}`}
            >
              {/* Generated assets are data URIs; a native image avoids Next/Image warnings with huge base64 URLs. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageSrc} alt={title} className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]" />
              <span className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus:opacity-100">
                Click to preview
              </span>
            </button>
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
                <Button variant="ghost" size="icon" onClick={() => void handleDownload()} disabled={isLoading || downloading}>
                  {downloading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>{downloading ? 'Upscaling to HD…' : 'Download HD'}</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardFooter>
      </Card>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[94vh] w-[calc(100vw-1rem)] max-w-6xl gap-3 overflow-hidden bg-[#111111] p-3 text-white sm:p-4">
          <DialogHeader className="pr-8 text-left">
            <DialogTitle className="text-base text-white sm:text-lg">{title}</DialogTitle>
          </DialogHeader>
          <div className="flex min-h-0 items-center justify-center overflow-auto rounded-lg bg-black/40 p-2 sm:p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageSrc} alt={title} className="max-h-[70vh] w-auto max-w-full object-contain" />
          </div>
          <DialogFooter className="gap-2 sm:space-x-0">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="bg-white text-[#171717] hover:bg-white/90">
                Close
              </Button>
            </DialogClose>
            <Button type="button" onClick={() => void handleDownload()} disabled={downloading} className="bg-[#f4d99f] text-[#171717] hover:bg-[#e6c987]">
              {downloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              {downloading ? 'Preparing…' : 'Download'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
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
