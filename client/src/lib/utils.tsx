import type { Category, FlatCategory, ProductTableRow } from "@/types";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrencyInBDT(amount: number) {
  const number = Number(amount) || 0;

  const formatted = number
    .toFixed(2)
    .replace(/\.00$/, "") // remove .00
    .replace(/(\.\d)0$/, "$1") // remove trailing zero like .50 → .5
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  return `৳${formatted}`;
}

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
  const map: Record<string, string> = {
    PAID: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    DUE: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    PARTIAL: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${map[status] || ""}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export function flattenCategories(categories: Category[]): FlatCategory[] {
  const result: FlatCategory[] = [];

  function walk(nodes: Category[]) {
    for (const node of nodes) {
      const { id, name, description, children } = node;

      result.push({ id, name, description });

      if (children && children.length > 0) {
        walk(children);
      }
    }
  }

  walk(categories);
  return result;
}
