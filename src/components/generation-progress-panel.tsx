'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Check, Clock, Images, Loader2, RotateCcw } from 'lucide-react';
import type { GenerationProgressState } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

const formatElapsed = (seconds: number) => {
  if (seconds < 60) {
    return `${seconds} seconds`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes} min ${remainingSeconds} sec`;
};

export function GenerationProgressPanel({
  progress,
  onRetry,
}: {
  progress: GenerationProgressState;
  onRetry: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (progress.status !== 'running') {
      setNow(Date.now());
      return;
    }

    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [progress.status]);

  const elapsedSeconds = progress.startedAt
    ? Math.max(0, Math.floor(((progress.completedAt ?? now) - progress.startedAt) / 1000))
    : 0;
  const activeStep = progress.steps.find((step) => step.id === progress.currentStepId);
  const failedStep = progress.steps.find((step) => step.id === progress.failedStepId);
  const completedImageText = typeof progress.imageTotal === 'number' && progress.imageTotal > 0
    ? `${progress.imageCompleted || 0} of ${progress.imageTotal} images completed`
    : '';
  const currentMessage = useMemo(() => {
    if (progress.status === 'failed') {
      return failedStep
        ? `${failedStep.label} failed: ${progress.failedReason || failedStep.error || 'Unknown generation error.'}`
        : progress.failedReason || 'Generation failed.';
    }

    if (progress.status === 'partial') {
      return progress.summaryMessage || 'Some images were generated, but a few views failed.';
    }

    if (progress.status === 'done') {
      return 'Done. Your generated assets are ready to review.';
    }

    return activeStep ? `${activeStep.label}...` : 'Preparing generation...';
  }, [activeStep, failedStep, progress.failedReason, progress.status, progress.summaryMessage]);
  const statusTone = progress.status === 'failed'
    ? 'border-red-200 bg-red-50 text-red-900'
    : progress.status === 'partial'
      ? 'border-amber-200 bg-amber-50 text-amber-900'
      : progress.status === 'done'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
        : 'border-[#d8c39b] bg-[#fff8ea] text-[#4f3d24]';

  return (
    <Card className="border-black/10 bg-white shadow-sm">
      <CardHeader className="space-y-4 border-b border-black/10 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Badge className="bg-[#171717] text-[#f4d99f] hover:bg-[#171717]">
              Generation Progress
            </Badge>
            <CardTitle className="mt-3 text-xl text-[#171717]">Creating product assets</CardTitle>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-3xl font-semibold text-[#171717]">{progress.percent}%</p>
            <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground sm:justify-end">
              <Clock className="h-4 w-4" />
              Working for {formatElapsed(elapsedSeconds)}
            </p>
            {completedImageText && (
              <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground sm:justify-end">
                <Images className="h-4 w-4" />
                {completedImageText}
              </p>
            )}
          </div>
        </div>
        <Progress value={progress.percent} className="h-3 bg-[#eee5d2] [&>div]:bg-[#171717]" />
        <div className={`rounded-lg border p-3 ${statusTone}`}>
          <p className="text-base font-medium leading-6">{currentMessage}</p>
          <p className="mt-2 text-sm leading-6 opacity-85">
            Image generation can take some time. Please keep this tab open.
          </p>
          {progress.status === 'partial' && (
            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <ViewList label="Generated" views={progress.succeededViews || []} />
              <ViewList label="Needs retry" views={progress.failedViews || []} />
            </div>
          )}
          {elapsedSeconds >= 60 && elapsedSeconds < 120 && progress.status === 'running' && (
            <p className="mt-2 text-sm font-medium text-[#8a6635]">
              Still working. AI image generation may take longer for high-detail products.
            </p>
          )}
          {elapsedSeconds >= 120 && progress.status === 'running' && (
            <p className="mt-2 text-sm font-medium text-[#8a6635]">
              Still processing. If this takes too long, wait or retry with a smaller image.
            </p>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-5">
        <ol className="grid gap-3">
          {progress.steps.map((step) => (
            <li
              key={step.id}
              className="flex gap-3 rounded-lg border border-black/10 bg-white p-3"
            >
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-black/10 bg-[#fbf8f1]">
                {step.status === 'completed' && <Check className="h-4 w-4 text-green-700" />}
                {step.status === 'active' && <Loader2 className="h-4 w-4 animate-spin text-[#8a6635]" />}
                {step.status === 'failed' && <AlertCircle className="h-4 w-4 text-red-700" />}
                {step.status === 'pending' && <span className="h-2 w-2 rounded-full bg-muted-foreground/50" />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium leading-6 text-[#171717]">{step.label}</p>
                {step.error && <p className="text-sm leading-6 text-red-700">{step.error}</p>}
              </div>
            </li>
          ))}
        </ol>
        {progress.status === 'failed' && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-sm leading-6 text-red-900">
              The generation stopped before all assets were ready. Your form data is still here, so you can retry after checking the images and required fields.
            </p>
            <Button onClick={onRetry} className="mt-3 h-11 bg-[#171717] text-white hover:bg-[#2a2a2a]">
              <RotateCcw className="mr-2 h-4 w-4" />
              Retry Generation
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function StickyGenerationProgress({ progress }: { progress: GenerationProgressState }) {
  const activeStep = progress.steps.find((step) => step.id === progress.currentStepId);
  const imageText = typeof progress.imageTotal === 'number' && progress.imageTotal > 0
    ? `${progress.imageCompleted || 0}/${progress.imageTotal} images`
    : 'Preparing images';

  if (progress.status !== 'running') {
    return null;
  }

  return (
    <div className="fixed inset-x-3 bottom-20 z-50 mx-auto max-w-4xl rounded-lg border border-black/10 bg-white/95 p-3 shadow-2xl backdrop-blur md:bottom-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#171717]">
            {activeStep ? activeStep.label : 'Preparing generation'}
          </p>
          <p className="text-xs text-muted-foreground">Do not close this tab.</p>
        </div>
        <div className="flex shrink-0 items-center gap-3 text-sm">
          <span className="font-semibold text-[#171717]">{progress.percent}%</span>
          <span className="rounded-full border border-[#d8c39b] bg-[#fff8ea] px-2 py-1 text-xs text-[#6f562f]">
            {imageText}
          </span>
        </div>
      </div>
      <Progress value={progress.percent} className="mt-3 h-2 bg-[#eee5d2] [&>div]:bg-[#171717]" />
    </div>
  );
}

function ViewList({ label, views }: { label: string; views: string[] }) {
  return (
    <div className="rounded-md border border-current/15 bg-white/50 p-2">
      <p className="font-medium">{label}</p>
      <p className="mt-1 opacity-80">{views.length > 0 ? views.join(', ') : 'None yet'}</p>
    </div>
  );
}
