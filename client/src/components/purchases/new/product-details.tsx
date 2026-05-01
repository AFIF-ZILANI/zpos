import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PackagePlus, Trash2 } from "lucide-react";
import { nanoid } from "nanoid";
import { formatCurrencyInBDT } from "@/lib/utils";
import type { PurchaseRowDraft } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Item {
  id: string;
  name: string;
  category: {
    id: string;
    name: string;
  };
}

interface PurchaseItemsTableProps {
  itemsList: Item[];
  value: PurchaseRowDraft[];
  onChange: (rows: PurchaseRowDraft[]) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Sanitises a raw string input to a valid non-negative decimal.
 * Returns the sanitised string, or the previous value if invalid.
 */
function sanitiseDecimal(raw: string): string {
  // Allow only digits and a single decimal point
  if (!/^\d*\.?\d*$/.test(raw)) return raw; // caller decides what to do with invalid
  // Strip leading zeros before a digit (e.g. "007" → "7"), but keep "0."
  if (/^0\d/.test(raw)) return raw.replace(/^0+/, "");
  // Ensure "." becomes "0."
  if (raw.startsWith(".")) return "0" + raw;
  return raw;
}

function toNumber(v: string | number | undefined): number {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

// ─── Sub-component: single row ────────────────────────────────────────────────

interface RowProps {
  row: PurchaseRowDraft;
  /** Items available for selection in THIS row (global unselected + this row's current selection) */
  availableItems: Item[];
  onUpdate: (updates: Partial<PurchaseRowDraft>) => void;
  onRemove: () => void;
  index: number;
}

function PurchaseItemRow({
  row,
  availableItems,
  onUpdate,
  onRemove,
  index,
}: RowProps) {
  const quantity = toNumber(row.quantity);
  const unitCost = toNumber(row.unitCost);
  const rowTotal = quantity * unitCost;
  const isIncomplete =
    !row.variantId || !row.quantity || !row.unitCost || !row.sellingPrice;

  function handleDecimalChange(
    field: "quantity" | "unitCost" | "sellingPrice",
    raw: string,
  ) {
    // Reject anything that doesn't look like a decimal in progress
    if (raw !== "" && !/^\d*\.?\d*$/.test(raw)) return;
    const sanitised = raw === "" ? "" : sanitiseDecimal(raw);
    // Explicit assignment — never use a computed key here, it bypasses PurchaseRowDraft typing
    // and the spread in updateRow writes to the wrong property name silently.
    if (field === "quantity") onUpdate({ quantity: sanitised });
    else if (field === "unitCost") onUpdate({ unitCost: sanitised });
    else if (field === "sellingPrice") onUpdate({ sellingPrice: sanitised });
  }

  return (
    <TableRow
      className={
        isIncomplete && row.variantId
          ? "bg-amber-50/40 dark:bg-amber-950/10"
          : undefined
      }
    >
      {/* # */}
      <TableCell className="py-2 pl-4 text-muted-foreground text-sm font-mono w-8">
        {index + 1}
      </TableCell>

      {/* Item Name */}
      <TableCell className="py-2 pr-3">
        <Select
          value={row.variantId ?? ""}
          onValueChange={(v) => onUpdate({ variantId: v })}
        >
          <SelectTrigger className="w-full" aria-label="Select product">
            <SelectValue placeholder="Select product…" />
          </SelectTrigger>
          <SelectContent>
            {availableItems.length === 0 ? (
              <div className="px-3 py-4 text-sm text-center text-muted-foreground">
                All products already added
              </div>
            ) : (
              availableItems.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  <span className="font-medium">{item.name}</span>
                  <Badge variant="outline" className="ml-2 text-xs">
                    {item.category.name}
                  </Badge>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </TableCell>

      {/* Quantity */}
      <TableCell className="py-2 pr-3">
        <Input
          inputMode="decimal"
          placeholder="0"
          value={String(row.quantity ?? "")}
          disabled={!row.variantId}
          aria-label="Quantity"
          onChange={(e) => handleDecimalChange("quantity", e.target.value)}
        />
      </TableCell>

      {/* Unit Cost */}
      <TableCell className="py-2 pr-3">
        <Input
          inputMode="decimal"
          placeholder="0.00"
          value={String(row.unitCost ?? "")}
          disabled={!row.variantId}
          aria-label="Unit cost"
          onChange={(e) => handleDecimalChange("unitCost", e.target.value)}
        />
      </TableCell>

      {/* Selling Price */}
      <TableCell className="py-2 pr-3">
        <Input
          inputMode="decimal"
          placeholder="0.00"
          value={String(row.sellingPrice ?? "")}
          disabled={!row.variantId}
          aria-label="Selling price"
          onChange={(e) => handleDecimalChange("sellingPrice", e.target.value)}
        />
      </TableCell>

      {/* Row Total */}
      <TableCell className="py-2">
        <span className="font-medium tabular-nums whitespace-nowrap text-sm">
          {rowTotal > 0 ? (
            formatCurrencyInBDT(rowTotal)
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </span>
      </TableCell>

      {/* Delete */}
      <TableCell className="py-2 text-right pr-3">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          onClick={onRemove}
          aria-label="Remove row"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PurchaseItemsSection({
  itemsList,
  value,
  onChange,
}: PurchaseItemsTableProps) {
  // Set of variantIds already committed to OTHER rows (not counting the current row)
  const selectedIds = new Set(
    value.map((row) => row.variantId).filter(Boolean) as string[],
  );

  const addRow = () => {
    // Don't add a new blank row if the last row hasn't picked a product yet —
    // nudge the user to fill in what they have first.
    const lastRow = value[value.length - 1];
    if (lastRow && !lastRow.variantId) return;

    onChange([...value, { tempId: nanoid() }]);
  };

  const removeRow = (tempId: string) => {
    onChange(value.filter((row) => row.tempId !== tempId));
  };

  const updateRow = (tempId: string, updates: Partial<PurchaseRowDraft>) => {
    onChange(
      value.map((row) =>
        row.tempId === tempId ? { ...row, ...updates } : row,
      ),
    );
  };

  // Grand total across all rows
  const grandTotal = value.reduce((acc, row) => {
    return acc + toNumber(row.quantity) * toNumber(row.unitCost);
  }, 0);

  const allProductsAdded = selectedIds.size >= itemsList.length;
  const lastRowEmpty = value.length > 0 && !value[value.length - 1]?.variantId;

  return (
    <Card className="space-y-0">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center gap-4">
          <div>
            <CardTitle>Purchase Items</CardTitle>
            <CardDescription className="mt-1">
              Add items purchased from the supplier.
            </CardDescription>
          </div>
          <Button
            type="button"
            onClick={addRow}
            variant="outline"
            size="sm"
            disabled={allProductsAdded || lastRowEmpty}
            title={
              allProductsAdded
                ? "All products have been added"
                : lastRowEmpty
                  ? "Select a product for the current row first"
                  : undefined
            }
            className="shrink-0 gap-1.5"
          >
            <PackagePlus className="h-4 w-4" />
            Add Item
          </Button>
        </div>

        {/* Contextual hint */}
        {lastRowEmpty && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
            ↑ Select a product in the row above before adding another.
          </p>
        )}
        {allProductsAdded && value.length > 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            All available products have been added.
          </p>
        )}
      </CardHeader>

      <CardContent className="pb-4 overflow-x-auto">
        <Table className="min-w-[780px]">
          <TableHeader>
            <TableRow>
              <TableHead className="bg-muted w-6 pl-4">#</TableHead>
              <TableHead className="bg-muted w-[35%]">Product</TableHead>
              <TableHead className="bg-muted w-[12%]">Qty</TableHead>
              <TableHead className="bg-muted w-[14%]">Unit Cost (৳)</TableHead>
              <TableHead className="bg-muted w-[14%]">Sell Price (৳)</TableHead>
              <TableHead className="bg-muted w-[12%]">Total</TableHead>
              <TableHead className="bg-muted w-[5%]" />
            </TableRow>
          </TableHeader>

          <TableBody>
            {value.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground py-12"
                >
                  <div className="flex flex-col items-center gap-2">
                    <PackagePlus className="h-8 w-8 opacity-30" />
                    <span>No items added yet.</span>
                    <span className="text-xs">
                      Click &ldquo;Add Item&rdquo; to get started.
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              value.map((row, index) => {
                // For this row: show everything EXCEPT ids selected by OTHER rows
                const otherSelectedIds = new Set(
                  value
                    .filter((r) => r.tempId !== row.tempId && r.variantId)
                    .map((r) => r.variantId as string),
                );
                const availableItems = itemsList.filter(
                  (item) => !otherSelectedIds.has(item.id),
                );

                return (
                  <PurchaseItemRow
                    key={row.tempId}
                    row={row}
                    index={index}
                    availableItems={availableItems}
                    onUpdate={(updates) => updateRow(row.tempId, updates)}
                    onRemove={() => removeRow(row.tempId)}
                  />
                );
              })
            )}
          </TableBody>

          {/* Grand total footer */}
          {value.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-border">
                <td
                  colSpan={5}
                  className="py-3 pl-4 text-sm font-semibold text-right pr-3"
                >
                  Grand Total
                </td>
                <td className="py-3 font-bold tabular-nums text-sm whitespace-nowrap">
                  {formatCurrencyInBDT(grandTotal)}
                </td>
                <td />
              </tr>
            </tfoot>
          )}
        </Table>
      </CardContent>
    </Card>
  );
}
