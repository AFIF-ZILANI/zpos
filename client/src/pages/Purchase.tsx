import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CheckCircle,
  Plus,
  Search,
  ShoppingCart,
  DollarSign,
  Building2,
} from "lucide-react";

import { Link } from "wouter";
import PurchaseHistory from "@/components/purchases/purchase-history";
import { useDeleteData, useGetData } from "@/lib/api-request";
import type {
  OverviewStats,
  PurchaseHistory as PurchaseHistoryType,
  TableResponse,
} from "@/types";
import { formatCurrencyInBDT } from "@/lib/utils";
import Pagination from "@/components/pagination";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/useDebounce";

export default function PurchasesPage() {
  const [query, setQuery] = useState("");
  // const [timeline, setTimeline] = useState<
  //   "all" | "today" | "last-week" | "last-month" | "half-year" | "last-year"
  // >("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const debouncedQuery = useDebounce(query, 300);

  const {
    data: purchases,
    isFetching,
    refetch: refetchPurchases,
  } = useGetData<TableResponse<PurchaseHistoryType>>(
    `/purchase/get/history?search=${debouncedQuery}&page=${page}&limit=${limit}`,
    [debouncedQuery, page.toString(), limit.toString()],
  );
  const { data: overviewKpis, refetch: refetchOverviewKpis } = useGetData<{
    data: OverviewStats;
  }>("/purchase/get/overview-stats");
  const { mutate: deletePurchase, isPending: isDeletePending } =
    useDeleteData("/purchase/delete");

  const handleDeletePurchase = (id: string) => {
    deletePurchase(
      { id },
      {
        onSuccess: () => {
          toast.success("Purchase deleted successfully");
          refetchPurchases();
          refetchOverviewKpis();
        },
        onError: (error) => {
          toast.error(error.message || "Failed to delete purchase");
        },
      },
    );
  };

  const purchaseHistoryData = purchases?.data.items || [];
  const overviewKpisData = overviewKpis?.data || {
    totalPurchases: 0,
    totalPurchaseValue: 0,
    uniqueSuppliers: 0,
    purchasesThisMonth: 0,
  };

  const totalPages = Math.ceil(Number(purchases?.data.total ?? 0) / limit);

  const stats = [
    {
      label: "Total Purchases",
      value: overviewKpisData.totalPurchases,
      change: "",
      icon: <ShoppingCart className="w-5 h-5" />,
      color: "bg-blue-500",
    },
    {
      label: "Total Purchase Value",
      value: formatCurrencyInBDT(overviewKpisData.totalPurchaseValue),
      change: "",
      icon: <DollarSign className="w-5 h-5" />,
      color: "bg-amber-500",
    },
    {
      label: "Unique Suppliers",
      value: overviewKpisData.uniqueSuppliers,
      change: "Active vendors",
      icon: <Building2 className="w-5 h-5" />,
      color: "bg-orange-500",
    },
    {
      label: "Monthly Purchases",
      value: overviewKpisData.purchasesThisMonth,
      change: "This month",
      icon: <CheckCircle className="w-5 h-5" />,
      color: "bg-green-500",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header Section */}
      <div className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Purchases
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage purchase orders and supplier inventory
              </p>
            </div>
            <Link href={"/purchases/new"}>
              <Button
                className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 font-medium"
                size="lg"
              >
                <Plus className="w-5 h-5" />
                New Purchase
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, idx) => (
            <Card key={idx} className="p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {stat.label}
                  </p>
                  <div className="flex items-baseline gap-2 mt-2">
                    <p className="text-3xl font-bold text-foreground">
                      {stat.value}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {stat.change}
                  </p>
                </div>
                <div
                  className={`${stat.color} rounded-lg p-3 text-white flex-shrink-0`}
                >
                  {stat.icon}
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Side - Form and History */}
          <div className="col-span-3 space-y-6">
            {/* Purchase History */}
            <Card className="p-6">
              <div className="flex items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-bold text-foreground">
                    Purchase History
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Track all purchase orders
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-lg">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="Search orders..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {/* <Select
                    value={timeline}
                    onValueChange={(value) =>
                      setTimeline(
                        value as
                          | "all"
                          | "today"
                          | "last-week"
                          | "last-month"
                          | "half-year"
                          | "last-year",
                      )
                    }
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Select timeline" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="last-week">Last week</SelectItem>
                      <SelectItem value="last-month">Last month</SelectItem>
                      <SelectItem value="half-year">Last 6 months</SelectItem>
                      <SelectItem value="last-year">Last year</SelectItem>
                    </SelectContent>
                  </Select> */}
                </div>
              </div>
              <div className="border-t border-border pt-6">
                <PurchaseHistory
                  handleDelete={handleDeletePurchase}
                  isDeletePending={isDeletePending}
                  purchases={purchaseHistoryData}
                  isFetching={isFetching}
                />
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  limit={limit}
                  onPageChange={setPage}
                  onLimitChange={(l) => {
                    setLimit(l);
                    setPage(1);
                  }}
                />
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          {
            // <div className="lg:col-span-1">
            //   <Card className="p-6 sticky top-24">
            //     <h3 className="font-bold text-foreground mb-4">
            //       Quick Actions
            //     </h3>
            //     <div className="space-y-3">
            //       <Link href="/purchases/new">
            //         <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium">
            //           <Plus className="w-4 h-4 mr-2" />
            //           New Order
            //         </Button>
            //       </Link>
            //       <Button variant="outline" className="w-full">
            //         View Reports
            //       </Button>
            //       <Button variant="outline" className="w-full">
            //         Supplier List
            //       </Button>
            //     </div>
            //     <div className="border-t border-border mt-6 pt-6">
            //       <h3 className="font-bold text-foreground mb-3 text-sm">
            //         Recent Activity
            //       </h3>
            //       <div className="space-y-3">
            //         <div className="p-3 bg-background rounded-lg">
            //           <p className="text-xs font-medium text-foreground">
            //             Order #2401 Received
            //           </p>
            //           <p className="text-xs text-muted-foreground mt-1">
            //             2 hours ago
            //           </p>
            //         </div>
            //         <div className="p-3 bg-background rounded-lg">
            //           <p className="text-xs font-medium text-foreground">
            //             Order #2400 Partial
            //           </p>
            //           <p className="text-xs text-muted-foreground mt-1">
            //             5 hours ago
            //           </p>
            //         </div>
            //         <div className="p-3 bg-background rounded-lg">
            //           <p className="text-xs font-medium text-foreground">
            //             Order #2399 Submitted
            //           </p>
            //           <p className="text-xs text-muted-foreground mt-1">
            //             1 day ago
            //           </p>
            //         </div>
            //       </div>
            //     </div>
            //   </Card>
            // </div>
          }
        </div>
      </div>
    </div>
  );
}
