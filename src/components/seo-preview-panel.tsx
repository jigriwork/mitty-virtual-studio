import { FileText } from 'lucide-react';
import type { GenerationResults } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function SeoPreviewPanel({ results }: { results: GenerationResults }) {
  return (
    <Card className="border-black/10 bg-white shadow-sm">
      <CardHeader className="space-y-3 border-b border-black/10 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#171717] text-[#f4d99f]">
              <FileText className="h-4 w-4" />
            </div>
            <CardTitle className="text-lg text-[#171717]">SEO Copy Preview</CardTitle>
          </div>
          <Badge variant="outline" className="border-[#d8c39b] bg-[#fff8ea] text-[#8a6635]">
            Basic metadata
          </Badge>
        </div>
        <p className="text-sm leading-6 text-muted-foreground">
          Current generation returns title and description. Full SEO packs arrive in a later phase.
        </p>
      </CardHeader>
      <CardContent className="grid gap-4 p-4 sm:p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a6635]">
            Product Title
          </p>
          <h3 className="mt-2 text-xl font-semibold leading-tight text-[#171717]">{results.productTitle}</h3>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a6635]">
            Product Description
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{results.productDescription}</p>
        </div>
      </CardContent>
    </Card>
  );
}
