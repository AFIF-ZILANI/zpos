import type { Sale } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadgeSales } from "@/components/status-badge";
import { formatCurrencyInBDT } from "@/lib/utils";
import { formatDate } from "date-fns";

interface SaleDetailModalProps {
  sale: Sale | null;
  isOpen: boolean;
  onClose: () => void;
}

function Row({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: React.ReactNode;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={
          emphasis
            ? "font-mono text-base font-semibold text-foreground"
            : "font-mono text-sm text-foreground"
        }
      >
        {value}
      </span>
    </div>
  );
}

/**
 * Read-only summary of a sale. The "View" action previously only raised a toast
 * and opened nothing.
 *
 * This renders what the sales list already carries. Per-line-item breakdown
 * would need a sale-detail endpoint on the server, which does not exist yet.
 */
export function SaleDetailModal({ sale, isOpen, onClose }: SaleDetailModalProps) {
  if (!sale) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono">{sale.invoiceNumber}</DialogTitle>
          <DialogDescription>
            {formatDate(new Date(sale.date), "EEEE, MMMM d, yyyy · h:mm a")}
          </DialogDescription>
        </DialogHeader>

        <div className="divide-y divide-border">
          <div className="pb-2">
            <Row label="Customer" value={sale.customerName || "Walk-in"} />
            <Row
              label="Items"
              value={`${sale.items} item${sale.items === 1 ? "" : "s"}`}
            />
            <div className="flex items-center justify-between gap-4 py-1.5">
              <span className="text-sm text-muted-foreground">Status</span>
              <StatusBadgeSales status={sale.status} />
            </div>
          </div>

          <div className="py-2">
            <Row label="Total" value={formatCurrencyInBDT(sale.total)} emphasis />
            <Row label="Paid" value={formatCurrencyInBDT(sale.paid)} />
            <Row
              label="Due"
              value={
                <span className={sale.due > 0 ? "text-destructive" : undefined}>
                  {formatCurrencyInBDT(sale.due)}
                </span>
              }
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
