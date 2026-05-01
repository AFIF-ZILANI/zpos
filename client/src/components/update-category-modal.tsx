import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { Spinner } from "./ui/spinner";
import {
  updateCategorySchema,
  type UpdateCategory,
} from "@myapp/shared/schemas/category.schema";
import type { FlatCategory } from "@/types";

// ─── Outer guard ──────────────────────────────────────────────────────────────
// Dialog shell stays mounted for open/close animation.
// Inner form only mounts when we have a valid categoryId and categories loaded,
// preventing hooks from running with undefined data.

export function CategoryUpdateModal({
  categories,
  categoryId,
  isSubmitLoading,
  handleSubmitFn,
  open,
  setOpen,
}: {
  open: boolean;
  categories: FlatCategory[];
  categoryId: string | null;
  isSubmitLoading: boolean;
  setOpen: (open: boolean) => void;
  handleSubmitFn: (payload: UpdateCategory) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* FIX 1: Only mount inner form when all required data is present.
          Previously the form mounted even without a valid category,
          causing the useEffect to find nothing and leave fields empty. */}
      {open && categoryId && categories.length > 0 ? (
        <CategoryUpdateForm
          categories={categories}
          categoryId={categoryId}
          isSubmitLoading={isSubmitLoading}
          handleSubmitFn={handleSubmitFn}
          setOpen={setOpen}
        />
      ) : null}
    </Dialog>
  );
}

// ─── Inner form ───────────────────────────────────────────────────────────────

function CategoryUpdateForm({
  categories,
  categoryId,
  isSubmitLoading,
  handleSubmitFn,
  setOpen,
}: {
  categories: FlatCategory[];
  categoryId: string;
  isSubmitLoading: boolean;
  setOpen: (open: boolean) => void;
  handleSubmitFn: (payload: UpdateCategory) => void;
}) {
  const form = useForm<UpdateCategory>({
    // FIX 2: Added Zod resolver — previously the form had zero validation.
    // Any garbage input would be submitted directly to the API.
    resolver: zodResolver(updateCategorySchema),
    defaultValues: {
      id: "",
      name: "",
      description: "",
    },
  });

  // FIX 3: useEffect now depends on categoryId.
  // Previously deps were [], so if categoryId changed (e.g. user closes and
  // opens a different category) the form would still show the old data.
  // FIX 4: Use form.reset() instead of multiple form.setValue() calls.
  // reset() syncs the entire form state atomically — isDirty, touched,
  // defaultValues all update correctly. Individual setValue() calls do not.
  // FIX 5: description falls back to "" — previously passing undefined to
  // a controlled Textarea causes React's uncontrolled input warning and
  // can cause the field to silently not submit.
  useEffect(() => {
    const category = categories.find((c) => c.id === categoryId);
    if (!category) return;

    form.reset({
      id: category.id,
      name: category.name,
      description: category.description ?? "",
    });
  }, [categoryId, categories, form]);

  function handleCancel() {
    form.reset();
    setOpen(false);
  }

  return (
    <DialogContent className="max-w-lg">
      {/* FIX 6: Title and description were copy-pasted from the product modal. */}
      <DialogHeader>
        <DialogTitle>Update Category</DialogTitle>
        <DialogDescription>
          Edit the category name or description below.
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmitFn)}
          className="space-y-4 pt-2"
        >
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category Name *</FormLabel>
                <FormControl>
                  <Input placeholder="Enter category name" {...field} />
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
                    placeholder="Enter category description"
                    className="min-h-24 resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* FIX 7: Actions consolidated — previously there was a submit button
              in the form AND a separate Close button in a footer below. That's
              two separate action areas which is confusing. One action row, always
              at the bottom of the form. Cancel resets and closes. */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t">
            <Button
              type="button"
              variant="ghost"
              onClick={handleCancel}
              disabled={isSubmitLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitLoading}
              className="min-w-32"
            >
              {isSubmitLoading ? (
                <span className="flex items-center gap-2">
                  <Spinner />
                  Saving...
                </span>
              ) : (
                "Update Category"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </DialogContent>
  );
}
