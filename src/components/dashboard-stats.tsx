import { Archive, CheckCircle2, Clock3, Download } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const stats = [
  { label: 'Products Generated', value: '0', helper: 'Today', icon: Archive },
  { label: 'Pending Review', value: '0', helper: 'Queue', icon: Clock3 },
  { label: 'Approved Assets', value: '0', helper: 'Ready', icon: CheckCircle2 },
  { label: 'Exports', value: '0', helper: 'ZIP packs', icon: Download },
];

export function DashboardStats() {
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
