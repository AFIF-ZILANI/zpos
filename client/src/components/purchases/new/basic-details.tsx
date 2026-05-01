import { useState } from "react";
import { Card } from "@/components/ui/card";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { FileText, User, Mail, Phone, CalendarIcon } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import type { NewPurchase } from "@myapp/shared/schemas/purchase.schema";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";

interface BasicDetailsProps {
  form: UseFormReturn<NewPurchase>;
}

export default function BasicDetailsSection({ form }: BasicDetailsProps) {
  // Controlled open state so we can close the popover after date selection
  const [calendarOpen, setCalendarOpen] = useState(false);

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground">Order Details</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Enter basic purchase order information
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">
        {/* Order Date */}
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>
                Order Date <span className="text-destructive">*</span>
              </FormLabel>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      className="pl-3 text-left font-normal w-full justify-start"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
                      {field.value instanceof Date ? (
                        format(field.value, "PPP")
                      ) : (
                        <span className="text-muted-foreground">
                          Pick a date
                        </span>
                      )}
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent align="start" className="p-0 w-auto">
                  <Calendar
                    mode="single"
                    selected={
                      field.value instanceof Date ? field.value : undefined
                    }
                    onSelect={(date) => {
                      field.onChange(date);
                      setCalendarOpen(false); // close after selection
                    }}
                    // Disallow future dates — this is a purchase record, not a forecast
                    disabled={(date) => date > new Date()}
                    autoFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Invoice Number */}
        <FormField
          control={form.control}
          name="invoiceNo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Invoice No{" "}
                <span className="text-xs text-muted-foreground font-normal">
                  (Optional)
                </span>
              </FormLabel>
              <FormControl>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="INV-2401-001"
                    className="pl-10"
                    {...field}
                    value={String(field.value ?? "")} // prevent uncontrolled→controlled warning
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Supplier Name */}
        <FormField
          control={form.control}
          name="supplier"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Supplier <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="ABC Textiles Ltd"
                    className="pl-10"
                    {...field}
                    value={field.value ?? ""}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Email */}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Email{" "}
                <span className="text-xs text-muted-foreground font-normal">
                  (Optional)
                </span>
              </FormLabel>
              <FormControl>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    type="email"
                    placeholder="contact@supplier.com"
                    className="pl-10"
                    {...field}
                    value={String(field.value || "")}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Phone */}
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Contact No <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                {/*
                  Prefix "+88" is rendered as a styled inert sibling div,
                  not inside the input's padding. This avoids magic pl-[4.5rem]
                  and works regardless of font scaling.
                */}
                <div className="flex">
                  <div className="flex items-center gap-1.5 px-3 border border-r-0 rounded-l-md bg-muted text-muted-foreground text-sm select-none shrink-0">
                    <Phone className="w-3.5 h-3.5" />
                    <span>+88</span>
                  </div>
                  <Input
                    type="tel"
                    placeholder="01xxxxxxxxx"
                    className="rounded-l-none"
                    {...field}
                    value={field.value ?? ""}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </Card>
  );
}
