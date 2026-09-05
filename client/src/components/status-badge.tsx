import type { ProductTableRow } from "@/types";

export function StatusBadge({ status }: { status: ProductTableRow["status"] }) {
  const cfg = {
    IN_STOCK: {
      label: "In Stock",
      class:
        "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    },
    LOW_STOCK: {
      label: "Low Stock",
      class:
        "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    },
    OUT_OF_STOCK: {
      label: "Out of Stock",
      class: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    },
  }[status];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${cfg.class}`}
    >
      {cfg.label}
    </span>
  );
}

export function StatusBadgeSales({ status }: { status: string }) {
  // PAID/DUE/PARTIAL map to the three semantic states the palette
  // actually has (success/destructive/warning); CANCELLED is a closed,
  // non-urgent state, so it gets the quiet neutral treatment instead of
  // competing for attention with a status color.
  const map: Record<string, string> = {
    PAID: "bg-success/10 text-success",
    DUE: "bg-destructive/10 text-destructive",
    PARTIAL: "bg-warning/10 text-warning",
    CANCELLED: "bg-muted text-muted-foreground",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${map[status] || ""}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()}
    </span>
  );
}
