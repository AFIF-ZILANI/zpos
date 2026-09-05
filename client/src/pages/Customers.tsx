import { useState } from "react";
import {
  Search,
  Plus,
  ShoppingBag,
  UserCheck,
  UserX,
  Users,
  Edit2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  useGetData,
  useListData,
  usePatchData,
  usePostData,
  usePutData,
} from "@/lib/api-request";
import { useDebounce } from "@/hooks/useDebounce";
import type {
  BasicDataResponse,
  CustomerStats,
  CustomerTableData,
  TableResponse,
} from "@/types";
import { formatDate } from "date-fns";
import { cn, formatCurrencyInBDT } from "@/lib/utils";
import Pagination from "@/components/pagination";
import { toast } from "sonner";
import { AddCustomerModal } from "@/components/customers/add-customer-modal";
import { Skeleton } from "@/components/ui/skeleton";
import { EditCustomerModal } from "@/components/customers/update-customer-modal";
import type {
  CreateCustomer,
  UpdateCustomer,
} from "@myapp/shared/schemas/customer.schema";
import { ToggleStatusModal } from "@/components/ToggleStatusModel";

export default function Customers() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "ACTIVE" | "INACTIVE"
  >("ALL");

  const [openAddNewCustomerModal, setOpenAddNewCustomerModal] = useState(false);
  const [openUpdateCustomerModal, setOpenUpdateCustomerModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] =
    useState<UpdateCustomer | null>(null);

  // ------ Fetch Data ------
  // Search was previously fed straight into the query key, so every keystroke
  // fired a request. Debounced to match the other list screens.
  const debouncedSearch = useDebounce(search, 300);

  const {
    data: customerData,
    isFetching: isCustomerFetching,
    refetch: refetchCustomers,
  } = useListData<TableResponse<CustomerTableData>>(
    // URLSearchParams, not interpolation — an unencoded "&" or "#" in the
    // search box otherwise corrupts the query string.
    `/customers/get/all?${new URLSearchParams({
      page: String(page),
      limit: String(pageSize),
      search: debouncedSearch,
      status: statusFilter,
    })}`,
  );
  const { data: customerStatsData, refetch: refetchCustomerStats } = useGetData<
    BasicDataResponse<CustomerStats>
  >("/customers/get/stats");

  const { mutateAsync: deleteCustomer, isPending: isDeletePending } =
    usePatchData("/customers/toggle-status");

  const { mutate: createCustomer, isPending: isCreatingNewCustomer } =
    usePostData("/customers/create");

  const { mutate: updateCustomer, isPending: isUpdating } =
    usePutData("/customers/update");

  const customers = customerData?.data.items || [];
  const totalPages = customerData?.data.totalPages || 1;

  const customerStats = customerStatsData?.data || {
    totalCustomers: 0,
    activeCustomers: 0,
    inactiveCustomers: 0,
    frequentCustomers: 0,
  };

  const stats = [
    {
      label: "Total Customers",
      value: customerStats.totalCustomers,
      icon: ShoppingBag,
      color: "text-primary",
    },
    {
      label: "Active",
      value: customerStats.activeCustomers,
      icon: UserCheck,
      color: "text-green-600",
    },
    {
      label: "Inactive",
      value: customerStats.inactiveCustomers,
      icon: UserX,
      color: "text-muted-foreground",
    },
    {
      label: "Frequent Customers",
      value: customerStats.frequentCustomers,
      icon: Users,
      color: "text-amber-600",
    },
  ];

  const handleDeleteCustomer = async (id: string) => {
    await deleteCustomer(
      { id },
      {
        onSuccess: () => {
          toast.success("Customer Status Updated successfully");
          refetchCustomers();
          refetchCustomerStats();
        },
        onError: (error) => {
          toast.error(error.message || "Failed to update customer status");
        },
      },
    );
  };

  const handleCreateNewCustomer = async (data: CreateCustomer) => {
    createCustomer(data, {
      onSuccess: () => {
        toast.success("Customer created successfully");
        refetchCustomers();
        refetchCustomerStats();
        setOpenAddNewCustomerModal(false);
      },
      onError: (error) => {
        toast.error(error.message ?? "Failed to create customer");
      },
    });
  };

  const handleUpdateCustomer = async (data: CreateCustomer) => {
    updateCustomer(data, {
      onSuccess: () => {
        toast.success("Customer updated successfully");
        refetchCustomers();
        refetchCustomerStats();
        setSelectedCustomer(null);
        setOpenUpdateCustomerModal(false);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update customer");
      },
    });
  };

  const openUpdateModal = (customer: UpdateCustomer) => {
    setSelectedCustomer(customer);
    setOpenUpdateCustomerModal(true);
  };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {customers.length} total customers
          </p>
        </div>
        <Button onClick={() => setOpenAddNewCustomerModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Customer
        </Button>
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
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              // Without this a search started from page 2+ asks the server for
              // page 2 of the new, shorter result set and renders an empty table.
              setPage(1);
            }}
            placeholder="Search by name or email..."
            className="pl-9 h-9"
          />
        </div>
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {(["ALL", "ACTIVE", "INACTIVE"] as const).map((s) => (
            <button
              key={s}
              onClick={() => {
                setStatusFilter(s);
                setPage(1);
              }}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all capitalize ${statusFilter === s ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card className="border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                  Name
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                  Email
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                  Phone
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                  Total Orders
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                  Total Spent
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                  Status
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                  Last Visit
                </th>
                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {!isCustomerFetching &&
                customers.length > 0 &&
                customers.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-foreground">
                          {p.name || "Unknown"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {p.email || "N/A"}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {p.phone || "N/A"}
                    </td>
                    <td className="px-4 py-3 text-sm text-left text-muted-foreground">
                      {p.totalOrders ?? 0}
                    </td>
                    <td className="px-4 py-3 text-sm text-left text-muted-foreground">
                      {formatCurrencyInBDT(p.totalSpent ?? 0)}
                    </td>
                    <td>
                      <span
                        className={cn(
                          "px-1 py-1 text-left",
                          p.status === "ACTIVE" &&
                            "bg-green-100 text-green-600 rounded text-xs",
                          p.status === "INACTIVE" &&
                            "bg-red-100 text-red-600 rounded text-xs",
                        )}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-left text-muted-foreground">
                      {p.lastVisit
                        ? formatDate(p.lastVisit, "dd MMM yyyy")
                        : "N/A"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() =>
                            openUpdateModal({
                              id: p.id,
                              name: p.name,
                              email: p.email,
                              address: p.address,
                              phone: p.phone,
                            })
                          }
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <ToggleStatusModal
                          handleToggleStatus={handleDeleteCustomer}
                          isActive={p.status === "ACTIVE"}
                          isPending={isDeletePending}
                          id={p.id}
                          name={p.name}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              {isCustomerFetching &&
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="hover:bg-muted/20 transition-colors">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-5 w-24" />
                      </td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
          {customers.length === 0 && !isCustomerFetching && (
            <div className="py-16 text-center text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No customers found</p>
            </div>
          )}
        </div>
      </Card>
      <Pagination
        totalPages={totalPages}
        onPageChange={setPage}
        page={page}
        limit={pageSize}
        onLimitChange={setPageSize}
      />

      {customers.length === 0 && (
        <div className="py-20 text-center text-muted-foreground">
          <Search className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>No customers found</p>
        </div>
      )}
      <AddCustomerModal
        handleCreateCustomer={handleCreateNewCustomer}
        isCreating={isCreatingNewCustomer}
        open={openAddNewCustomerModal}
        onClose={() => setOpenAddNewCustomerModal(false)}
      />
      <EditCustomerModal
        customer={selectedCustomer}
        handleUpdateCustomer={handleUpdateCustomer}
        isUpdating={isUpdating}
        open={openUpdateCustomerModal}
        onClose={() => setOpenUpdateCustomerModal(false)}
      />
    </div>
  );
}
