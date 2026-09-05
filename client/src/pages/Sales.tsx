import { useState, useCallback, lazy, Suspense } from "react";
// import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDateFilter } from "@/hooks/useDateFilter";
import { useDebounce } from "@/hooks/useDebounce";
import type {
  Sale,
  PaymentStatus,
  OrderStatusData,
  BasicDataResponse,
  SaleMetrics,
  TimeLine,
  PaymentCollectPayload,
} from "@/types";

import { TopBar } from "@/components/sales/TopBar";
import { StatCards } from "@/components/sales/SalesStats";
import { UrgentTable } from "@/components/sales/UrgentTable";
// Recharts is loaded on demand — the sales table and KPI row should not wait
// on a ~400 kB charting library to paint.
/** Card-shaped placeholder shown while the chart chunk downloads. */
function OrderStatusChartSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="p-6 pb-2">
        <div className="text-lg font-semibold">Order Status</div>
      </div>
      <div className="p-6 pt-0 flex items-center justify-center h-80">
        <div className="w-64 h-64 rounded-full bg-muted animate-pulse" />
      </div>
    </div>
  );
}

const OrderStatusChart = lazy(() =>
  import("@/components/sales/OrderStatusChart").then((m) => ({
    default: m.OrderStatusChart,
  })),
);
import { SalesHistoryTable } from "@/components/sales/SaleHistoryTable";
import { SaleDetailModal } from "@/components/sales/SaleDetailModal";
import CollectPaymentModal from "@/components/sales/CollectPaymentModal";
// import { DeleteConfirmationModal } from "@/components/sales/DeleteConformationModal";
import { useGetData, useListData, usePostData } from "@/lib/api-request";
import { toast } from "sonner";

// const COLORS = {
//   emerald: "#1D9E75", // ← primary brand / emerald from your CSS
//   blue: "#378ADD", // ← matches --chart-2
//   amber: "#EF9F27", // ← matches --chart-3
//   pink: "#D4537E", // ← matches --chart-4 (was red, now pink — softer)
//   violet: "#7F77DD", // ← matches --chart-5
// };

// const Cdata: OrderStatusData[] = [
//   {
//     name: "Completed",
//     value: 60,
//     fill: COLORS.emerald,
//   },
//   {
//     name: "Returned",
//     value: 20,
//     fill: COLORS.blue,
//   },
//   {
//     name: "Pending",
//     value: 20,
//     fill: COLORS.amber,
//   },
// ];

