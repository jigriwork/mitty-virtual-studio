import { FileText, Tags } from 'lucide-react';
import type { ReactNode } from 'react';
import type { GenerationResults } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const SectionText = ({ label, children }: { label: string; children: ReactNode }) => (
  <div>
    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a6635]">{label}</p>
    <div className="mt-2 text-sm leading-6 text-muted-foreground">{children}</div>
  </div>
);

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
            SEO pack
          </Badge>
        </div>
        <p className="text-sm leading-6 text-muted-foreground">
          Review the generated ecommerce copy before downloading or publishing.
        </p>
      </CardHeader>
      <CardContent className="grid gap-5 p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <SectionText label="SEO Title">
            <p className="font-medium text-[#171717]">{results.seoTitle}</p>
          </SectionText>
          <SectionText label="Meta Title">
            <p>{results.metaTitle}</p>
          </SectionText>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a6635]">
            Product Title
          </p>
          <h3 className="mt-2 text-xl font-semibold leading-tight text-[#171717]">{results.productTitle}</h3>
        </div>

        <SectionText label="Short Description">
          <p>{results.shortDescription}</p>
        </SectionText>

        <Accordion type="multiple" defaultValue={['long-description', 'features']} className="rounded-lg border border-black/10">
          <AccordionItem value="long-description" className="border-black/10 px-4">
            <AccordionTrigger className="text-sm font-semibold text-[#171717] hover:no-underline">
              Long Description
            </AccordionTrigger>
            <AccordionContent>
              <p className="leading-6 text-muted-foreground">{results.longDescription}</p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="features" className="border-black/10 px-4">
            <AccordionTrigger className="text-sm font-semibold text-[#171717] hover:no-underline">
              Bullet Features
            </AccordionTrigger>
            <AccordionContent>
              <ul className="list-disc space-y-2 pl-5 leading-6 text-muted-foreground">
                {results.bulletFeatures.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="search" className="border-black/10 px-4">
            <AccordionTrigger className="text-sm font-semibold text-[#171717] hover:no-underline">
              Search Metadata
            </AccordionTrigger>
            <AccordionContent className="grid gap-4">
              <SectionText label="Meta Description">
                <p>{results.metaDescription}</p>
              </SectionText>
              <SectionText label="Slug">
                <code className="rounded bg-[#fbf8f1] px-2 py-1 text-xs text-[#171717]">{results.slug}</code>
              </SectionText>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="media" className="border-0 px-4">
            <AccordionTrigger className="text-sm font-semibold text-[#171717] hover:no-underline">
              Image Alt Texts
            </AccordionTrigger>
            <AccordionContent>
              <ul className="list-disc space-y-2 pl-5 leading-6 text-muted-foreground">
                {results.imageAltTexts.map((altText) => (
                  <li key={altText}>{altText}</li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <SectionText label="Category Tags">
          <div className="flex flex-wrap gap-2">
            {results.categoryTags.map((tag) => (
              <Badge key={tag} variant="outline" className="border-black/10 bg-white text-[#171717]">
                <Tags className="mr-1 h-3 w-3" />
                {tag}
              </Badge>
            ))}
          </div>
        </SectionText>

        <div className="rounded-lg border border-[#d8c39b] bg-[#fff8ea] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a6635]">
            Styling Suggestions
          </p>
          <p className="mt-2 text-sm leading-6 text-[#4f3d24]">{results.stylingSuggestions}</p>
        </div>
      </CardContent>
    </Card>
  );
}
