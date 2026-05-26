'use client';

export const WORKFLOW_METRICS_STORAGE_KEY = 'mitty-workflow-metrics';
export const WORKFLOW_METRICS_UPDATED_EVENT = 'mitty-workflow-metrics-updated';

export type WorkflowMetrics = {
  date: string;
  productsGenerated: number;
  zipExports: number;
};

const todayKey = () => new Date().toISOString().slice(0, 10);

export const getWorkflowMetrics = (): WorkflowMetrics => {
  const freshMetrics: WorkflowMetrics = {
    date: todayKey(),
    productsGenerated: 0,
    zipExports: 0,
  };

  if (typeof window === 'undefined') {
    return freshMetrics;
  }

  try {
    const stored = window.localStorage.getItem(WORKFLOW_METRICS_STORAGE_KEY);
    const parsed = stored ? (JSON.parse(stored) as WorkflowMetrics) : freshMetrics;

    if (parsed.date !== freshMetrics.date) {
      window.localStorage.setItem(WORKFLOW_METRICS_STORAGE_KEY, JSON.stringify(freshMetrics));
      return freshMetrics;
    }

    return {
      ...freshMetrics,
      ...parsed,
    };
  } catch {
    return freshMetrics;
  }
};

const saveWorkflowMetrics = (metrics: WorkflowMetrics) => {
  window.localStorage.setItem(WORKFLOW_METRICS_STORAGE_KEY, JSON.stringify(metrics));
  window.dispatchEvent(new Event(WORKFLOW_METRICS_UPDATED_EVENT));
};

export const incrementProductsGenerated = () => {
  if (typeof window === 'undefined') {
    return;
  }

  const metrics = getWorkflowMetrics();
  saveWorkflowMetrics({
    ...metrics,
    productsGenerated: metrics.productsGenerated + 1,
  });
};

export const incrementZipExports = () => {
  if (typeof window === 'undefined') {
    return;
  }

  const metrics = getWorkflowMetrics();
  saveWorkflowMetrics({
    ...metrics,
    zipExports: metrics.zipExports + 1,
  });
};
