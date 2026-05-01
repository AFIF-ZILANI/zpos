import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Save, Send, AlertCircle } from "lucide-react";

interface Order {
  supplier: string;
  deliveryDate: string;
  paymentTerms: string;
  lineItems: Array<{ product: string; quantity: number }>;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
}

export default function OrderSummary({ order }: { order: Order }) {
  const getPaymentTermLabel = (term: string) => {
    const labels: any = {
      NET_15: "NET 15 (15 days)",
      NET_30: "NET 30 (30 days)",
      NET_45: "NET 45 (45 days)",
      NET_60: "NET 60 (60 days)",
      COD: "Cash on Delivery",
    };
    return labels[term] || term;
  };

  const itemsCount = order.lineItems.filter((item) => item.product).length;
  const isComplete = order.supplier && order.deliveryDate && itemsCount > 0;

  return (
    <div className="sticky top-24 space-y-4">
      {/* Main Order Summary Card */}
      <Card className="p-6 border-2 border-primary/30 bg-background">
        <h3 className="font-bold text-lg text-foreground mb-6">
          Order Summary
        </h3>

        <div className="space-y-5">
          {/* Supplier */}
          <div className="pb-4 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Supplier
            </p>
            <p className="text-sm font-bold text-foreground">
              {order.supplier || (
                <span className="text-muted-foreground italic">
                  Not selected
                </span>
              )}
            </p>
          </div>

          {/* Payment Terms */}
          <div className="pb-4 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Payment Terms
            </p>
            <Badge variant="secondary" className="font-medium">
              {getPaymentTermLabel(order.paymentTerms)}
            </Badge>
          </div>

          {/* Delivery Date */}
          <div className="pb-4 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Delivery Date
            </p>
            <p className="text-sm font-semibold text-foreground">
              {order.deliveryDate ? (
                new Date(order.deliveryDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              ) : (
                <span className="text-muted-foreground italic">Not set</span>
              )}
            </p>
          </div>

          {/* Line Items Count */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Items
            </p>
            <p className="text-sm font-semibold text-foreground">
              {itemsCount} product{itemsCount !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </Card>

      {/* Cost Breakdown Card */}
      <Card className="p-6 bg-background">
        <h4 className="font-bold text-foreground mb-6">Cost Breakdown</h4>

        <div className="space-y-3">
          <div className="flex justify-between items-center py-2">
            <span className="text-sm text-muted-foreground">Subtotal</span>
            <span className="font-semibold text-foreground">
              ${order.subtotal.toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between items-center py-2">
            <span className="text-sm text-muted-foreground">Tax (10%)</span>
            <span className="font-semibold text-foreground">
              ${order.tax.toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between items-center py-2 pb-3 border-b border-border">
            <span className="text-sm text-muted-foreground">Shipping</span>
            <span className="font-semibold text-foreground">
              ${order.shipping.toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between items-center pt-3">
            <span className="font-bold text-foreground">Total</span>
            <span className="text-2xl font-bold text-primary">
              ${order.total.toFixed(2)}
            </span>
          </div>
        </div>
      </Card>

      {/* Validation Alert */}
      {!isComplete && (
        <Card className="p-4 bg-amber-50 border border-amber-200">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-900">
                Complete Required Fields
              </p>
              <p className="text-xs text-amber-800 mt-1">
                {!order.supplier && "Select a supplier • "}
                {!order.deliveryDate && "Set delivery date • "}
                {itemsCount === 0 && "Add at least one item"}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="space-y-2 pt-2">
        <Button
          disabled={!isComplete}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium gap-2"
        >
          <Send className="w-4 h-4" />
          Submit Order
        </Button>
        <Button variant="outline" className="w-full font-medium gap-2">
          <Save className="w-4 h-4" />
          Save as Draft
        </Button>
      </div>
    </div>
  );
}
