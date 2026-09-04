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
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useGetData } from "@/lib/api-request";
import type {
  CategorySalesEntry,
  DashboardSalesHistory,
  DashboardStats,
  DashboardStatTrend,
  TopProductEntry,
  WeeklySalesEntry,
} from "@/types";
import { formatCurrencyInBDT, StatusBadgeSales } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "date-fns";

const pieColors = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4"];

export default function Dashboard() {
  const { data: incomeStats } = useGetData<{
    data: DashboardStats;
  }>("/dashboard/get/stats");
  const { data: incomeStatTrend } = useGetData<{ data: DashboardStatTrend }>(
    "/dashboard/get/stat-trend",
  );
  const { data: incomeCategoryGraph } = useGetData<{
    data: CategorySalesEntry[];
  }>("/dashboard/get/category-graph");
  const { data: incomeWeeklySalesGraph } = useGetData<{
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
        <Card className="xl:col-span-2 border border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">
                Weekly Sales
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                This Week
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart
                data={weeklySalesGraphData}
                margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="salesGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(val: number) => [`$${val}`, "Revenue"]}
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#salesGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card className="border border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">
                Sales by Category
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                This Week
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-40 w-full mb-3">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryGraphData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={68}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {categoryGraphData?.map((_, i) => (
                      <Cell key={i} fill={pieColors[i % pieColors.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {categoryGraphData?.map((item, i) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: pieColors[i] }}
                    />
                    <span className="text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="font-medium">{item.value}%</span>
                </div>
              ))}
            </div>
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
                        className={`text-xs font-medium ${p.trend.startsWith("+") ? "text-green-600" : "text-red-500"}`}
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
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
