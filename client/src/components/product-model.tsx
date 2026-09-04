import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { X, Plus } from "lucide-react";
import { toast } from "sonner";
import { usePostData } from "@/lib/api-request";
import {
  createProductSchema,
  type CreateProduct,
} from "@myapp/shared/schemas/product.schema";
import { Spinner } from "./ui/spinner";
import type {
  QueryObserverResult,
  RefetchOptions,
} from "@tanstack/react-query";
import type { FlatCategory, ProductTableRow, TableResponse } from "@/types";

export function ProductModal({
  categories = [],
  refetchProducts,
}: {
  categories?: FlatCategory[];
  refetchProducts: (
    options?: RefetchOptions | undefined,
  ) => Promise<QueryObserverResult<TableResponse<ProductTableRow>, Error>>;
}) {
  const { mutate: createProduct, isPending } = usePostData("/products/create");

  const form = useForm<CreateProduct>({
    resolver: zodResolver(createProductSchema),
    defaultValues: {
      name: "",
      description: "",
      brand: "",
      category_id: "",
      variants: [{}],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "variants",
  });

  async function onSubmit(values: CreateProduct) {
    createProduct(values, {
      onSuccess: () => {
        toast.success("Product created successfully");
        refetchProducts();
        form.reset();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
  }


  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Product
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
          <DialogDescription>
            Fill in the details and add variants to create a new product.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6"
          >
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Product Information</h3>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter product name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter brand name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter product description"
                        className="min-h-20"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reorder_level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reorder Level</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="Enter reorder level"
                        pattern="[0-9]*"
                        className="pr-12"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          // Allow only digits
                          if (/^\d*$/.test(val)) {
                            field.onChange(val === "" ? "" : Number(val));
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.length > 0 ? (
                          categories.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="NONE" disabled>
                            No categories found
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Variants */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Product Variants</h3>
                <Button
                  type="button"
                  onClick={() => append({})}
                  variant="outline"
                  size="sm"
                  className="gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Add Variant
                </Button>
              </div>

              {form.formState.errors.variants?.root && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.variants.root.message}
                </p>
              )}

              <div className="space-y-3">
                {fields.map((field, index) => (
                  <Card key={field.id} className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {index === 0
                          ? "Base Variant (Default)"
                          : `Variant ${index + 1}`}
                      </span>
                      {fields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="p-1 hover:bg-red-50 rounded text-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name={`variants.${index}.color`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Color</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g. Red, Blue"
                                {...field}
                                value={field.value ?? ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`variants.${index}.size`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Size</FormLabel>
                            <Input
                              placeholder="e.g. Red, Blue"
                              {...field}
                              value={field.value ?? ""}
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {form.formState.errors.variants?.[index]?.root && (
                      <p className="text-xs text-red-500">
                        {form.formState.errors.variants[index].root?.message}
                      </p>
                    )}
                  </Card>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => form.reset()}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={isPending}>
                {isPending ? (
                  <span className="flex items-center gap-2">
                    <Spinner /> Saving...
                  </span>
                ) : (
                  "Add Product"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
