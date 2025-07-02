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
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
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
            <FormField
              control={form.control}
              name="fabricType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fabric Type</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Linen, Cotton" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
