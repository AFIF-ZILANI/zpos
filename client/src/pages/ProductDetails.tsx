import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import {
  Pencil,
  Check,
  Plus,
  ArrowLeft,
  Package,
  Tag,
  BarChart3,
  AlertCircle,
  Power,
  PowerOff,
} from "lucide-react";
import { toast } from "sonner";
import {
  useGetData,
  usePatchData,
  useDeleteData,
  usePostData,
} from "@/lib/api-request";
import { Spinner } from "@/components/ui/spinner";
import type { Category, TProduct } from "@/types";
import { useParams } from "wouter";

// ─── Types ────────────────────────────────────────────────────────────────────

type Variant = {
  id?: string;
  color?: string | null;
  size?: string | null;
  isActive: boolean;
};

type DetailsFormValues = {
  id: string;
  name: string;
  description: string;
  brand: string;
  reorder_level: number;
  category: string;
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProductDetailPage() {
  const { id: productId } = useParams<{ id: string }>();

  const {
    data: productData,
    isLoading,
    refetch,
  } = useGetData<{ data: TProduct }>(`/products/get/${productId}`, undefined);

  const { data: categoriesData } = useGetData<{ data: Category[] }>(
    "/categories/get/all",
  );

  if (!productId) {
    return <NotFound />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  if (!productData?.data) {
    return <NotFound />;
  }

  const categories = categoriesData?.data || [];

  const product = productData.data;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* ── Page header ───────────────────────────────────────────── */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.history.back()}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div className="h-4 w-px bg-border" />
          <div>
            <h1 className="text-xl font-semibold">{product.name}</h1>
            <p className="text-sm text-muted-foreground">
              {product.category.name} · {product.brand ?? "No brand"}
            </p>
          </div>
        </div>

        {/* ── Section 1: Product Details ─────────────────────────────── */}
        <ProductDetailsSection
          product={product}
          categories={categories}
          onSaved={refetch}
        />

        {/* ── Section 2: Variants ────────────────────────────────────── */}
        <VariantsSection product={product} onSaved={refetch} />

        {/* ── Section 3: Analytics (future) ─────────────────────────── */}
        <AnalyticsSection />
      </div>
    </div>
  );
}

// ─── Section: Product Details ─────────────────────────────────────────────────

