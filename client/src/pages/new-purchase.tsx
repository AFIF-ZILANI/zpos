import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import BasicDetailsSection from "@/components/purchases/new/basic-details";
import ProductDetailsTable from "@/components/purchases/new/product-details";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import {
  newPurchaseSchema,
  type NewPurchase,
} from "@myapp/shared/schemas/purchase.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useGetData, usePostData } from "@/lib/api-request";
import { Form } from "@/components/ui/form";
import { useEffect, useState } from "react";
import type { BarcodePrintData, RowData } from "@/types";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";

import { DownloadBarcodePDFModal } from "@/components/purchases/download-barcode-modal";

export default function NewPurchaseOrderPage() {
  const [open, setOpen] = useState(false);
  const [rowData, setRowData] = useState<RowData[]>([]);
  const { data: itemsData } = useGetData<{
    data: {
      id: string;
      name: string;
      category: {
        id: string;
        name: string;
      };
    }[];
  }>("/products/purchase");

  const {
    mutate: createPurchase,
    isPending: isCreatingPurchase,
    data: barcodeData,
  } = usePostData("/purchase/create");

  const barcodes =
    (barcodeData as { data: { barcodeData: BarcodePrintData[] } })?.data
      ?.barcodeData || [];

  const itemsList = itemsData?.data || [];
  const form = useForm<NewPurchase>({
    resolver: zodResolver(newPurchaseSchema),
    defaultValues: {
      date: new Date(),
      invoiceNo: "",
      supplier: "",
      email: "",
      phone: "",
      note: "",
      products: [],
    },
  });

  useEffect(() => {
    const products = rowData.map((r) => ({
      variantId: r.variantId!,
      quantity: r.quantity,
      unitCost: r.unitCost,
      sellingPrice: r.sellingPrice,
    }));

    form.setValue("products", products, { shouldValidate: true });
  }, [rowData, form]);

  function onSubmit(data: NewPurchase) {
    createPurchase(data, {
      onSuccess: () => {
        toast.success("Purchase created successfully");
        setOpen(true);
        form.reset();
        setRowData([]);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create purchase");
      },
    });
  }
  return (
    <div className="min-h-screen bg-background">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          {/* Header */}
          <div className="border-b border-border bg-card sticky top-0 z-10">
            <div className="max-w-6xl mx-auto px-6 py-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Link href="/purchases">
                    <Button variant="ghost" size="sm" className="gap-2">
                      <ChevronLeft className="w-4 h-4" />
                      Back
                    </Button>
                  </Link>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                      New Purchase Order
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                      Create a new purchase order for your suppliers
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="max-w-6xl mx-auto px-6 py-8">
            <div className="space-y-6">
              {/* Section 1: Basic Details */}
              <BasicDetailsSection form={form} />

              {/* Section 2: Product Details */}
              <ProductDetailsTable
                itemsList={itemsList}
                onChange={setRowData}
                value={rowData}
              />

              {/* Footer Actions */}
              <div className="flex justify-end gap-3 pt-4">
                <Link href="/purchases">
                  <Button variant="outline">Cancel</Button>
                </Link>
                <Button
                  type="submit"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium gap-2"
                  disabled={isCreatingPurchase}
                >
                  {isCreatingPurchase ? (
                    <span className="flex items-center gap-2">
                      <Spinner /> Creating...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      Create Purchase Order
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </Form>
      <DownloadBarcodePDFModal
        open={open}
        onClose={() => setOpen(false)}
        data={barcodes}
      />
    </div>
  );
}

// Helper component for check icon
function Check({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}
