import { useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { FolderPlus, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Spinner } from "./ui/spinner";
import {
  categorySchema,
  type CategoryFormValues,
} from "@myapp/shared/schemas/category.schema";
import { ZodError } from "zod";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  description?: string;
  children?: Category[];
}

interface CategoryModalProps {
  categories: Category[];
  onCategoryCreated: (category: CategoryFormValues) => void;
  isPending: boolean;
  open: boolean;
  setOpen: (open: boolean) => void;
}

// Depth of a category in the tree:
// 0 = Parent (root), 1 = Child, 2 = Grandchild
type CategoryDepth = 0 | 1 | 2;

const LEVEL_LABELS: Record<CategoryDepth, string> = {
  0: "Parent",
  1: "Child",
  2: "Grandchild",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Returns depth of a category by searching the tree.
// Returns -1 if not found.
function getCategoryDepth(
  categories: Category[],
  targetId: string,
  currentDepth = 0,
): number {
  for (const cat of categories) {
    if (cat.id === targetId) return currentDepth;
    if (cat.children?.length) {
      const found = getCategoryDepth(cat.children, targetId, currentDepth + 1);
      if (found !== -1) return found;
    }
  }
  return -1;
}

// Flattens only categories at a specific depth level.
// Used to populate the parent selector with only valid choices.
function getCategoriesAtDepth(
  categories: Category[],
  targetDepth: number,
  currentDepth = 0,
): Array<{ id: string; name: string; path: string }> {
  const result: Array<{ id: string; name: string; path: string }> = [];

  for (const cat of categories) {
    if (currentDepth === targetDepth) {
      result.push({ id: cat.id, name: cat.name, path: cat.name });
    } else if (cat.children?.length && currentDepth < targetDepth) {
      // Build path label so user knows where in the tree this item sits
      const children = getCategoriesAtDepth(
        cat.children,
        targetDepth,
        currentDepth + 1,
      );
      children.forEach((child) => {
        result.push({
          ...child,
          path: `${cat.name} › ${child.path}`,
        });
      });
    }
  }

  return result;
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export function AddNewCategoryModal({
  categories,
  onCategoryCreated,
  isPending,
  open,
  setOpen,
}: CategoryModalProps) {
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      description: "",
      parent_id: "",
    },
  });

  const selectedParentId = useWatch({
    control: form.control,
    name: "parent_id",
  });

  // ── Derive what level is being created ────────────────────────────────────
  // If no parent is selected → creating a root Parent (depth 0)
  // If a depth-0 category is selected → creating a Child (depth 1)
  // If a depth-1 category is selected → creating a Grandchild (depth 2)
  const creatingDepth = useMemo((): CategoryDepth => {
    if (!selectedParentId) return 0;
    const parentDepth = getCategoryDepth(categories, selectedParentId);
    // parentDepth 0 → we're creating at depth 1 (child)
    // parentDepth 1 → we're creating at depth 2 (grandchild)
    return Math.min(parentDepth + 1, 2) as CategoryDepth;
  }, [selectedParentId, categories]);

  // ── Derive valid parent options ────────────────────────────────────────────
  // User can only pick parents at depth 0 (to create a child) or
  // depth 1 (to create a grandchild). Depth 2 categories cannot be parents.
  const parentOptions = useMemo(
    () => [
      // Depth-0 categories — creates a Child under them
      ...getCategoriesAtDepth(categories, 0),
      // Depth-1 categories — creates a Grandchild under them
      ...getCategoriesAtDepth(categories, 1),
    ],
    [categories],
  );

  function handleCancel() {
    form.reset();
    setOpen(false);
  }

  function onSubmit(values: CategoryFormValues) {
    // Normalize: empty parent_id means root level — send null or omit
    onCategoryCreated({
      ...values,
      parent_id: values.parent_id || undefined,
    });
  }

  const onError = (error: unknown) => {
    if (error instanceof Error || error instanceof ZodError) {
      toast.error(error.message);
    } else {
      toast.error("An unknown error occurred");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-emerald-600 hover:bg-emerald-700">
          <FolderPlus className="w-4 h-4 mr-2" />
          Add Categories
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Category</DialogTitle>
          <DialogDescription>
            Categories support up to 3 levels: Parent → Child → Grandchild.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit, onError)}
            className="space-y-4 pt-1"
          >
            {/* ── Level indicator ───────────────────────────────────── */}
            <LevelIndicator active={creatingDepth} />

            {/* ── Category name ─────────────────────────────────────── */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{LEVEL_LABELS[creatingDepth]} Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={`Enter ${LEVEL_LABELS[creatingDepth].toLowerCase()} name`}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ── Description ───────────────────────────────────────── */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional description" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ── Parent selector ───────────────────────────────────── */}
            <FormField
              control={form.control}
              name="parent_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Parent Category</FormLabel>
                  <Select
                    value={field.value ?? ""}
                    onValueChange={(val) => {
                      // "none" sentinel means root — store as empty string
                      field.onChange(val === "none" ? "" : val);
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="No parent — creates a root category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {/* Explicit "no parent" option */}
                      <SelectItem value="none">
                        No parent — Root category
                      </SelectItem>

                      {parentOptions.length > 0 && (
                        <>
                          {/* Depth-0 parents (creates a child) */}
                          {getCategoriesAtDepth(categories, 0).length > 0 && (
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                              Parents — creates a child
                            </div>
                          )}
                          {getCategoriesAtDepth(categories, 0).map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}

                          {/* Depth-1 parents (creates a grandchild) */}
                          {getCategoriesAtDepth(categories, 1).length > 0 && (
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-1">
                              Children — creates a grandchild
                            </div>
                          )}
                          {getCategoriesAtDepth(categories, 1).map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.path}
                            </SelectItem>
                          ))}
                        </>
                      )}

                      {parentOptions.length === 0 && (
                        <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                          No categories yet
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-2 border-t gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} className="min-w-28">
                {isPending ? (
                  <span className="flex items-center gap-2">
                    <Spinner /> Saving...
                  </span>
                ) : (
                  <>
                    <FolderPlus className="w-4 h-4 mr-1.5" />
                    Create {LEVEL_LABELS[creatingDepth]}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Level indicator ──────────────────────────────────────────────────────────
// Visual breadcrumb showing Parent → Child → Grandchild,
// with the currently-being-created level highlighted.

function LevelIndicator({ active }: { active: CategoryDepth }) {
  const levels: CategoryDepth[] = [0, 1, 2];

  return (
    <div className="flex items-center gap-1 rounded-lg bg-muted/50 px-3 py-2.5">
      {levels.map((level, i) => (
        <div key={level} className="flex items-center gap-1">
          <div
            className={`
              flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium
              transition-colors
              ${
                active === level
                  ? "bg-primary text-primary-foreground"
                  : active > level
                    ? "text-muted-foreground"
                    : "text-muted-foreground/50"
              }
            `}
          >
            <span
              className={`
                w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold
                ${
                  active === level
                    ? "bg-primary-foreground/20"
                    : "bg-muted-foreground/20"
                }
              `}
            >
              {level + 1}
            </span>
            {LEVEL_LABELS[level]}
          </div>
          {i < levels.length - 1 && (
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
          )}
        </div>
      ))}
    </div>
  );
}
