import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Smartphone,
  User,
  Phone,
  Mail,
  MapPin,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  CheckoutPayload,
  CustomerInfo,
  PaymentMethod,
  PaymentStatus,
} from "@/types";

const METHODS: {
  id: PaymentMethod;
  label: string;
  color: string;
  bg: string;
  icon?: string;
}[] = [
  {
    id: "CASH",
    label: "Cash",
    color: "text-emerald-700",
    bg: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800",
  },
  {
    id: "BKASH",
    label: "bKash",
    color: "text-pink-600",
    bg: "bg-pink-50 border-pink-200 dark:bg-pink-950/40 dark:border-pink-800",
  },
  {
    id: "NAGAD",
    label: "Nagad",
    color: "text-orange-600",
    bg: "bg-orange-50 border-orange-200 dark:bg-orange-950/40 dark:border-orange-800",
  },
  {
    id: "ROCKET",
    label: "Rocket",
    color: "text-purple-600",
    bg: "bg-purple-50 border-purple-200 dark:bg-purple-950/40 dark:border-purple-800",
  },
];

const STATUS_OPTIONS: {
  id: PaymentStatus;
  label: string;
  desc: string;
  icon: typeof CheckCircle2;
  color: string;
}[] = [
  {
    id: "PAID",
    label: "Paid",
    desc: "Full amount received",
    icon: CheckCircle2,
    color: "text-emerald-600",
  },
  {
    id: "PARTIAL",
    label: "Partial",
    desc: "Partial payment made",
    icon: Clock,
    color: "text-amber-600",
  },
  {
    id: "DUE",
    label: "Due",
    desc: "Payment pending",
    icon: AlertCircle,
    color: "text-red-500",
  },
];

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5 mb-5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-1 rounded-full transition-all duration-300",
            i < current
              ? "bg-primary flex-1"
              : i === current
                ? "bg-primary flex-2"
                : "bg-muted flex-1",
          )}
        />
      ))}
    </div>
  );
}

type CheckoutModalProps = {
  open: boolean;
  onClose: () => void;
  total: number;
  confirming: boolean;
  onConfirm: (payload: CheckoutPayload) => void;
  done: boolean;
};

export function CheckoutModal({
  open,
  onClose,
  total,
  confirming,
  onConfirm,
  done,
}: CheckoutModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      {open && (
        <CheckoutForm
          total={total}
          confirming={confirming}
          onConfirm={onConfirm}
          done={done}
        />
      )}
    </Dialog>
  );
}

