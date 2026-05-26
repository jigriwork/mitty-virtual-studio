'use client';

import { Download, Package, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  CATALOG_STORAGE_KEY,
  downloadCsv,
  exportMittyCatalogCsv,
  type SavedCatalogItem,
} from '@/lib/catalog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const readSavedProducts = () => {
  try {
    const stored = window.localStorage.getItem(CATALOG_STORAGE_KEY);
    return stored ? (JSON.parse(stored) as SavedCatalogItem[]) : [];
  } catch {
    return [];
  }
};

export function ProductHistory() {
  const [items, setItems] = useState<SavedCatalogItem[]>([]);

  useEffect(() => {
    setItems(readSavedProducts());

    const refresh = () => setItems(readSavedProducts());
    window.addEventListener('storage', refresh);
    window.addEventListener('mitty-catalog-updated', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('mitty-catalog-updated', refresh);
    };
  }, []);

  const removeItem = (id: string) => {
    setItems((prev) => {
      const next = prev.filter((item) => item.id !== id);
      window.localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event('mitty-catalog-updated'));
      return next;
    });
  };

  const clearItems = () => {
    setItems([]);
    window.localStorage.removeItem(CATALOG_STORAGE_KEY);
    window.dispatchEvent(new Event('mitty-catalog-updated'));
  };

  const downloadCatalog = () => {
    if (items.length > 0) {
      downloadCsv(exportMittyCatalogCsv(items));
    }
  };

  return (
    <section className="mx-auto grid max-w-5xl gap-4">
      <div className="flex flex-col gap-3 rounded-lg border border-black/10 bg-white/80 p-5 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-[#171717] text-[#f4d99f] hover:bg-[#171717]">Products</Badge>
            <Badge variant="outline">{items.length} saved</Badge>
          </div>
          <h2 className="mt-3 text-xl font-semibold text-[#171717]">Product History</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Product history, saved uploads, and generated asset libraries will appear here in a later release.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={downloadCatalog} disabled={items.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Download CSV
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={items.length === 0}>
                <Trash2 className="mr-2 h-4 w-4" />
                Clear
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear saved products?</AlertDialogTitle>
                <AlertDialogDescription>
                  This removes saved catalog products from this browser.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={clearItems}>Clear Products</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {items.length === 0 ? (
        <Card className="border-black/10 bg-white/70">
          <CardContent className="flex min-h-56 flex-col items-center justify-center p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-[#171717] text-[#f4d99f]">
              <Package className="h-6 w-6" />
            </div>
            <h3 className="mt-5 text-lg font-semibold text-[#171717]">No saved products yet</h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Save a generated product to the catalog and it will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {items.map((item) => (
            <Card key={item.id} className="border-black/10 bg-white/80">
              <CardContent className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#171717]">{item.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.productCode} / {item.skuBase} / {item.sizeRows.length} size row(s)
                  </p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {item.imageUrls.image1 ? 'Image URLs ready' : 'Image URLs missing'}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => removeItem(item.id)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
