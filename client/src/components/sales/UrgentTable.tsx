import type { Sale } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RotateCcw, CreditCard } from "lucide-react";
import { formatCurrencyInBDT } from "@/lib/utils";
import { StatusBadgeSales } from "@/components/status-badge";
import Pagination from "../pagination";

interface UrgentTableProps {
  sales: Sale[] | undefined;
  isLoading: boolean;
  page: number;
  limit: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  onCollectPayment: (sale: Sale) => void;
  onReturn?: (sale: Sale) => void;
}

export function UrgentTable({
  sales,
  isLoading,
  onCollectPayment,
  onPageChange,
  page,
  totalPages,
  limit,
  onLimitChange,
  onReturn,
}: UrgentTableProps) {
  const displaySales = sales || [];

  return (
    <Card className="bg-card">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          Urgent Transactions
        </CardTitle>
        <CardDescription>Showing all urgent transactions</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 rounded bg-muted animate-pulse" />
            ))}
          </div>
        ) : displaySales.length === 0 ? (
          <p className="py-6 text-center text-muted-foreground">
            No urgent transactions
          </p>
        ) : (
          <div className="">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 font-semibold">
                      Invoice #
                    </th>
                    <th className="text-left py-2 px-3 font-semibold">
                      Customer
                    </th>
                    <th className="text-right py-2 px-3 font-semibold">
                      Total
                    </th>
                    <th className="text-right py-2 px-3 font-semibold">Paid</th>
                    <th className="text-right py-2 px-3 font-semibold">Due</th>
                    <th className="text-left py-2 px-3 font-semibold">
                      Status
                    </th>
                    <th className="text-center py-2 px-3 font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {displaySales.map((sale) => (
                    <tr
                      key={sale.id}
                      className={`border-b border-border hover:bg-muted/50 transition-colors ${
                        sale.status === "DUE"
                          ? "border-l-4 border-l-red-600"
                          : ""
                      }`}
                    >
                      <td className="py-3 px-3 font-medium">
                        {sale.invoiceNumber}
                      </td>
                      <td className="py-3 px-3">{sale.customerName}</td>
                      <td className="py-3 px-3 text-right">
                        {formatCurrencyInBDT(sale.total)}
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-green-600 dark:text-green-400">
                        {formatCurrencyInBDT(sale.paid)}
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-red-600 dark:text-red-400">
                        {formatCurrencyInBDT(sale.due)}
                      </td>
                      <td className="py-3 px-3">
                        <StatusBadgeSales status={sale.status} />
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap justify-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onCollectPayment(sale)}
                            className="text-xs"
                            title="Collect Payment"
                          >
                            <CreditCard className="h-3 w-3" />
                          </Button>
                          {sale.type === "SALE" && onReturn && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onReturn(sale)}
                              className="text-xs"
                              title="Return"
                            >
                              <RotateCcw className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={onPageChange}
              limit={limit}
              onLimitChange={onLimitChange}
              canChangeLimit={false}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
