import { PieChart, Pie, Cell, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { OrderStatusData } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";

interface OrderStatusChartProps {
  data: OrderStatusData[] | undefined;
  total: number | undefined;
  isLoading: boolean;
}

export function OrderStatusChart({
  data,
  total,
  isLoading,
}: OrderStatusChartProps) {
  return (
    <Card className="bg-card">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Order Status</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-80">
            <Skeleton className="w-64 h-64 rounded-full" />
          </div>
        ) : !data || data.length === 0 ? (
          <div className="flex items-center justify-center h-80">
            <p className="text-muted-foreground">No data available</p>
          </div>
        ) : (
          <div className="w-full space-y-4">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={false}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value) => {
                    const item = data.find((d) => d.name === value);
                    return `${value}: ${item?.value || 0}`;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex items-center justify-center">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold text-foreground">
                  {total || 0}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
