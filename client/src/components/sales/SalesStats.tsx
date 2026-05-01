import type { SaleMetrics } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrencyInBDT } from "@/lib/utils";
import {
  DollarSign,
  Package,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";

interface StatCardsProps {
  metrics: SaleMetrics;
  isLoading: boolean;
}

export function StatCards({ metrics, isLoading }: StatCardsProps) {
  const stats = [
    {
      label: "Total Revenue",
      value: formatCurrencyInBDT(metrics?.totalRevenue.value || 0),
      change: `${(metrics?.totalRevenue.trend.delta || 0).toFixed(2)}%`,
      up: metrics?.totalRevenue.trend.isPositive,
      icon: DollarSign,
      color:
        "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400",
    },
    {
      label: "Total Sales",
      value: metrics?.totalSales.value || 0,
      change: `${(metrics?.totalSales.trend.delta || 0).toFixed(2)}%`,
      up: metrics?.totalSales.trend.isPositive,
      icon: ShoppingBag,
      color: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    },
    {
      label: "Uncollected Revenue",
      value: formatCurrencyInBDT(metrics?.uncollectedRevenue.value || 0),
      change: `${(metrics?.uncollectedRevenue.trend.delta || 0).toFixed(2)}%`,
      up: metrics?.uncollectedRevenue.trend.isPositive,
      icon: Users,
      color:
        "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
    },
    {
      label: "Voided Sales",
      value: metrics?.voidedSales.value || 0,
      change: `${(metrics?.voidedSales.trend.delta || 0).toFixed(2)}%`,
      up: metrics?.voidedSales.trend.isPositive,
      icon: Package,
      color:
        "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="bg-card">
            <CardContent className="p-6">
              <Skeleton className="h-6 w-24 mb-2" />
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-4 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats?.map((stat) => (
          <Card key={stat.label} className="border border-border">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {stat.value}
                  </p>
                  <div className="flex items-center gap-1 mt-1.5">
                    {stat.up ? (
                      <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                    )}
                    <span
                      className={`text-xs font-medium ${stat.up ? "text-green-600" : "text-red-600"}`}
                    >
                      {stat.change}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      vs last period
                    </span>
                  </div>
                </div>
                <div className={`p-2.5 rounded-xl ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
