import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { CategoryUpdateModal } from "../update-category-modal";
import { DeleteItemModal } from "../delete-item-model";
import { Button } from "../ui/button";
import { ChevronDown, ChevronRight, Edit2, Package } from "lucide-react";
import { AddNewCategoryModal, type Category } from "../category-modal";
import { flattenCategories } from "@/lib/utils";
import { useDeleteData, usePatchData, usePostData } from "@/lib/api-request";
import { toast } from "sonner";
import type {
  CategoryFormValues,
  UpdateCategory,
} from "@myapp/shared/schemas/category.schema";
import type {
  QueryObserverResult,
  RefetchOptions,
} from "@tanstack/react-query";

function CategorySection({
  categories,
  refetchCategories,
}: {
  refetchCategories: (options?: RefetchOptions | undefined) => Promise<
    QueryObserverResult<
      {
        data: Category[];
      },
      Error
    >
  >;
  categories: Category[];
}) {
  // -------- states
  const [selectedCategorIdForUpdate, setSelectedCategoryIdForUpdate] = useState<
    string | null
  >(null);
  const [isCategoryUpdateModalOpen, setIsCategoryUpdateModalOpen] =
    useState(false);
  const [isCategoryCreateModalOpen, setIsCategoryCreateModalOpen] =
    useState(false);

  // -------- api calls

  const { mutate: deleteCategory, isPending: isDeleteCategoryPending } =
    useDeleteData("/categories/delete");

  const { mutate: updateCategory, isPending: isCategoryUpdatePending } =
    usePatchData("/categories/update");
  const { mutate: createCategory, isPending: isCategoryCreatePending } =
    usePostData("/categories/create");

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(categories.map((c) => c.id)),
  );

  // ----- handlers
  const getCategoryStats = () => {
    const countChildren = (cats: Category[]): number => {
      return cats.reduce((acc, cat) => {
        return acc + 1 + (cat.children ? countChildren(cat.children) : 0);
      }, 0);
    };
    return countChildren(categories);
  };

  const handleDeleteCategory = (id: string) =>
    deleteCategory(
      { id },
      {
        onSuccess: () => {
          toast.success("Category deleted successfully");
          refetchCategories();
        },
        onError: (error) => {
          toast.error(error.message ?? "Failed to delete category");
        },
      },
    );

  const handleCategoryUpdate = (payload: UpdateCategory) =>
    updateCategory(payload, {
      onSuccess: () => {
        toast.success("Category updated successfully");
        refetchCategories();
        setIsCategoryUpdateModalOpen(false);
      },
      onError: (error) => {
        toast.error(error.message ?? "Failed to update category");
      },
    });

  const handleCategoryCreated = (payload: CategoryFormValues) =>
    createCategory(
      {
        name: payload.name,
        description: payload.description ?? undefined,
        parent_id: payload.parent_id === "root" ? undefined : payload.parent_id,
      },
      {
        onSuccess: () => {
          toast.success("Category created successfully");
          refetchCategories();
          setIsCategoryCreateModalOpen(false);
        },
        onError: (error) => {
          toast.error(error.message ?? "Failed to create category");
        },
      },
    );

  return (
    <section className="border-t pt-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Categories</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage product categories and subcategories
          </p>
        </div>
        <AddNewCategoryModal
          open={isCategoryCreateModalOpen}
          setOpen={setIsCategoryCreateModalOpen}
          categories={categories}
          isPending={isCategoryCreatePending}
          onCategoryCreated={handleCategoryCreated}
        />
      </div>

      {/* Category Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <Card className="border border-border">
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{categories.length}</p>
            <p className="text-xs text-muted-foreground">Root Categories</p>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{getCategoryStats()}</p>
            <p className="text-xs text-muted-foreground">Total Categories</p>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="p-4">
            <p className="text-2xl font-bold">
              {categories.reduce(
                (acc, c) => acc + (c.children?.length || 0),
                0,
              )}
            </p>
            <p className="text-xs text-muted-foreground">Subcategories</p>
          </CardContent>
        </Card>
      </div>

      {/* Categories List */}
      <Card className="border border-border">
        <CardHeader className="border-b border-border flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Category Hierarchy</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {categories.length}{" "}
              {categories.length === 1 ? "category" : "categories"} • Organize
              your product catalog
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setExpandedCategories(new Set(categories.map((c) => c.id)));
              }}
            >
              Expand All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setExpandedCategories(new Set());
              }}
            >
              Collapse All
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {categories.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No categories created yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {categories.map((cat) => {
                const isExpanded = expandedCategories.has(cat.id);
                const hasChildren = cat.children && cat.children.length > 0;
                return (
                  <div
                    key={cat.id}
                    className="rounded-lg border border-border/50 overflow-hidden hover:border-border hover:shadow-sm transition-all duration-200"
                  >
                    <div
                      className={`flex items-center justify-between gap-3 px-4 py-3 cursor-pointer hover:bg-muted/40 transition-colors ${
                        hasChildren ? "" : "bg-muted/10"
                      }`}
                      onClick={() => {
                        if (hasChildren) {
                          const newExpanded = new Set(expandedCategories);
                          if (newExpanded.has(cat.id)) {
                            newExpanded.delete(cat.id);
                          } else {
                            newExpanded.add(cat.id);
                          }
                          setExpandedCategories(newExpanded);
                        }
                      }}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {hasChildren && (
                          <div className="flex-shrink-0 text-emerald-600">
                            {isExpanded ? (
                              <ChevronDown className="w-5 h-5" />
                            ) : (
                              <ChevronRight className="w-5 h-5" />
                            )}
                          </div>
                        )}
                        {!hasChildren && <div className="flex-shrink-0 w-5" />}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground text-sm">
                            {cat.name}
                          </p>
                          {cat.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {cat.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {hasChildren && (
                          <span className="text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded-full">
                            {cat.children?.length} subcats
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-100 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-all"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCategoryIdForUpdate(cat.id);
                            setIsCategoryUpdateModalOpen(true);
                          }}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <DeleteItemModal
                          handleDelete={handleDeleteCategory}
                          isPending={isDeleteCategoryPending}
                          id={cat.id}
                        />
                      </div>
                    </div>

                    {hasChildren && isExpanded && (
                      <div className="border-t border-border/30 bg-muted/5">
                        <div className="space-y-1 p-2">
                          {cat.children?.map((child) => {
                            const childExpanded = expandedCategories.has(
                              child.id,
                            );
                            const childHasChildren =
                              child.children && child.children.length > 0;
                            return (
                              <div key={child.id}>
                                <div
                                  className={`flex items-center justify-between gap-2 px-3 py-2 rounded-md cursor-pointer hover:bg-muted/50 transition-colors group/child ${
                                    childHasChildren ? "" : "opacity-75"
                                  }`}
                                  onClick={() => {
                                    if (childHasChildren) {
                                      const newExpanded = new Set(
                                        expandedCategories,
                                      );
                                      if (newExpanded.has(child.id)) {
                                        newExpanded.delete(child.id);
                                      } else {
                                        newExpanded.add(child.id);
                                      }
                                      setExpandedCategories(newExpanded);
                                    }
                                  }}
                                >
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    {childHasChildren && (
                                      <div className="flex-shrink-0 text-emerald-600/60">
                                        {childExpanded ? (
                                          <ChevronDown className="w-4 h-4" />
                                        ) : (
                                          <ChevronRight className="w-4 h-4" />
                                        )}
                                      </div>
                                    )}
                                    {!childHasChildren && (
                                      <div className="flex-shrink-0 w-4" />
                                    )}
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium text-foreground">
                                        {child.name}
                                      </p>
                                    </div>
                                    {childHasChildren && (
                                      <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded ml-auto flex-shrink-0">
                                        {child.children?.length}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 opacity-0 group-hover/child:opacity-100 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-all"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedCategoryIdForUpdate(
                                          child.id,
                                        );
                                        setIsCategoryUpdateModalOpen(true);
                                      }}
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </Button>
                                    <DeleteItemModal
                                      handleDelete={handleDeleteCategory}
                                      isPending={isDeleteCategoryPending}
                                      id={child.id}
                                    />
                                  </div>
                                </div>

                                {childHasChildren && childExpanded && (
                                  <div className="ml-3 mt-1 space-y-1">
                                    {child.children?.map((grandchild) => (
                                      <div
                                        key={grandchild.id}
                                        className="flex items-center justify-between gap-2 px-3 py-2 rounded-md text-xs hover:bg-muted/40 transition-colors group/grandchild opacity-75"
                                      >
                                        <div className="flex items-center gap-2 min-w-0">
                                          <span className="text-muted-foreground flex-shrink-0">
                                            ↳
                                          </span>
                                          <span className="text-foreground font-medium">
                                            {grandchild.name}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-0.5 flex-shrink-0">
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 opacity-0 group-hover/grandchild:opacity-100 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-all"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedCategoryIdForUpdate(
                                                grandchild.id,
                                              );
                                              setIsCategoryUpdateModalOpen(
                                                true,
                                              );
                                            }}
                                          >
                                            <Edit2 className="w-2.5 h-2.5" />
                                          </Button>
                                          <DeleteItemModal
                                            handleDelete={handleDeleteCategory}
                                            isPending={isDeleteCategoryPending}
                                            id={grandchild.id}
                                          />
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      <CategoryUpdateModal
        open={isCategoryUpdateModalOpen}
        categories={flattenCategories(categories)}
        categoryId={selectedCategorIdForUpdate}
        isSubmitLoading={isCategoryUpdatePending}
        handleSubmitFn={handleCategoryUpdate}
        setOpen={setIsCategoryUpdateModalOpen}
      />
    </section>
  );
}

export default CategorySection;
