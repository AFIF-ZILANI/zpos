import { useGetData } from "@/lib/api-request";
import type { Category } from "@/types";
import CategorySection from "@/components/products/category-section";
import ProductSection from "@/components/products/product-section";

export default function Products() {
  const { data: CategoriesData, refetch: refetchCategories } = useGetData<{
    data: Category[];
  }>("/categories/get/all");

  const categories = CategoriesData?.data || [];

  return (
    <div className="p-6 space-y-5">
      {/* ===== PRODUCTS SECTION ===== */}
      <ProductSection categories={categories} />
      {/* ===== CATEGORIES SECTION ===== */}
      <CategorySection
        categories={categories}
        refetchCategories={refetchCategories}
      />
    </div>
  );
}