function ProductDetailsSection({
  product,
  categories,
  onSaved,
}: {
  product: TProduct;
  categories: Array<{ id: string; name: string }>;
  onSaved: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const { mutate: updateDetails, isPending } = usePatchData("/products/update");

  const form = useForm<DetailsFormValues>({
    defaultValues: {
      id: product.id,
      name: product.name,
      description: product.description ?? "",
      brand: product.brand ?? "",
      reorder_level: product.reorderLevel,
      category: product.category.id,
    },
  });

  // Re-sync if product prop changes (e.g. after save + refetch)
  useEffect(() => {
    form.reset({
      id: product.id,
      name: product.name,
      description: product.description ?? "",
      brand: product.brand ?? "",
      reorder_level: product.reorderLevel,
      category: product.category.id,
    });
  }, [product, form]);

  function onSubmit(values: DetailsFormValues) {
    updateDetails(values, {
      onSuccess: () => {
        toast.success("Product details updated");
        setIsEditing(false);
        onSaved();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
  }

  function handleCancel() {
    form.reset();
    setIsEditing(false);
  }

  return (
    <SectionCard
      icon={<Package className="w-4 h-4" />}
      title="Product Details"
      action={
        !isEditing ? (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setIsEditing(true)}
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </Button>
        ) : null
      }
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-muted-foreground uppercase tracking-wide">
                    Product Name
                  </FormLabel>
                  <FormControl>
                    {isEditing ? (
                      <Input {...field} />
                    ) : (
                      <ReadonlyValue value={field.value} />
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Brand */}
            <FormField
              control={form.control}
              name="brand"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-muted-foreground uppercase tracking-wide">
                    Brand
                  </FormLabel>
                  <FormControl>
                    {isEditing ? (
                      <Input {...field} />
                    ) : (
                      <ReadonlyValue value={field.value || "—"} />
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Reorder level */}
            <FormField
              control={form.control}
              name="reorder_level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-muted-foreground uppercase tracking-wide">
                    Reorder Level
                  </FormLabel>
                  <FormControl>
                    {isEditing ? (
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (/^\d*$/.test(val)) {
                            field.onChange(val === "" ? 0 : Number(val));
                          }
                        }}
                      />
                    ) : (
                      <ReadonlyValue value={String(field.value ?? "—")} />
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Category */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-muted-foreground uppercase tracking-wide">
                    Category
                  </FormLabel>
                  {isEditing ? (
                    <Select
                      key={`${field.value}-${categories.length}`}
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <ReadonlyValue
                      value={
                        categories.find((c) => c.id === field.value)?.name ??
                        field.value
                      }
                    />
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Description — full width */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-muted-foreground uppercase tracking-wide">
                  Description
                </FormLabel>
                <FormControl>
                  {isEditing ? (
                    <Textarea
                      className="min-h-24 resize-none"
                      placeholder="Enter product description"
                      {...field}
                    />
                  ) : (
                    <ReadonlyValue
                      value={field.value || "No description provided."}
                      muted={!field.value}
                    />
                  )}
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Edit mode actions */}
          {isEditing && (
            <div className="flex items-center justify-end gap-3 pt-2 border-t">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isPending}
                className="min-w-28"
              >
                {isPending ? (
                  <span className="flex items-center gap-2">
                    <Spinner /> Saving...
                  </span>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 mr-1.5" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          )}
        </form>
      </Form>
    </SectionCard>
  );
}

// ─── Section: Variants ────────────────────────────────────────────────────────

function VariantsSection({
  product,
  onSaved,
}: {
  product: TProduct;
  onSaved: () => void;
}) {
  const [showAddForm, setShowAddForm] = useState(false);

  const { mutate: updateVariant, isPending: isSavingVariant } = usePatchData(
    "/products/variants/update",
  );
  const { mutate: createVariant } = usePostData("/products/variants/create");
  const { mutate: deleteVariant } = useDeleteData("/products/variants/delete");
  const { mutate: toggleVariant } = usePatchData("/products/variants/toggle");

  const activeVariants = (product.variants ?? []).filter((v) => v.isActive);
  const inactiveVariants = (product.variants ?? []).filter((v) => !v.isActive);

  function handleSaveVariant(variant: Variant) {
    updateVariant(
      {
        id: variant.id,
        color: variant.color,
        size: variant.size,
      },
      {
        onSuccess: () => {
          toast.success("Variant saved");
          onSaved();
        },
        onError: (error) => toast.error(error.message),
      },
    );
  }

  function handleDeleteVariant(variantId: string) {
    deleteVariant(
      { id: variantId },
      {
        onSuccess: () => {
          toast.success("Variant deleted");
          onSaved();
        },
        onError: (error) => toast.error(error.message),
      },
    );
  }

  function handleToggleVariant(variantId: string, currentState: boolean) {
    toggleVariant(
      { id: variantId, isActive: !currentState },
      {
        onSuccess: () => {
          toast.success(
            currentState ? "Variant deactivated" : "Variant activated",
          );
          onSaved();
        },
        onError: (error) => toast.error(error.message),
      },
    );
  }

  function handleAddVariant(variant: Omit<Variant, "id" | "isActive">) {
    createVariant(
      {
        productId: product.id,
        ...variant,
      },
      {
        onSuccess: () => {
          toast.success("Variant added");
          setShowAddForm(false);
          onSaved();
        },
        onError: (error) => toast.error(error.message),
      },
    );
  }

  return (
    <SectionCard
      icon={<Tag className="w-4 h-4" />}
      title="Variants"
      subtitle={`${activeVariants.length} active · ${inactiveVariants.length} inactive`}
    >
      <div className="space-y-6">
        {/* Two-column layout: active | inactive */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Active variants */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <h4 className="text-sm font-medium">Active</h4>
              <span className="text-xs text-muted-foreground">
                ({activeVariants.length})
              </span>
            </div>

            {activeVariants.length === 0 ? (
              <EmptyVariantState label="No active variants" />
            ) : (
              <div className="space-y-2">
                {activeVariants.map((variant) => (
                  <VariantCard
                    key={variant.id}
                    variant={variant}
                    onSave={handleSaveVariant}
                    onDelete={handleDeleteVariant}
                    onToggle={handleToggleVariant}
                    isSaving={isSavingVariant}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Inactive variants */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-muted-foreground/40" />
              <h4 className="text-sm font-medium text-muted-foreground">
                Inactive
              </h4>
              <span className="text-xs text-muted-foreground">
                ({inactiveVariants.length})
              </span>
            </div>

            {inactiveVariants.length === 0 ? (
              <EmptyVariantState label="No inactive variants" />
            ) : (
              <div className="space-y-2">
                {inactiveVariants.map((variant) => (
                  <VariantCard
                    key={variant.id}
                    variant={variant}
                    onSave={handleSaveVariant}
                    onDelete={handleDeleteVariant}
                    onToggle={handleToggleVariant}
                    isSaving={isSavingVariant}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Add new variant */}
        <div className="border-t pt-4">
          {!showAddForm ? (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setShowAddForm(true)}
            >
              <Plus className="w-4 h-4" />
              Add New Variant
            </Button>
          ) : (
            <AddVariantForm
              onSave={handleAddVariant}
              onCancel={() => setShowAddForm(false)}
              isSaving={isSavingVariant}
            />
          )}
        </div>
      </div>
    </SectionCard>
  );
}

// ─── Variant Card ─────────────────────────────────────────────────────────────

function VariantCard({
  variant,
  onSave,
  //   onDelete,
  onToggle,
  isSaving,
}: {
  variant: Variant;
  onSave: (v: Variant) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, current: boolean) => void;
  isSaving: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [color, setColor] = useState(variant.color ?? "");
  const [size, setSize] = useState(variant.size ?? "");

  function handleSave() {
    onSave({ ...variant, color, size });
    setIsEditing(false);
  }

  function handleCancel() {
    setColor(variant.color ?? "");
    setSize(variant.size ?? "");
    setIsEditing(false);
  }

  const isInactive = !variant.isActive;

  return (
    <div
      className={`
        rounded-lg border p-3 space-y-3 transition-opacity
        ${isInactive ? "opacity-60" : ""}
      `}
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Badge
            variant={variant.isActive ? "default" : "secondary"}
            className="text-xs shrink-0"
          >
            {variant.isActive ? "Active" : "Inactive"}
          </Badge>
          {!isEditing && (
            <span className="text-sm text-muted-foreground truncate">
              {[variant.color, variant.size].filter(Boolean).join(" · ") ||
                "No attributes"}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
              title="Edit variant"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Toggle active/inactive */}
          <button
            onClick={() => onToggle(variant.id!, variant.isActive)}
            className={`p-1.5 rounded transition-colors ${
              variant.isActive
                ? "hover:bg-amber-50 text-amber-600 hover:text-amber-700"
                : "hover:bg-green-50 text-muted-foreground hover:text-primary"
            }`}
            title={variant.isActive ? "Deactivate variant" : "Activate variant"}
          >
            {variant.isActive ? (
              <PowerOff className="w-3.5 h-3.5" />
            ) : (
              <Power className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Delete */}
          {/* <button
            onClick={() => variant.id && onDelete(variant.id)}
            className="p-1.5 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive transition-colors"
            title="Delete variant"
          >
            <X className="w-3.5 h-3.5" />
          </button> */}
        </div>
      </div>

      {/* Edit fields — shown only when editing */}
      {isEditing && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Color</label>
              <Input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="e.g. Red"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Size</label>
              <Input
                value={size}
                onChange={(e) => setSize(e.target.value)}
                placeholder="e.g. M"
                className="h-8 text-sm"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="h-7 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="h-7 text-xs min-w-16"
            >
              {isSaving ? <Spinner /> : "Save"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Add Variant Form ─────────────────────────────────────────────────────────

function AddVariantForm({
  onSave,
  onCancel,
  isSaving,
}: {
  onSave: (v: Omit<Variant, "id">) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const [color, setColor] = useState("");
  const [size, setSize] = useState("");

  function handleSubmit() {
    if (!color && !size) {
      toast.error("Enter at least a color or size");
      return;
    }
    onSave({ color, size, isActive: true });
  }

  return (
    <div className="rounded-lg border border-dashed p-4 space-y-4">
      <p className="text-sm font-medium">New Variant</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Color</label>
          <Input
            value={color}
            onChange={(e) => setColor(e.target.value)}
            placeholder="e.g. Red, Blue"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Size</label>
          <Input
            value={size}
            onChange={(e) => setSize(e.target.value)}
            placeholder="e.g. S, M, L, XL"
          />
        </div>
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={isSaving}
        >
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={isSaving}
          className="min-w-24"
        >
          {isSaving ? (
            <span className="flex items-center gap-2">
              <Spinner /> Adding...
            </span>
          ) : (
            <>
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add Variant
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ─── Section: Analytics (future) ─────────────────────────────────────────────

function AnalyticsSection() {
  return (
    <SectionCard
      icon={<BarChart3 className="w-4 h-4" />}
      title="Analytics"
      subtitle="Coming soon"
    >
      <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
          <BarChart3 className="w-6 h-6 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium">No analytics yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Sales trends, revenue by variant, and restock predictions will
            appear here.
          </p>
        </div>
      </div>
    </SectionCard>
  );
}

// ─── Shared UI Primitives ─────────────────────────────────────────────────────

function SectionCard({
  icon,
  title,
  subtitle,
  action,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card border rounded-xl p-6 space-y-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {icon && (
            <div className="w-7 h-7 rounded-md bg-primary/10 text-primary flex items-center justify-center">
              {icon}
            </div>
          )}
          <div>
            <h2 className="text-sm font-semibold">{title}</h2>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function ReadonlyValue({
  value,
  muted = false,
}: {
  value: string;
  muted?: boolean;
}) {
  return (
    <div
      className={`min-h-9 flex items-center px-3 py-2 rounded-md bg-muted/40 text-sm ${
        muted ? "text-muted-foreground italic" : ""
      }`}
    >
      {value}
    </div>
  );
}

function EmptyVariantState({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed flex items-center justify-center py-6 text-xs text-muted-foreground">
      {label}
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <AlertCircle className="w-10 h-10 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Product not found</p>
      <Button variant="outline" size="sm" onClick={() => window.history.back()}>
        Go back
      </Button>
    </div>
  );
}