export default function SalesPage() {
  // const queryClient = useQueryClient();
  const dateFilter = useDateFilter("THIS_MONTH");

  // State for modals
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  // const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // State for history filters
  const [historySearch, setHistorySearch] = useState("");
  const [historyStatus, setHistoryStatus] = useState<PaymentStatus | "ALL">(
    "ALL",
  );
  const [historyPage, setHistoryPage] = useState(1);

  const [historyPageSize, setHistoryPageSize] = useState(10);

  const [urgentPage, setUrgentPage] = useState(1);
  const [urgentPageSize, setUrgentPageSize] = useState(5);

  // Debounce search
  const debouncedSearch = useDebounce(historySearch, 300);

  // Queries
  const {
    data: statsData,
    isFetching: statsFetching,
    refetch: refetchStats,
  } = useGetData<BasicDataResponse<SaleMetrics>>(
    `/sales/get/stats?from=${dateFilter.from}&to=${dateFilter.to}`,
    ["sales", "stats", dateFilter.from, dateFilter.to],
  );

  const urgentQuery = new URLSearchParams({
    from: dateFilter.from,
    to: dateFilter.to,
    page: String(urgentPage),
    limit: String(urgentPageSize),
    status: "UNPAID",
    type: "SALE",
  });

  const {
    data: urgentData,
    isFetching: urgentFetching,
    refetch: refetchUrgent,
  } = useListData<{
    data: {
      data: Sale[];
      pagination: { totalPages: number };
    };
  }>(`/sales/get/all?${urgentQuery}`, [
    "sales",
    "all",
    urgentPage.toString(),
    urgentPageSize.toString(),
    "UNPAID",
    "SALE",
  ]);

  const { data: chartData, isFetching: chartFetching } = useGetData<{
    data: { data: OrderStatusData[]; total: number };
  }>(`/sales/get/chart?from=${dateFilter.from}&to=${dateFilter.to}`, [
    "sales",
    "chart",
    dateFilter.from,
    dateFilter.to,
  ]);

  const historyQuery = new URLSearchParams({
    from: dateFilter.from,
    to: dateFilter.to,
    page: String(historyPage),
    limit: String(historyPageSize),
    search: debouncedSearch,
    status: historyStatus,
  });

  const {
    data: historyData,
    isFetching: historyFetching,
    refetch: refetchHistory,
  } = useListData<{
    data: {
      data: Sale[];
      pagination: { totalPages: number };
    };
  }>(`/sales/get/all?${historyQuery}`, [
    "sales",
    "all",
    dateFilter.from,
    dateFilter.to,
    debouncedSearch,
    historyStatus,
    historyPage.toString(),
    historyPageSize.toString(),
  ]);

  const stats: SaleMetrics = statsData?.data || {
    totalRevenue: { value: 0, trend: { isPositive: false, delta: 0 } },
    totalSales: { value: 0, trend: { isPositive: false, delta: 0 } },
    uncollectedRevenue: { value: 0, trend: { isPositive: false, delta: 0 } },
    voidedSales: { value: 0, trend: { isPositive: false, delta: 0 } },
  };
  const urgent = urgentData?.data.data || [];
  const historyItems = historyData?.data.data || [];
  const historyTotalPages = historyData?.data.pagination?.totalPages ?? 1;
  const urgentTotalPages = urgentData?.data.pagination?.totalPages ?? 1;

  // Mutations

  const { mutate: collectPayment, isPending: paymentPending } = usePostData(
    "/sales/payment/create",
  );

  // const deleteMutation = useMutation({
  //   mutationFn: async () => {
  //     if (!selectedSale) throw new Error("No sale selected");
  //     const res = await fetch(`/api/sales/${selectedSale.id}/delete`, {
  //       method: "PATCH",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({}),
  //     });
  //     return res.json();
  //   },
  //   onSuccess: () => {
  //     queryClient.invalidateQueries({ queryKey: ["sales", "history"] });
  //     queryClient.invalidateQueries({ queryKey: ["sales", "stats"] });
  //   },
  // });

  // Handlers
  const handleDateRangeChange = useCallback(
    (range: TimeLine) => {
      dateFilter.setRange(range);
      setHistoryPage(1); // Reset to first page
    },
    [dateFilter],
  );

  const handleCustomDatesChange = useCallback(
    (from: Date, to: Date) => {
      dateFilter.setCustomDates(from, to);
      setHistoryPage(1);
    },
    [dateFilter],
  );

  const handleExport = useCallback(async () => {
    const params = new URLSearchParams({
      from: dateFilter.from,
      to: dateFilter.to,
      status: historyStatus,
    });
    const url = `/api/sales/export?${params}`;
    const link = document.createElement("a");
    link.href = url;
    link.download = `sales-export-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [dateFilter, historyStatus]);

  const handleCollectPayment = useCallback((sale: Sale) => {
    setSelectedSale(sale);
    setIsPaymentModalOpen(true);
  }, []);

  const handleDelete = useCallback((sale: Sale) => {
    setSelectedSale(sale);
    // setIsDeleteModalOpen(true);
  }, []);

  const handlePaymentSubmit = (payload: PaymentCollectPayload) => {
    collectPayment(payload, {
      onSuccess: () => {
        toast.success("Payment collected successfully");
        setIsPaymentModalOpen(false);
        refetchHistory();
        refetchUrgent();
        refetchStats();
        setSelectedSale(null);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
  };

  // const handleDeleteConfirm = useCallback(async () => {
  //   await deleteMutation.mutateAsync();
  // }, [deleteMutation]);

  return (
    <div className="space-y-6 flex-1 p-6 lg:p-8 bg-background">
      {/* Top Bar */}
      <TopBar
        onDateRangeChange={handleDateRangeChange}
        onCustomDatesChange={handleCustomDatesChange}
        currentRange={dateFilter.range}
        customFrom={dateFilter.customFrom}
        customTo={dateFilter.customTo}
      />

      {/* Stats Row */}
      {/* <StatCards metrics={metrics} isLoading={false} /> */}
      <StatCards metrics={stats} isLoading={statsFetching} />

      {/* Middle Row (2 columns) */}
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
        {/* Urgent Table */}
        <div className="col-span-1 lg:col-span-3">
          <UrgentTable
            sales={urgent}
            page={urgentPage}
            limit={urgentPageSize}
            totalPages={urgentTotalPages}
            onPageChange={setUrgentPage}
            onLimitChange={setUrgentPageSize}
            isLoading={urgentFetching}
            onCollectPayment={handleCollectPayment}
          />
        </div>

        {/* Order Status Chart */}
        <Suspense fallback={<OrderStatusChartSkeleton />}>
          <OrderStatusChart
            data={chartData?.data.data}
            total={chartData?.data.total}
            isLoading={chartFetching}
          />
        </Suspense>
      </div>

      {/* Sales History Table */}
      <SalesHistoryTable
        sales={historyItems}
        totalPages={historyTotalPages}
        page={historyPage}
        limit={historyPageSize}
        onLimitChange={(limit) => {
          setHistoryPageSize(limit);
        }}
        isLoading={historyFetching}
        onSearchChange={(search) => {
          setHistorySearch(search);
          setHistoryPage(1);
        }}
        onPageChange={setHistoryPage}
        onStatusChange={(status) => {
          setHistoryStatus(status);
          setHistoryPage(1);
        }}
        onExport={handleExport}
        onView={(sale) => {
          setSelectedSale(sale);
          setIsDetailModalOpen(true);
        }}
        onDelete={handleDelete}
        currentSearch={historySearch}
        currentStatus={historyStatus}
      />

      {/* Modals */}
      <SaleDetailModal
        sale={selectedSale}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
      />
      <CollectPaymentModal
        invoiceNo={selectedSale?.invoiceNumber ?? ""}
        open={isPaymentModalOpen}
        confirming={paymentPending}
        onClose={() => {
          setIsPaymentModalOpen(false);
        }}
        onSubmit={handlePaymentSubmit}
      />

      {/* <DeleteConfirmationModal
        sale={selectedSale}
        isOpen={isDeleteModalOpen}
        isLoading={deleteMutation.isPending}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedSale(null);
        }}
        onConfirm={handleDeleteConfirm}
      /> */}
    </div>
  );
}
