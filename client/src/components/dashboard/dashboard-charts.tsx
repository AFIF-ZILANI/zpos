import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
  LabelList,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatCurrencyInBDT } from "@/lib/utils";
import type { CategorySalesEntry, WeeklySalesEntry } from "@/types";

/**
 * Recharts is ~400 kB — larger than the rest of the dashboard put together.
 * Keeping both charts in this module lets Dashboard load it lazily, so the
 * stat cards and recent-sales list paint without waiting on the charting
 * library.
 */

const weeklySalesChartConfig = {
  sales: { label: "Revenue", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig;

const categoryChartColors = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export function WeeklySalesChart({
  weeklySalesGraphData,
}: {
  weeklySalesGraphData: WeeklySalesEntry[];
}) {
  return (
      <ChartContainer config={weeklySalesChartConfig} className="aspect-auto h-[220px] w-full">
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
              <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.25} />
              <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
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
            tick={{ fontSize: 12, fontFamily: "var(--app-font-mono)", fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value) => formatCurrencyInBDT(Number(value))}
              />
            }
          />
          <Area
            type="monotone"
            dataKey="sales"
            stroke="hsl(var(--chart-1))"
            strokeWidth={2}
            fill="url(#salesGradient)"
          />
        </AreaChart>
      </ChartContainer>
  );
}

export function CategoryBreakdownChart({
  categoryGraphData,
}: {
  categoryGraphData: CategorySalesEntry[];
}) {
  return (
      <ChartContainer
        config={{}}
        className="aspect-auto w-full"
        style={{ height: categoryGraphData.length * 36 }}
      >
        <BarChart
          data={categoryGraphData}
          layout="vertical"
          margin={{ top: 0, right: 24, left: 0, bottom: 0 }}
        >
          <XAxis type="number" hide domain={[0, 100]} />
          <YAxis
            type="category"
            dataKey="name"
            tickLine={false}
            axisLine={false}
            width={100}
            tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }}
          />
          <ChartTooltip
            content={<ChartTooltipContent formatter={(value) => `${value}%`} />}
          />
          <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={16}>
            {categoryGraphData.map((_, i) => (
              <Cell key={i} fill={categoryChartColors[i % categoryChartColors.length]} />
            ))}
            <LabelList
              dataKey="value"
              position="right"
              formatter={(v: number) => `${v}%`}
              className="font-mono"
              fill="hsl(var(--foreground))"
              fontSize={12}
            />
          </Bar>
        </BarChart>
      </ChartContainer>
  );
}
