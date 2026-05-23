import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { DashboardStats } from './dashboard-stats';

type StudioWorkspaceProps = {
  formPanel: ReactNode;
  resultsPanel: ReactNode;
};

export function StudioWorkspace({ formPanel, resultsPanel }: StudioWorkspaceProps) {
  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-5">
      <section className="overflow-hidden rounded-lg border border-black/10 bg-[#171717] text-white shadow-xl">
        <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="min-w-0">
            <Badge className="border-white/10 bg-white/10 text-[#f4d99f] hover:bg-white/10">
              Product asset studio
            </Badge>
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
