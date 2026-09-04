import { useState } from "react";
import {
  Search,
  Filter,
  Package,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { flattenCategories } from "@/lib/utils";
import { useDeleteData, useGetData } from "@/lib/api-request";
import { ProductModal } from "@/components/product-model";
import type {
  BasicDataResponse,
  Category,
  ProductStatus,
  ProductTableRow,
  TableResponse,
} from "@/types";
import { DeleteItemModal } from "@/components/delete-item-model";
import { toast } from "sonner";
import { StatusBadge } from "@/lib/utils";
import { useLocation } from "wouter";
import { useDebounce } from "@/hooks/useDebounce";
import Pagination from "../pagination";
import { Skeleton } from "../ui/skeleton";

type Stats = {
  totalProducts: number;
  totalStock: number;
  totalLowStock: number;
  totalOutOfStock: number;
};

export default function ProductSection({
  categories,
}: {
  categories: Category[];
}) {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  //   const [category, setCategory] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ProductStatus | "ALL">(
    "ALL",
  );

  const debouncedSearch = useDebounce(search, 300);

  const productQuery = new URLSearchParams({
    search: debouncedSearch,
    // category: category || "",
    status: statusFilter,
    page: page.toString(),
    limit: pageSize.toString(),
  });

  const {
    data: productData,
    refetch: refetchProducts,
    isFetching,
  } = useGetData<TableResponse<ProductTableRow>>(
    `/products/get/all?${productQuery}`,
    [
      debouncedSearch,
      // category || "",
      statusFilter,
      page.toString(),
      pageSize.toString(),
    ],
  );

  const { data: statsRes } =
    useGetData<BasicDataResponse<Stats>>("/products/stats");

  const { mutate: deleteProduct, isPending: isDeletePending } =
    useDeleteData("/products/delete");

  const products = productData?.data.items || [];
  const totalPages = productData?.data.totalPages || 0;
  const statsData = statsRes?.data;

  const stats = [
    {
      label: "Total Products",
      value: statsData?.totalProducts,
      icon: Package,
      color: "text-primary",
    },
    {
      label: "In Stock",
      value: statsData?.totalStock,
      icon: TrendingUp,
      color: "text-green-600",
    },
    {
      label: "Low Stock",
      value: statsData?.totalLowStock,
      icon: AlertTriangle,
      color: "text-amber-600",
    },
    {
      label: "Out of Stock",
      value: statsData?.totalOutOfStock,
      icon: AlertTriangle,
      color: "text-red-600",
    },
  ];
  const handleDeleteProduct = (id: string) =>
    deleteProduct(
      { id },
      {
        onSuccess: () => {
          toast.success("Product deleted successfully");
          refetchProducts();
        },
        onError: (error) => {
          toast.error(error.message ?? "Failed to delete product");
        },
      },
    );

  const flatCategories = flattenCategories(categories);
  return (
    <section>
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Products</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage your product catalog
            </p>
          </div>
          <ProductModal
            categories={flatCategories}
            refetchProducts={refetchProducts}
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map((s) => (
            <Card key={s.label} className="border border-border">
              <CardContent className="p-4 flex items-center gap-3">
                <s.icon className={`w-5 h-5 ${s.color}`} />
                <div>
                  <p className="text-xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name..."
              className="pl-9 h-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter as any}>
            <SelectTrigger className="h-9 w-40">
              <Filter className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="IN_STOCK">In Stock</SelectItem>
              <SelectItem value="LOW_STOCK">Low Stock</SelectItem>
              <SelectItem value="OUT_OF_STOCK">Out of Stock</SelectItem>
            </SelectContent>
          </Select>
          {/* <div className="flex gap-1 bg-muted rounded-lg p-1">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${category === cat.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                {cat.name}
              </button>
            ))}
          </div> */}
        </div>

        {/* Table */}
        <Card className="border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                    Product
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                    Category
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                    Variants
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                    Stock
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                    Status
                  </th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {products &&
                  products.length > 0 &&
                  !isFetching &&
                  products.map((p) => (
                    <tr
                      key={p.id}
                      className="hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-foreground">
                            {p.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {p.category}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {p.variants}
                      </td>
                      <td className="px-4 py-3 text-sm text-left">
                        <span
                          className={
                            p.stock <= 5
                              ? "text-red-600 font-semibold"
                              : p.stock <= 20
                                ? "text-amber-600 font-semibold"
                                : "text-foreground"
                          }
                        >
                          {p.stock}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            onClick={() => navigate(`/products/${p.id}`)}
                            size={"icon"}
                            variant={"ghost"}
                          >
                            <ArrowUpRight className="w-2.5 h-2.5" />
                          </Button>
                          <DeleteItemModal
                            handleDelete={handleDeleteProduct}
                            isPending={isDeletePending}
                            id={p.id}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}

                {isFetching &&
                  !products?.length &&
                  Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i} className="hover:bg-muted/20 transition-colors">
                      {Array.from({ length: 6 }).map((_, idx) => (
                        <td key={idx} className="px-4 py-3">
                          <Skeleton className="h-4 w-20" />
                        </td>
                      ))}
                    </tr>
                  ))}
              </tbody>
            </table>
            {products.length === 0 && !isFetching && (
              <div className="py-16 text-center text-muted-foreground">
                <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>No products found</p>
              </div>
            )}
          </div>
        </Card>
      </div>
      <Pagination
        page={page}
        onPageChange={setPage}
        limit={pageSize}
        onLimitChange={setPageSize}
        totalPages={totalPages}
      />
    </section>
  );
}
