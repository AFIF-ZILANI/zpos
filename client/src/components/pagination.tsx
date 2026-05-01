import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

type PaginationProps = {
  page: number;
  totalPages: number;
  limit: number;
  canChangeLimit?: boolean;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
};

const LIMIT_OPTIONS = [5, 10, 20, 50, 100];

export default function Pagination({
  page,
  totalPages,
  limit,
  canChangeLimit = true,
  onPageChange,
  onLimitChange,
}: PaginationProps) {
  if (totalPages <= 0) return null;

  const pages = [];

  for (let i = 1; i <= totalPages; i++) {
    pages.push(i);
  }

  return (
    <div className="flex items-center justify-between mt-6 gap-4 flex-wrap">
      {/* Rows per page */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Rows per page</span>

        <select
          value={limit}
          disabled={!canChangeLimit}
          onChange={(e) => onLimitChange(Number(e.target.value))}
          className="border rounded-md px-2 py-1 bg-background disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {LIMIT_OPTIONS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </div>

      {/* Pagination controls */}
      <div className="flex items-center gap-2">
        {/* First */}
        <Button
          variant="outline"
          size="sm"
          disabled={page === 1}
          onClick={() => onPageChange(1)}
        >
          <ChevronsLeft className="w-4 h-4" />
        </Button>

        {/* Prev */}
        <Button
          variant="outline"
          size="sm"
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        {/* Page numbers */}
        {pages.map((p) => (
          <Button
            key={p}
            size="sm"
            variant={p === page ? "default" : "outline"}
            onClick={() => onPageChange(p)}
            className="w-9 h-9"
          >
            {p}
          </Button>
        ))}

        {/* Next */}
        <Button
          variant="outline"
          size="sm"
          disabled={page === totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>

        {/* Last */}
        <Button
          variant="outline"
          size="sm"
          disabled={page === totalPages}
          onClick={() => onPageChange(totalPages)}
        >
          <ChevronsRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
