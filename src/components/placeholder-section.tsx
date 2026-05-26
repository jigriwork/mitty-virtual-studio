import { Clock3 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { AppSection } from './app-shell';

const copy: Record<Exclude<AppSection, 'studio' | 'generate'>, { title: string; body: string }> = {
  products: {
    title: 'Products',
    body: 'Product history, saved uploads, and generated asset libraries will appear here in a later release.',
  },
  review: {
    title: 'Review',
    body: 'Approval queues, regeneration requests, and publishing readiness checks will live here soon.',
  },
  settings: {
    title: 'Settings',
    body: 'Brand defaults, staff access, export preferences, and AI controls will be configured here soon.',
  },
  staff: {
    title: 'Staff Management',
    body: 'Staff Management — coming soon. Add staff users in Supabase Auth for now.',
  },
};

export function PlaceholderSection({ section }: { section: Exclude<AppSection, 'studio' | 'generate'> }) {
  const item = copy[section];

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-3xl items-center">
      <Card className="w-full border-black/10 bg-white/80 shadow-sm backdrop-blur">
        <CardContent className="p-8 text-center sm:p-10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-[#171717] text-[#f4d99f]">
            <Clock3 className="h-6 w-6" />
          </div>
          <h2 className="mt-6 text-2xl font-semibold text-[#171717]">{item.title}</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">{item.body}</p>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-[#8a6635]">
            Coming soon
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
