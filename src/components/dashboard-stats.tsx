'use client';

import { Archive, CheckCircle2, Clock3, Download } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CATALOG_STORAGE_KEY, type SavedCatalogItem } from '@/lib/catalog';
import { readWorkflowDraft, WORKFLOW_DRAFT_UPDATED_EVENT } from '@/lib/workflow-draft';
import {
  getWorkflowMetrics,
  WORKFLOW_METRICS_UPDATED_EVENT,
} from '@/lib/workflow-metrics';

type DashboardSnapshot = {
  productsGenerated: number;
  pendingReview: number;
  approvedAssets: number;
  zipExports: number;
};

const readCatalogCount = () => {
  try {
    const stored = window.localStorage.getItem(CATALOG_STORAGE_KEY);
    const items = stored ? (JSON.parse(stored) as SavedCatalogItem[]) : [];
    return items.length;
  } catch {
    return 0;
  }
};

const getSnapshot = async (): Promise<DashboardSnapshot> => {
  const metrics = getWorkflowMetrics();
  const draft = await readWorkflowDraft();
  const hasCurrentGeneratedPack = Boolean(draft?.results);

  return {
    productsGenerated: Math.max(metrics.productsGenerated, hasCurrentGeneratedPack ? 1 : 0),
    pendingReview: hasCurrentGeneratedPack ? 1 : 0,
    approvedAssets: readCatalogCount(),
    zipExports: metrics.zipExports,
  };
};

export function DashboardStats() {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>({
    productsGenerated: 0,
    pendingReview: 0,
    approvedAssets: 0,
    zipExports: 0,
  });

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      const nextSnapshot = await getSnapshot();

      if (!cancelled) {
        setSnapshot(nextSnapshot);
      }
    };

    void refresh();

    const handleRefresh = () => {
      void refresh();
    };

    window.addEventListener('storage', handleRefresh);
    window.addEventListener('mitty-catalog-updated', handleRefresh);
    window.addEventListener(WORKFLOW_DRAFT_UPDATED_EVENT, handleRefresh);
    window.addEventListener(WORKFLOW_METRICS_UPDATED_EVENT, handleRefresh);

    return () => {
      cancelled = true;
      window.removeEventListener('storage', handleRefresh);
      window.removeEventListener('mitty-catalog-updated', handleRefresh);
      window.removeEventListener(WORKFLOW_DRAFT_UPDATED_EVENT, handleRefresh);
      window.removeEventListener(WORKFLOW_METRICS_UPDATED_EVENT, handleRefresh);
    };
  }, []);

  const stats = [
    { label: 'Products Generated', value: snapshot.productsGenerated, helper: 'Today', icon: Archive },
    { label: 'Pending Review', value: snapshot.pendingReview, helper: 'Current pack', icon: Clock3 },
    { label: 'Approved Assets', value: snapshot.approvedAssets, helper: 'Catalog saved', icon: CheckCircle2 },
    { label: 'Exports', value: snapshot.zipExports, helper: 'ZIP packs', icon: Download },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;

        return (
          <Card key={stat.label} className="border-black/10 bg-white/75 shadow-sm backdrop-blur">
            <CardContent className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <p className="truncate text-sm text-muted-foreground">{stat.label}</p>
                <div className="mt-1 flex items-baseline gap-2">
                  <p className="text-2xl font-semibold text-[#171717]">{stat.value}</p>
                  <span className="text-xs font-medium text-[#8a6635]">{stat.helper}</span>
                </div>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#171717] text-[#f4d99f]">
                <Icon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