export function CheckoutForm({
  total,
  confirming,
  onConfirm,
  done,
}: Omit<CheckoutModalProps, "open" | "onClose">) {
  const [step, setStep] = useState(0); // 0: payment, 1: customer, 2: confirm
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [status, setStatus] = useState<PaymentStatus>("PAID");
  const [paidAmount, setPaidAmount] = useState(total.toString());
  const [customer, setCustomer] = useState<CustomerInfo>({
    name: "",
    phone: "",
    email: "",
    address: "",
  });

  const paidNum = parseFloat(paidAmount) || 0;
  const change =
    method === "CASH" && status === "PAID" ? Math.max(0, paidNum - total) : 0;
  const due =
    status === "PARTIAL" ? total - paidNum : status === "DUE" ? total : 0;

  const canProceedStep0 =
    status === "DUE" ||
    status === "PAID" ||
    (status === "PARTIAL" && paidNum > 0 && paidNum < total);

  const canProceedStep1 =
    customer.name.trim().length > 0 && customer.phone.trim().length >= 7;

  function handleConfirm() {
    onConfirm({
      method,
      status,
      paidAmount: status === "PAID" ? total : status === "DUE" ? 0 : paidNum,
      customer,
    });
  }

  useEffect(() => {
    if (done && !confirming) {
      // reset
      setStep(0);
      setMethod("CASH");
      setStatus("PAID");
      setPaidAmount("");
      setCustomer({ name: "", phone: "", email: "", address: "" });
    }
  }, [done, confirming]);

  const selectedMethod = METHODS.find((m) => m.id === method)!;

  useEffect(() => {
    if (total && status === "PAID") {
      setPaidAmount(total.toString());
    }
    if (status === "PARTIAL") {
      setPaidAmount("");
    }
  }, [total, status]);

  return (
    <DialogContent className="max-w-sm p-0 overflow-hidden gap-0">
      {/* Header */}
      <div className="px-5 pt-5 pb-0">
        <DialogHeader className="mb-3">
          <DialogTitle className="text-base font-semibold">
            {step === 0 && "Payment"}
            {step === 1 && "Customer Info"}
            {step === 2 && "Confirm Order"}
          </DialogTitle>
        </DialogHeader>
        <StepIndicator current={step} total={3} />
      </div>

      <div className="px-5 pb-5 space-y-4">
        {/* ── STEP 0: Payment ── */}
        {step === 0 && (
          <>
            {/* Total */}
            <div className="bg-muted/40 rounded-2xl p-4 text-center border border-border/50">
              <p className="text-xs text-muted-foreground mb-1">Total Amount</p>
              <p className="text-3xl font-bold tracking-tight">
                ৳{total.toFixed(2)}
              </p>
            </div>

            {/* Status */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Payment Status
              </p>
              <div className="space-y-1.5">
                {STATUS_OPTIONS.map(
                  ({ id, label, desc, icon: Icon, color }) => (
                    <button
                      key={id}
                      onClick={() => {
                        setStatus(id);
                        setPaidAmount("");
                        if (id === "DUE") setMethod("CASH"); // reset method, irrelevant for due
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all duration-150",
                        status === id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/30",
                      )}
                    >
                      <Icon
                        className={cn(
                          "w-4 h-4 shrink-0",
                          status === id ? color : "text-muted-foreground",
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            "text-xs font-semibold",
                            status === id
                              ? "text-foreground"
                              : "text-muted-foreground",
                          )}
                        >
                          {label}
                        </p>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                      <div
                        className={cn(
                          "w-3.5 h-3.5 rounded-full border-2 shrink-0 transition-colors",
                          status === id
                            ? "border-primary bg-primary"
                            : "border-muted-foreground/40",
                        )}
                      />
                    </button>
                  ),
                )}
              </div>
            </div>

            {/* Method — hidden when due */}
            {status !== "DUE" && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Payment Method
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {METHODS.map(({ id, label, color, bg }) => (
                    <button
                      key={id}
                      onClick={() => setMethod(id)}
                      className={cn(
                        "flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border-2 text-xs font-semibold transition-all duration-150",
                        method === id
                          ? `${bg} ${color} border-current scale-[1.03]`
                          : "border-border text-muted-foreground hover:border-primary/30",
                      )}
                    >
                      <Smartphone
                        className={cn("w-4 h-4", method === id ? color : "")}
                      />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Amount — only for cash or partial */}
            {status !== "DUE" &&
              (method === "CASH" || status === "PARTIAL") && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    {status === "PARTIAL" ? "Paid Amount" : "Cash Received"}
                  </p>
                  <Input
                    type="number"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    placeholder="0.00"
                    className="text-base font-semibold"
                  />
                  {paidNum > 0 && (
                    <div className="mt-2 space-y-1">
                      {change > 0 && (
                        <div className="flex justify-between px-3 py-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
                          <span className="text-xs text-emerald-700 dark:text-emerald-400">
                            Change
                          </span>
                          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                            ৳{change.toFixed(2)}
                          </span>
                        </div>
                      )}
                      {due > 0 && (
                        <div className="flex justify-between px-3 py-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                          <span className="text-xs text-amber-700 dark:text-amber-400">
                            Remaining Due
                          </span>
                          <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                            ৳{due.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

            <Button
              className="w-full"
              disabled={!canProceedStep0}
              onClick={() => setStep(1)}
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </>
        )}

        {/* ── STEP 1: Customer ── */}
        {step === 1 && (
          <>
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1.5">
                  <User className="w-3.5 h-3.5" /> Name{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={customer.name}
                  onChange={(e) =>
                    setCustomer((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="Customer name"
                />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1.5">
                  <Phone className="w-3.5 h-3.5" /> Phone{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="tel"
                  value={customer.phone}
                  onChange={(e) =>
                    setCustomer((p) => ({ ...p, phone: e.target.value }))
                  }
                  placeholder="01XXXXXXXXX"
                />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1.5">
                  <Mail className="w-3.5 h-3.5" /> Email{" "}
                  <span className="text-muted-foreground/50 font-normal">
                    (optional)
                  </span>
                </Label>
                <Input
                  type="email"
                  value={customer.email}
                  onChange={(e) =>
                    setCustomer((p) => ({ ...p, email: e.target.value }))
                  }
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1.5">
                  <MapPin className="w-3.5 h-3.5" /> Address{" "}
                  <span className="text-muted-foreground/50 font-normal">
                    (optional)
                  </span>
                </Label>
                <Input
                  value={customer.address}
                  onChange={(e) =>
                    setCustomer((p) => ({ ...p, address: e.target.value }))
                  }
                  placeholder="Delivery / billing address"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setStep(0)}
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button
                className="flex-1"
                disabled={!canProceedStep1}
                onClick={() => setStep(2)}
              >
                Review <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </>
        )}

        {/* ── STEP 2: Confirm ── */}
        {step === 2 && (
          <>
            {done ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                </div>
                <p className="text-sm font-semibold text-emerald-600">
                  Payment Confirmed!
                </p>
              </div>
            ) : (
              <>
                {/* Summary card */}
                <div className="rounded-2xl border border-border bg-muted/30 divide-y divide-border overflow-hidden">
                  <div className="px-4 py-3 flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Total</span>
                    <span className="text-sm font-bold">
                      ৳{total.toFixed(2)}
                    </span>
                  </div>
                  <div className="px-4 py-3 flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">
                      Method
                    </span>
                    <span
                      className={cn(
                        "text-xs font-semibold",
                        selectedMethod.color,
                      )}
                    >
                      {selectedMethod.label}
                    </span>
                  </div>
                  <div className="px-4 py-3 flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">
                      Status
                    </span>
                    <span
                      className={cn(
                        "text-xs font-semibold px-2 py-0.5 rounded-full",
                        status === "PAID"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                          : status === "PARTIAL"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                            : "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400",
                      )}
                    >
                      {status === "PAID"
                        ? "Paid"
                        : status === "PARTIAL"
                          ? `Partial · ৳${paidNum.toFixed(2)}`
                          : "Due"}
                    </span>
                  </div>
                  <div className="px-4 py-3 flex justify-between items-start">
                    <span className="text-xs text-muted-foreground">
                      Customer
                    </span>
                    <div className="text-right">
                      <p className="text-xs font-semibold">{customer.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {customer.phone}
                      </p>
                      {customer.address && (
                        <p className="text-xs text-muted-foreground">
                          {customer.address}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setStep(1)}
                    disabled={confirming}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleConfirm}
                    disabled={confirming}
                  >
                    {confirming ? (
                      <span className="flex items-center gap-2">
                        <svg
                          className="animate-spin w-4 h-4"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8v8z"
                          />
                        </svg>
                        Processing…
                      </span>
                    ) : (
                      "Confirm Payment"
                    )}
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </DialogContent>
  );
}
