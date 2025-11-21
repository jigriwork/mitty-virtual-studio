'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import type { UseFormReturn } from 'react-hook-form';
import { useWatch } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { productFormSchema, type ProductFormValues } from '@/lib/types';
import { FileUpload } from './file-upload';

interface ProductFormProps {
  form: UseFormReturn<ProductFormValues>;
  onSubmit: (data: ProductFormValues) => void;
  isLoading: boolean;
}

export function ProductForm({ form, onSubmit, isLoading }: ProductFormProps) {
  const productCategory = useWatch({ control: form.control, name: 'productCategory' });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
        <ScrollArea className="flex-1">
          <div className="space-y-6 p-6">
            <FormField
              control={form.control}
              name="productCategory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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
            {productCategory !== 'Perfume' && (
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
              <FormField
                control={form.control}
                name="sleeveType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sleeve Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
            {(productCategory === 'Shirt' || productCategory === 'Shoes' || productCategory === 'Jeans') && (
              <FormField
                control={form.control}
                name="productImage"
                render={() => (
                  <FormItem>
                    <FormLabel>Product Image</FormLabel>
                    <FileUpload form={form} name="productImage" />
                  </FormItem>
                )}
              />
            )}
             {productCategory === 'Trousers' && (
              <div className="space-y-4 rounded-lg border p-4">
                 <h3 className="text-sm font-medium text-foreground">Trouser Images</h3>
                <FormField
                  control={form.control}
                  name="productImageFront"
                  render={() => (
                    <FormItem>
                      <FormLabel>Front View Image</FormLabel>
                      <FileUpload form={form} name="productImageFront" />
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
              <div className="space-y-4 rounded-lg border p-4">
                 <h3 className="text-sm font-medium text-foreground">Perfume Images</h3>
                <FormField
                  control={form.control}
                  name="bottleImageFile"
                  render={() => (
                    <FormItem>
                      <FormLabel>Perfume Bottle Image</FormLabel>
                      <FileUpload form={form} name="bottleImageFile" />
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
          </div>
        </ScrollArea>
        <div className="p-6 border-t bg-background sticky bottom-0">
          <Button type="submit" disabled={isLoading} className="w-full" size="lg">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Generate'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
