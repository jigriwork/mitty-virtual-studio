import type { ReactNode } from 'react';
import { CheckCircle2, Clock3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { DashboardStats } from './dashboard-stats';

type StudioWorkspaceProps = {
  formPanel: ReactNode;
  resultsPanel: ReactNode;
  draftSavedAt?: number;
  draftReady?: boolean;
};

export function StudioWorkspace({ formPanel, resultsPanel, draftSavedAt, draftReady = false }: StudioWorkspaceProps) {
  const draftLabel = draftSavedAt
    ? `Draft saved ${new Date(draftSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : draftReady
      ? 'Draft ready'
      : 'Checking draft';

  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-5">
      <section className="overflow-hidden rounded-lg border border-black/10 bg-[#171717] text-white shadow-xl">
        <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-white/10 bg-white/10 text-[#f4d99f] hover:bg-white/10">
                Product asset studio
              </Badge>
              <Badge className="border-emerald-400/20 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/10">
                {draftReady ? <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> : <Clock3 className="mr-1 h-3.5 w-3.5" />}
                {draftLabel}
              </Badge>
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              MITTY Virtual Studio
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/68 sm:text-base">
              Upload a product. Generate model photos, packshots, and SEO copy.
            </p>
          </div>
        </div>
      </section>

      <DashboardStats />

      <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(360px,420px)_minmax(0,1fr)]">
        <Card className="min-w-0 border-black/10 bg-white/80 shadow-sm backdrop-blur">
          <CardContent className="p-0">{formPanel}</CardContent>
        </Card>
        <div className="min-w-0">{resultsPanel}</div>
      </div>
    </div>
  );
}
