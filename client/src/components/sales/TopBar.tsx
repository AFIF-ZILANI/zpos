import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import { format } from "date-fns";
import type { TimeLine } from "@/types";

interface TopBarProps {
  onDateRangeChange: (range: TimeLine) => void;
  onCustomDatesChange: (from: Date, to: Date) => void;
  currentRange: TimeLine;
  customFrom?: Date;
  customTo?: Date;
}

export function TopBar({
  onDateRangeChange,
  onCustomDatesChange,
  currentRange,
  customFrom,
  customTo,
}: TopBarProps) {
  const [showCustom, setShowCustom] = useState(currentRange === "CUSTOM");

  const handleRangeChange = (range: TimeLine) => {
    onDateRangeChange(range);
    setShowCustom(range === "CUSTOM");
  };

  const ranges: { value: TimeLine; label: string }[] = [
    { value: "TODAY", label: "Today" },
    // { value: "YESTERDAY", label: "Yesterday" },
    { value: "THIS_WEEK", label: "This week" },
    { value: "THIS_MONTH", label: "This month" },
    // { value: "CUSTOM", label: "Custom" },
  ];

  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
      {/* Title */}
      <h1 className="text-3xl font-bold">Sales</h1>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Range Selector */}
        <div className="flex items-center rounded-lg bg-muted p-1">
          {ranges.map((range) => (
            <button
              key={range.value}
              onClick={() => handleRangeChange(range.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition
                ${
                  currentRange === range.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
            >
              {range.label}
            </button>
          ))}
        </div>

        {/* Custom Range */}
        {showCustom && (
          <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 shadow-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />

            <input
              type="date"
              value={customFrom ? format(customFrom, "yyyy-MM-dd") : ""}
              onChange={(e) => {
                if (e.target.value && customTo) {
                  onCustomDatesChange(new Date(e.target.value), customTo);
                }
              }}
              className="bg-transparent text-sm outline-none"
            />

            <span className="text-muted-foreground text-sm">—</span>

            <input
              type="date"
              value={customTo ? format(customTo, "yyyy-MM-dd") : ""}
              onChange={(e) => {
                if (e.target.value && customFrom) {
                  onCustomDatesChange(customFrom, new Date(e.target.value));
                }
              }}
              className="bg-transparent text-sm outline-none"
            />
          </div>
        )}
      </div>

      {/* CTA */}
      <Button className="bg-primary hover:bg-primary/90">+ New Sale</Button>
    </div>
  );
}
