'use client';

import { Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { useWatch } from 'react-hook-form';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import type { ProductFormValues } from '@/lib/types';
import { FileUpload } from './file-upload';

interface ProductFormProps {
  form: UseFormReturn<ProductFormValues>;
  onSubmit: (data: ProductFormValues) => void;
  isLoading: boolean;
}

const LAST_AVAILABLE_SIZES_STORAGE_KEY = 'mitty-last-available-sizes';

export function ProductForm({ form, onSubmit, isLoading }: ProductFormProps) {
  const productCategory = useWatch({ control: form.control, name: 'productCategory' });
  const watchedAvailableSizes = useWatch({ control: form.control, name: 'availableSizes' });
  const availableSizes = useMemo(() => watchedAvailableSizes || [], [watchedAvailableSizes]);
  const [loadedLastSizes, setLoadedLastSizes] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(LAST_AVAILABLE_SIZES_STORAGE_KEY);
      const parsed = stored ? (JSON.parse(stored) as ProductFormValues['availableSizes']) : [];
      const currentSizes = form.getValues('availableSizes') || [];

      if (parsed?.length && currentSizes.length === 0) {
        form.setValue('availableSizes', parsed, { shouldValidate: true });
      }
    } catch {
      // Ignore invalid saved workflow helpers.
    } finally {
      setLoadedLastSizes(true);
    }
    // Run only once on mount so current edits are not overwritten.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loadedLastSizes) {
      return;
    }

    const rowsToSave = availableSizes.filter((row) => row.size.trim() || row.quantity.trim());
    window.localStorage.setItem(LAST_AVAILABLE_SIZES_STORAGE_KEY, JSON.stringify(rowsToSave));
  }, [availableSizes, loadedLastSizes]);

  const updateAvailableSize = (id: string, patch: { size?: string; quantity?: string }) => {
    form.setValue(
      'availableSizes',
      availableSizes.map((row) => (row.id === id ? { ...row, ...patch } : row)),
      { shouldValidate: true }
    );
  };

  const addAvailableSize = (size = '', quantity = '1') => {
    form.setValue(
      'availableSizes',
      [...availableSizes, { id: crypto.randomUUID(), size, quantity }],
      { shouldValidate: true }
    );
  };

  const addCommonSizes = (sizes: string[]) => {
    const existingSizes = new Set(availableSizes.map((row) => row.size.trim()).filter(Boolean));
    const rowsToAdd = sizes
      .filter((size) => !existingSizes.has(size))
      .map((size) => ({ id: crypto.randomUUID(), size, quantity: '1' }));

    if (rowsToAdd.length > 0) {
      form.setValue('availableSizes', [...availableSizes, ...rowsToAdd], { shouldValidate: true });
    }
  };

  const removeAvailableSize = (id: string) => {
    form.setValue(
      'availableSizes',
      availableSizes.filter((row) => row.id !== id),
      { shouldValidate: true }
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col">
        <div className="border-b border-black/10 p-4 sm:p-5">
          <Badge variant="outline" className="border-[#d8c39b] bg-[#fff8ea] text-[#8a6635]">
            Step 1
          </Badge>
          <h2 className="mt-3 text-xl font-semibold text-[#171717]">Create Product Pack</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Add catalog data once, then generate images, ZIP files, and catalog rows from the same workflow.
          </p>
        </div>
        <div className="space-y-6 p-4 sm:p-5">
            <section className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a6635]">
                  Category
                </p>
                <p className="mt-1 text-sm text-muted-foreground">Select the generation recipe.</p>
              </div>
            <FormField
              control={form.control}
              name="productCategory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Shirt">Shirt</SelectItem>
                      <SelectItem value="Trousers">Trousers</SelectItem>
                      <SelectItem value="Jeans">Jeans</SelectItem>
                      <SelectItem value="Shoes">Shoes</SelectItem>
                      <SelectItem value="Perfume">Perfume</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            </section>

            <section className="space-y-4 rounded-lg border border-black/10 bg-white p-4 shadow-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a6635]">
                  Catalog Pricing
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Optional pricing used later for downloads and catalog export.
                </p>
              </div>
              <FormField
                control={form.control}
                name="mrp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>MRP</FormLabel>
                    <FormControl>
                      <Input inputMode="decimal" placeholder="e.g., 1499" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </section>

            <section className="space-y-4 rounded-lg border border-black/10 bg-white p-4 shadow-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a6635]">
                  Available Sizes / Quantity
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add all available sizes and quantity. This will be included in ZIP and catalog CSV.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => addAvailableSize()}>
                  Add Size
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => addCommonSizes(['38', '40', '42', '44'])}>
                  Add 38-44
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => addCommonSizes(['28', '30', '32', '34', '36', '38', '40'])}>
                  Add 28-40
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => addCommonSizes(['38', '40', '42', '44', '46', '48', '50', '52', '54', '56', '58', '60'])}>
                  Add 38-60
                </Button>
              </div>
              {availableSizes.length > 0 && (
                <div className="grid gap-2">
                  {availableSizes.map((row) => (
                    <div key={row.id} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.5rem] gap-2">
                      <Input
                        placeholder="Size"
                        value={row.size}
                        onChange={(event) => updateAvailableSize(row.id, { size: event.target.value })}
                      />
                      <Input
                        inputMode="numeric"
                        placeholder="Quantity"
                        value={row.quantity}
                        onChange={(event) => updateAvailableSize(row.id, { quantity: event.target.value })}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removeAvailableSize(row.id)}
                        aria-label="Remove available size"
                      >
                        X
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-4 rounded-lg border border-black/10 bg-[#fbf8f1] p-4 shadow-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a6635]">
                  Product Details
                </p>
                <p className="mt-1 text-sm text-muted-foreground">These fields guide the AI output and SEO copy.</p>
              </div>
            {productCategory !== 'Perfume' && (
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
             {productCategory === 'Perfume' && (
              <>
                 <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select target audience" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Male">Men</SelectItem>
                          <SelectItem value="Female">Women</SelectItem>
                          <SelectItem value="Unisex">Unisex</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="fragranceName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fragrance Name (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Midnight Bloom, Ocean Breeze" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="fragranceFamily"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fragrance Family</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Citrus, Woody, Oriental, Fresh" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sizeMl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Size (ml)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 50 ml, 100 ml" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
            
            {productCategory === 'Shirt' && (
              <>
                <FormField
                  control={form.control}
                  name="sleeveType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sleeve Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select sleeve type" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Full Sleeve">Full Sleeve</SelectItem>
                          <SelectItem value="Half Sleeve">Half Sleeve</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Accordion type="single" collapsible className="rounded-lg border border-black/10 bg-white px-4">
                  <AccordionItem value="accuracy-lock" className="border-0">
                    <AccordionTrigger className="py-4 text-sm font-semibold text-[#171717] hover:no-underline">
                      Product Accuracy Lock
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4">
                      <p className="text-sm leading-6 text-muted-foreground">
                        Optional controls for pockets, logo visibility, pattern, collar, and studio background. Auto Detect works for most products.
                      </p>
                      <FormField
                        control={form.control}
                        name="frontPocket"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Front Pocket</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger><SelectValue placeholder="Auto Detect" /></SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Auto Detect">Auto Detect</SelectItem>
                                <SelectItem value="Yes">Yes</SelectItem>
                                <SelectItem value="No">No</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="patternOverride"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pattern Override</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger><SelectValue placeholder="Auto Detect" /></SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Auto Detect">Auto Detect</SelectItem>
                                <SelectItem value="Plain">Plain</SelectItem>
                                <SelectItem value="Printed">Printed</SelectItem>
                                <SelectItem value="Checked">Checked</SelectItem>
                                <SelectItem value="Striped">Striped</SelectItem>
                                <SelectItem value="Textured">Textured</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="collarType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Collar Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger><SelectValue placeholder="Auto Detect" /></SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Auto Detect">Auto Detect</SelectItem>
                                <SelectItem value="Spread Collar">Spread Collar</SelectItem>
                                <SelectItem value="Button Down">Button Down</SelectItem>
                                <SelectItem value="Mandarin">Mandarin</SelectItem>
                                <SelectItem value="Cuban/Open Collar">Cuban/Open Collar</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="visibleLogo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Visible Logo on Worn Shirt</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger><SelectValue placeholder="Auto Detect" /></SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Auto Detect">Auto Detect</SelectItem>
                                <SelectItem value="No visible logo">No visible logo</SelectItem>
                                <SelectItem value="Small chest logo">Small chest logo</SelectItem>
                                <SelectItem value="Label/tag only">Label/tag only</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="outputBackgroundStyle"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Output Background Style</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger><SelectValue placeholder="Clean Light Grey Studio" /></SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Clean Light Grey Studio">Clean Light Grey Studio</SelectItem>
                                <SelectItem value="Clean Off-White Studio">Clean Off-White Studio</SelectItem>
                                <SelectItem value="Transparent/Isolated Product Style later">Transparent/Isolated Product Style later</SelectItem>
                                <SelectItem value="Premium Beige Studio">Premium Beige Studio</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </>
            )}
             {productCategory === 'Trousers' && (
              <>
                <FormField
                  control={form.control}
                  name="fitType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fit Type</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Slim, Regular, Skinny" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                   control={form.control}
                   name="materialStretch"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Material Stretch</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Is the material stretchable?" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Yes">Yes</SelectItem>
                          <SelectItem value="No">No</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                   )}
                 />
                <Accordion type="single" collapsible className="rounded-lg border border-black/10 bg-white px-4">
                  <AccordionItem value="trouser-accuracy-lock" className="border-0">
                    <AccordionTrigger className="py-4 text-sm font-semibold text-[#171717] hover:no-underline">
                      Trouser Accuracy Lock
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4">
                      <p className="text-sm leading-6 text-muted-foreground">
                        Use these when AI changes pockets, logo, closure, pleats, crease, or fit.
                      </p>
                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="trouserFrontPocketType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Front Pocket Type</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger><SelectValue placeholder="Auto Detect" /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="Auto Detect">Auto Detect</SelectItem>
                                  <SelectItem value="Slant Side Pockets">Slant Side Pockets</SelectItem>
                                  <SelectItem value="Straight Side Pockets">Straight Side Pockets</SelectItem>
                                  <SelectItem value="No Visible Front Pockets">No Visible Front Pockets</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="trouserBackPocketType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Back Pocket Type</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger><SelectValue placeholder="Auto Detect" /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="Auto Detect">Auto Detect</SelectItem>
                                  <SelectItem value="Two Welt Pockets With Buttons">Two Welt Pockets With Buttons</SelectItem>
                                  <SelectItem value="Two Welt Pockets No Buttons">Two Welt Pockets No Buttons</SelectItem>
                                  <SelectItem value="One Back Pocket">One Back Pocket</SelectItem>
                                  <SelectItem value="No Back Pockets">No Back Pockets</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="trouserVisibleLogo"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Visible Logo on Worn Trouser</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger><SelectValue placeholder="Auto Detect" /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="Auto Detect">Auto Detect</SelectItem>
                                  <SelectItem value="No visible logo">No visible logo</SelectItem>
                                  <SelectItem value="Tag only">Tag only</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="trouserFrontStyle"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Front Style</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger><SelectValue placeholder="Auto Detect" /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="Auto Detect">Auto Detect</SelectItem>
                                  <SelectItem value="Flat Front">Flat Front</SelectItem>
                                  <SelectItem value="Single Pleat">Single Pleat</SelectItem>
                                  <SelectItem value="Double Pleat">Double Pleat</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="trouserCrease"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Crease</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger><SelectValue placeholder="Auto Detect" /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="Auto Detect">Auto Detect</SelectItem>
                                  <SelectItem value="Visible Center Crease">Visible Center Crease</SelectItem>
                                  <SelectItem value="No Visible Crease">No Visible Crease</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="trouserFit"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Fit</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger><SelectValue placeholder="Auto Detect" /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="Auto Detect">Auto Detect</SelectItem>
                                  <SelectItem value="Slim Fit">Slim Fit</SelectItem>
                                  <SelectItem value="Regular Fit">Regular Fit</SelectItem>
                                  <SelectItem value="Relaxed Fit">Relaxed Fit</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="trouserFabricFinish"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Fabric Finish</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger><SelectValue placeholder="Auto Detect" /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="Auto Detect">Auto Detect</SelectItem>
                                  <SelectItem value="Fine Woven">Fine Woven</SelectItem>
                                  <SelectItem value="Smooth Formal">Smooth Formal</SelectItem>
                                  <SelectItem value="Lycra Blend Look">Lycra Blend Look</SelectItem>
                                  <SelectItem value="Textured Weave">Textured Weave</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="trouserTagBrandingVisibility"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tag / Branding Visibility</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger><SelectValue placeholder="Auto Detect" /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="Auto Detect">Auto Detect</SelectItem>
                                  <SelectItem value="No visible tags or branding anywhere">No visible tags or branding anywhere</SelectItem>
                                  <SelectItem value="Show only if clearly visible in source">Show only if clearly visible in source</SelectItem>
                                  <SelectItem value="Flatlay/product-only tag allowed if clearly visible in source">Flatlay/product-only tag allowed if clearly visible in source</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
               </>
             )}
           
            {(productCategory === 'Shirt' || productCategory === 'Shoes' || productCategory === 'Jeans' || productCategory === 'Trousers') && (
               <FormField
                  control={form.control}
                  name="fabricType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{productCategory === 'Shoes' ? 'Material Type' : 'Fabric Type'}</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Linen, Cotton, Lycra, Leather" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            )}
             <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Beige, Navy Blue" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             {productCategory !== 'Perfume' && (
                <FormField
                control={form.control}
                name="pattern"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pattern (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Floral, Solid, Stripes" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
             )}
            </section>

            <section className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a6635]">
                  Reference Uploads
                </p>
                <p className="mt-1 text-sm text-muted-foreground">Use clear product images for better output accuracy.</p>
              </div>
            {productCategory === 'Shirt' && (
              <div className="space-y-4 rounded-lg border border-black/10 bg-white p-4">
                <div>
                  <h3 className="text-sm font-medium text-foreground">Reference Photos</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Start with one main photo. More reference photos = better product accuracy.</p>
                </div>
                <FormField
                  control={form.control}
                  name="productImage"
                  render={() => (
                    <FormItem>
                      <FileUpload
                        form={form}
                        name="productImage"
                        title="Main Photo"
                        badge="Required"
                        helperText="Folded shirt or front product image. This is enough to generate."
                        isMainImage
                      />
                    </FormItem>
                  )}
                />
                <Accordion type="single" collapsible className="rounded-lg border border-black/10 bg-[#fbf8f1] px-4">
                  <AccordionItem value="more-references" className="border-0">
                    <AccordionTrigger className="py-4 text-sm font-semibold text-[#171717] hover:no-underline">
                      Add More Reference Photos
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4">
                      <div className="rounded-lg border border-[#d8c39b] bg-[#fff8ea] p-3 text-sm leading-6 text-[#6f562f]">
                        Use good light. Avoid glass reflection. Keep product flat/open where possible. Capture collar, pocket, and fabric clearly. Avoid covering the product with hand or tag.
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="openShirtImage"
                          render={() => (
                            <FormItem>
                              <FileUpload
                                form={form}
                                name="openShirtImage"
                                title="Open Shirt"
                                badge="Improves Accuracy"
                                helperText="Full shape and sleeve length."
                                compact
                              />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="fabricCloseupImage"
                          render={() => (
                            <FormItem>
                              <FileUpload
                                form={form}
                                name="fabricCloseupImage"
                                title="Fabric Detail"
                                badge="Optional"
                                helperText="Color, fabric finish, and pattern."
                                compact
                              />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="collarButtonCloseupImage"
                          render={() => (
                            <FormItem>
                              <FileUpload
                                form={form}
                                name="collarButtonCloseupImage"
                                title="Collar & Buttons"
                                badge="Optional"
                                helperText="Collar, placket, and button color."
                                compact
                              />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="pocketLogoDetailImage"
                          render={() => (
                            <FormItem>
                              <FileUpload
                                form={form}
                                name="pocketLogoDetailImage"
                                title="Pocket / Logo"
                                badge="Optional"
                                helperText="Pocket, logo, or small detail."
                                compact
                              />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="backSideImage"
                          render={() => (
                            <FormItem>
                              <FileUpload
                                form={form}
                                name="backSideImage"
                                title="Back View"
                                badge="Optional"
                                helperText="Add if the back view matters."
                                compact
                              />
                            </FormItem>
                          )}
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            )}
            {(productCategory === 'Shoes' || productCategory === 'Jeans') && (
              <FormField
                control={form.control}
                name="productImage"
                render={() => (
                  <FormItem>
                    <FormLabel>Product Image</FormLabel>
                    <FileUpload form={form} name="productImage" isMainImage />
                  </FormItem>
                )}
              />
            )}
             {productCategory === 'Trousers' && (
              <div className="space-y-4 rounded-lg border border-black/10 bg-white p-4">
                 <h3 className="text-sm font-medium text-foreground">Trouser Images</h3>
                <FormField
                  control={form.control}
                  name="productImageFront"
                  render={() => (
                    <FormItem>
                      <FormLabel>Front View Image</FormLabel>
                      <FileUpload form={form} name="productImageFront" isMainImage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="productImageFabric"
                  render={() => (
                    <FormItem>
                      <FormLabel>Fabric Close-up Image</FormLabel>
                      <FileUpload form={form} name="productImageFabric" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="productImageBack"
                  render={() => (
                    <FormItem>
                      <FormLabel>Back View Image</FormLabel>
                      <FileUpload form={form} name="productImageBack" />
                    </FormItem>
                  )}
                />
              </div>
            )}
             {productCategory === 'Perfume' && (
              <div className="space-y-4 rounded-lg border border-black/10 bg-white p-4">
                 <h3 className="text-sm font-medium text-foreground">Perfume Images</h3>
                <FormField
                  control={form.control}
                  name="bottleImageFile"
                  render={() => (
                    <FormItem>
                      <FormLabel>Perfume Bottle Image</FormLabel>
                      <FileUpload form={form} name="bottleImageFile" isMainImage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="boxFrontImageFile"
                  render={() => (
                    <FormItem>
                      <FormLabel>Perfume Box Front Image</FormLabel>
                      <FileUpload form={form} name="boxFrontImageFile" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="boxBackImageFile"
                  render={() => (
                    <FormItem>
                      <FormLabel>Perfume Box Back Image</FormLabel>
                      <FileUpload form={form} name="boxBackImageFile" />
                    </FormItem>
                  )}
                />
              </div>
            )}
            </section>
        </div>
        <div className="sticky bottom-0 border-t border-black/10 bg-white/95 p-4 backdrop-blur sm:p-5">
          <Button type="submit" disabled={isLoading} className="h-12 w-full bg-[#171717] text-white hover:bg-[#2a2a2a]" size="lg">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Generate Assets'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
