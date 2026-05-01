import { useGetData } from "@/lib/api-request";
import { useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { formatCurrencyInBDT } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PaymentMethod, PaymentStatus } from "@/types";

interface PaymentData {
  saleId: string;
  invoiceNo: string;
  customer: CustomerInfo;
  status: PaymentStatus;
  paidAmount: number;
  totalAmount: number;
}

export interface CustomerInfo {
  name: string;
  phone: string;
  email: string;
  address: string;
}

interface CollectPaymentModalProps {
  open: boolean;
  onClose: () => void;
  invoiceNo: string;
  confirming: boolean;
  onSubmit: (payload: {
    saleId: string;
    amount: number;
    method: PaymentMethod;
    reference?: string;
  }) => void;
}

export default function CollectPaymentModal(props: CollectPaymentModalProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onClose}>
      {props.invoiceNo && <CollectPaymentForm {...props} />}
    </Dialog>
  );
}

function CollectPaymentForm({
  onClose,
  invoiceNo,
  confirming,
  onSubmit,
}: Omit<CollectPaymentModalProps, "open">) {
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const {
    data: paymentData,
    isLoading,
    error,
  } = useGetData<{ data: PaymentData }>(
    `/sales/get/payment/collect?invoiceNo=${invoiceNo}`,
  );

  const data = paymentData?.data;

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!amount || parseFloat(amount) <= 0) {
      newErrors.amount = "Amount must be greater than 0";
    }

    if (data && parseFloat(amount) > data.totalAmount - data.paidAmount) {
      newErrors.amount = `Cannot exceed remaining balance of ৳${data.totalAmount - data.paidAmount}`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm() || !data) return;

    onSubmit({
      saleId: data.saleId,
      method,
      reference: method !== "CASH" ? reference : undefined,
      amount: parseFloat(amount),
    });
  };

  const remainingBalance = data ? data.totalAmount - data.paidAmount : 0;

  return (
    <DialogContent className="w-full max-w-lg">
      <DialogHeader className="bg-linear-to-r from-primary/5 to-transparent">
        <DialogTitle>Collect Payment</DialogTitle>
      </DialogHeader>

      <div className="space-y-5 max-h-[calc(100vh-250px)] overflow-y-auto pr-4">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        )}

        {error && (
          <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">
              Failed to load payment details. Please try again.
            </p>
          </div>
        )}

        {data && !isLoading && !error && (
          <>
            {/* Invoice & Payment Status */}
            <div className="flex flex-col gap-3 p-2 bg-muted rounded-lg border border-muted-border">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <p className="text-muted-foreground text-xs">Invoice</p>
                  <p className="font-semibold text-foreground">
                    {data.invoiceNo}
                  </p>
                </div>
                <div className="flex flex-col gap-1 items-end">
                  <p className="text-muted-foreground text-xs">Status</p>
                  <p
                    className={`font-semibold text-sm px-2 py-1 rounded ${
                      data.status === "PAID"
                        ? "bg-primary/20 text-primary"
                        : data.status === "PARTIAL"
                          ? "bg-chart-3/20 text-chart-3"
                          : "bg-destructive/20 text-destructive"
                    }`}
                  >
                    {data.status}
                  </p>
                </div>
              </div>

              <div className="h-px bg-border"></div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <p className="text-muted-foreground text-xs">Paid</p>
                  <p className="font-semibold text-foreground">
                    {formatCurrencyInBDT(data.paidAmount)}
                  </p>
                </div>
                <div className="flex flex-col gap-1 text-right">
                  <p className="text-muted-foreground text-xs">Remaining</p>
                  <p className="font-semibold text-primary">
                    {formatCurrencyInBDT(remainingBalance)}
                  </p>
                </div>
              </div>
            </div>

            {/* Customer Info */}
            <div className="border border-card-border rounded-lg p-3 bg-muted">
              <p className="text-sm font-semibold text-foreground mb-3">
                Customer Information
              </p>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground text-xs">Name</span>
                  <p className="font-medium text-foreground">
                    {data.customer.name}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Phone</span>
                  <p className="font-medium text-foreground">
                    {data.customer.phone}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Email</span>
                  <p className="font-medium text-foreground truncate">
                    {data.customer.email}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Address</span>
                  <p className="font-medium text-foreground">
                    {data.customer.address}
                  </p>
                </div>
              </div>
            </div>

            {/* Payment Form */}
            <div className="space-y-4 border-t border-card-border pt-5">
              {/* Amount Input */}
              <div className="space-y-2">
                <label
                  htmlFor="amount"
                  className="text-sm font-semibold text-foreground"
                >
                  Payment Amount <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    ৳
                  </span>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0"
                    value={amount}
                    min={0}
                    max={remainingBalance}
                    step="0.01"
                    disabled={confirming}
                    onChange={(e) => {
                      const value = e.target.value;

                      // Prevent negative numbers
                      if (Number(value) < 0) return;

                      setAmount(value);

                      if (errors.amount) {
                        setErrors({ ...errors, amount: "" });
                      }
                    }}
                    onKeyDown={(e) => {
                      // Block minus key
                      if (e.key === "-") {
                        e.preventDefault();
                      }
                    }}
                    className={`pl-7 ${
                      errors.amount ? "border-destructive bg-destructive/5" : ""
                    }`}
                  />
                </div>
                {errors.amount && (
                  <p className="text-destructive text-sm">{errors.amount}</p>
                )}
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">
                  Payment Method <span className="text-destructive">*</span>
                </label>
                <Select
                  value={method}
                  onValueChange={(value) => {
                    setMethod(value as PaymentMethod);
                    setReference("");
                    if (errors.reference)
                      setErrors({ ...errors, reference: "" });
                  }}
                  disabled={confirming}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="BKASH">Bkash</SelectItem>
                    <SelectItem value="NAGAD">Nagad</SelectItem>
                    <SelectItem value="ROCKET">Rocket</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Reference Input */}
              {method !== "CASH" && (
                <div className="space-y-2">
                  <label
                    htmlFor="reference"
                    className="text-sm font-semibold text-foreground"
                  >
                    Transaction ID{" "}
                    <span className="text-muted-foreground text-xs">
                      (Optional)
                    </span>
                  </label>
                  <Input
                    id="reference"
                    type="text"
                    placeholder="Enter transaction ID"
                    value={reference}
                    onChange={(e) => {
                      setReference(e.target.value);
                      if (errors.reference)
                        setErrors({ ...errors, reference: "" });
                    }}
                    disabled={confirming}
                  />
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {data && (
        <DialogFooter className="flex justify-end gap-3 pt-6 border-t border-card-border">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={confirming}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={confirming || !amount}
            className="flex items-center gap-2"
          >
            {confirming && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirming ? "Processing..." : "Confirm Payment"}
          </Button>
        </DialogFooter>
      )}
    </DialogContent>
  );
}
