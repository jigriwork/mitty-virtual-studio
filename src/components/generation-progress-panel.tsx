'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Check, Clock, Loader2, RotateCcw } from 'lucide-react';
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
  const currentMessage = useMemo(() => {
    if (progress.status === 'failed') {
      return failedStep
        ? `${failedStep.label} failed: ${progress.failedReason || failedStep.error || 'Unknown generation error.'}`
        : progress.failedReason || 'Generation failed.';
    }

    if (progress.status === 'done') {
      return 'Done';
    }

    return activeStep ? `${activeStep.label}...` : 'Preparing generation...';
  }, [activeStep, failedStep, progress.failedReason, progress.status]);

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
          </div>
        </div>
        <Progress value={progress.percent} className="h-3 bg-[#eee5d2] [&>div]:bg-[#171717]" />
        <div className="rounded-lg border border-[#d8c39b] bg-[#fff8ea] p-3">
          <p className="text-base font-medium leading-6 text-[#4f3d24]">{currentMessage}</p>
          <p className="mt-2 text-sm leading-6 text-[#6f562f]">
            Image generation can take 1-3 minutes depending on product and model response.
            Please do not refresh this page while generation is running.
          </p>
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
          <Button onClick={onRetry} className="mt-4 h-11 bg-[#171717] text-white hover:bg-[#2a2a2a]">
            <RotateCcw className="mr-2 h-4 w-4" />
            Retry Generation
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
