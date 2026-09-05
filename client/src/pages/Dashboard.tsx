import {
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  Users,
  DollarSign,
  Package,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { lazy, Suspense } from "react";
import { useGetData } from "@/lib/api-request";
import type {
  CategorySalesEntry,
  DashboardSalesHistory,
  DashboardStats,
  DashboardStatTrend,
  TopProductEntry,
  WeeklySalesEntry,
} from "@/types";
import { formatCurrencyInBDT } from "@/lib/utils";
import { StatusBadgeSales } from "@/components/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "date-fns";

// Charts live in their own chunk — see components/dashboard/dashboard-charts.
const WeeklySalesChart = lazy(() =>
  import("@/components/dashboard/dashboard-charts").then((m) => ({
    default: m.WeeklySalesChart,
  })),
);
const CategoryBreakdownChart = lazy(() =>
  import("@/components/dashboard/dashboard-charts").then((m) => ({
    default: m.CategoryBreakdownChart,
  })),
);

export default function Dashboard() {
  const { data: incomeStats } = useGetData<{
    data: DashboardStats;
  }>("/dashboard/get/stats");
  const { data: incomeStatTrend } = useGetData<{ data: DashboardStatTrend }>(
    "/dashboard/get/stat-trend",
  );
  const { data: incomeCategoryGraph, isFetching: isCategoryGraphFetching } = useGetData<{
    data: CategorySalesEntry[];
  }>("/dashboard/get/category-graph");
  const { data: incomeWeeklySalesGraph, isFetching: isWeeklySalesFetching } = useGetData<{
    data: WeeklySalesEntry[];
  }>("/dashboard/get/weekly-sales-graph");

  const { data: incomeTopProducts, isFetching: incomeTopProductsFetching } =
    useGetData<{
      data: TopProductEntry[];
    }>("/dashboard/get/top-products");

  const { data: incomeSalesHistory, isFetching: incomeSalesHistoryFetching } =
    useGetData<{
      data: {
        data: DashboardSalesHistory[];
      };
    }>("/dashboard/get/sales-history");

  const satatData = incomeStats?.data;
  const statTrendData = incomeStatTrend?.data;
  const categoryGraphData = incomeCategoryGraph?.data;
  const weeklySalesGraphData = incomeWeeklySalesGraph?.data;
  const topProductsData = incomeTopProducts?.data;
  const salesHistoryData = incomeSalesHistory?.data.data;

  const stats = [
    {
      label: "Today's Revenue",
      value: formatCurrencyInBDT(satatData?.totalRevenueToday || 0),
      change: `${(statTrendData?.revenue.percentage || 0).toFixed(2)}%`,
      up: statTrendData?.revenue.type === "UP",
      icon: DollarSign,
    },
    {
      label: "Today's Sales",
      value: satatData?.totalSalesToday || 0,
      change: `${(statTrendData?.sales.percentage || 0).toFixed(2)}%`,
      up: statTrendData?.sales.type === "UP",
      icon: ShoppingBag,
    },
    {
      label: "Active Customers",
      value: satatData?.totalCustomers || 0,
      change: `${(statTrendData?.customers.percentage || 0).toFixed(2)}%`,
      up: statTrendData?.customers.type === "UP",
      icon: Users,
    },
    {
      label: "Average Order Value",
      value: formatCurrencyInBDT(satatData?.averageOrderValue || 0),
      change: `${(statTrendData?.averageOrderValue.percentage || 0).toFixed(2)}%`,
      up: statTrendData?.averageOrderValue.type === "UP",
      icon: Package,
    },
  ];
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {formatDate(new Date(), "EEEE, MMMM d, yyyy")}
          </p>
        </div>
        <Button asChild>
          <Link href="/pos">
            <ShoppingBag className="w-4 h-4 mr-2" />
            New Sale
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="font-serif text-2xl font-semibold text-foreground mt-1">
                    {stat.value}
                  </p>
                  <div className="flex items-center gap-1 mt-1.5">
                    {stat.up ? (
                      <TrendingUp className="w-3.5 h-3.5 text-success" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5 text-destructive" />
                    )}
                    <span
                      className={`font-mono text-xs font-medium ${stat.up ? "text-success" : "text-destructive"}`}
                    >
                      {stat.change}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      vs yesterday
                    </span>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-accent text-accent-foreground">
                  <stat.icon className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Weekly Sales Chart */}
        <Card className="xl:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="font-serif text-base font-semibold">
                Weekly sales
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                This week
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {isWeeklySalesFetching ? (
              <Skeleton className="w-full h-[220px]" />
            ) : !weeklySalesGraphData || weeklySalesGraphData.length === 0 ? (
              <div className="h-[220px] flex flex-col items-center justify-center text-center gap-1">
                <p className="text-sm text-muted-foreground">No sales recorded this week</p>
                <p className="text-xs text-muted-foreground">New sales will appear here as they come in</p>
              </div>
            ) : (
              <Suspense fallback={<Skeleton className="w-full h-[220px]" />}>
                <WeeklySalesChart weeklySalesGraphData={weeklySalesGraphData} />
              </Suspense>
            )}
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="font-serif text-base font-semibold">
                Sales by category
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                This week
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {isCategoryGraphFetching ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="w-full h-6" />
                ))}
              </div>
            ) : !categoryGraphData || categoryGraphData.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-center gap-1">
                <p className="text-sm text-muted-foreground">No category sales yet</p>
              </div>
            ) : (
              <Suspense
                fallback={
                  <div className="space-y-3">
                    {Array.from({ length: categoryGraphData.length }).map((_, i) => (
                      <Skeleton key={i} className="w-full h-6" />
                    ))}
                  </div>
                }
              >
                <CategoryBreakdownChart categoryGraphData={categoryGraphData} />
              </Suspense>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Recent Orders */}
        <Card className="border border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">
                Recent Sales
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {!incomeSalesHistoryFetching &&
                salesHistoryData?.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {order.customerName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {order.id} · {order.items.length} item
                        {order.items.length > 1 ? "s" : ""}
                      </p>
                    </div>
                    <StatusBadgeSales status={order.status} />
                    <p className="text-sm font-semibold text-foreground">
                      {formatCurrencyInBDT(order.total)}
                    </p>
                  </div>
                ))}
              {incomeSalesHistoryFetching && (
                <div className="p-5 space-y-5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="w-full h-10" />
                  ))}
                </div>
              )}
              {!incomeSalesHistoryFetching &&
                (salesHistoryData?.length ?? 0) === 0 && (
                  <div className="px-5 py-10 text-center">
                    <p className="text-sm text-muted-foreground">
                      No sales in the last 7 days
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Completed sales will appear here as they come in.
                    </p>
                  </div>
                )}
            </div>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card className="border border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">
                Top Products
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-primary h-7 text-xs"
                asChild
              >
                <Link href="/products">
                  View All <ArrowRight className="w-3 h-3 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {!incomeTopProductsFetching &&
                topProductsData?.map((p, i) => (
                  <div
                    key={p.name}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors"
                  >
                    <span className="text-sm font-bold text-muted-foreground w-5 text-center">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.sold} sold
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">
                        {formatCurrencyInBDT(p.revenue)}
                      </p>
                      <p
                        className={`text-xs font-medium ${p.trend.startsWith("+") ? "text-success" : "text-destructive"}`}
                      >
                        {p.trend}
                      </p>
                    </div>
                  </div>
                ))}
              {incomeTopProductsFetching && (
                <div className="p-5 space-y-5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="w-full h-10" />
                  ))}
                </div>
              )}
              {!incomeTopProductsFetching &&
                (topProductsData?.length ?? 0) === 0 && (
                  <div className="px-5 py-10 text-center">
                    <p className="text-sm text-muted-foreground">
                      No products sold in the last 7 days
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your best sellers will be ranked here.
                    </p>
                  </div>
                )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
