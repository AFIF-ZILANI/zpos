import type { Category, FlatCategory } from "@/types";
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
