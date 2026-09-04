import { useState, useCallback, useRef, useEffect } from "react";
import {
  Search,
  Plus,
  Minus,
  CreditCard,
  X,
  ShoppingCart,
  Tag,
  ChevronDown,
  Package,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import { server_URI, useGetData, usePostData } from "@/lib/api-request";
import type {
  CartEntryProduct,
  CheckoutPayload,
  ProductTableRow,
  TableResponse,
} from "@/types";
import { playSoundWithCacheInstance } from "@/lib/sound";
import { CheckoutModal } from "@/components/pos/checkout-modal";
import { useDebounce } from "@/hooks/useDebounce";
import Pagination from "@/components/pagination";
import { useAuth } from "@clerk/react";

// ── Types ──────────────────────────────────────────────────────────────────────

type Discount = { type: "percent" | "fixed"; amount: number };

type CartItem = {
  product: CartEntryProduct;
  qty: number;
  discount: Discount;
  discountOpen: boolean;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

async function getProductByBarcode(
  barcode: string,
  getToken: () => Promise<string | null>,
): Promise<CartEntryProduct | null> {
  try {
    const token = await getToken();
    const res = await fetch(
      `${server_URI}/products/get/by-barcode/${barcode}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    if (!res.ok) return null;
    const result: { data: CartEntryProduct } = await res.json();
    return result.data ?? null;
  } catch {
    return null;
  }
}

async function getCartItemByProductId(
  productId: string,
  getToken: () => Promise<string | null>,
): Promise<CartEntryProduct | null> {
  try {
    const token = await getToken();
    // Fetch product to get the single variant's ID
    const prodRes = await fetch(`${server_URI}/products/get/${productId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!prodRes.ok) return null;
    const prodJson: { data: { variants: { id: string }[] } } = await prodRes.json();
    const variantId = prodJson.data?.variants?.[0]?.id;
    if (!variantId) return null;

    const cartRes = await fetch(
      `${server_URI}/products/get/variants/${variantId}/cart-item`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!cartRes.ok) return null;
    const cartJson: { data: CartEntryProduct } = await cartRes.json();
    return cartJson.data ?? null;
  } catch {
    return null;
  }
}

/** Compute the per-unit discount price */
function discountedUnitPrice(price: number, discount: Discount): number {
  if (discount.type === "percent") return price * (1 - discount.amount / 100);
  return Math.max(0, price - discount.amount);
}

/** Compute the total discount amount for a line */
function lineDiscountAmount(
  price: number,
  qty: number,
  discount: Discount,
): number {
  if (discount.type === "percent") return price * qty * (discount.amount / 100);
  return Math.min(discount.amount * qty, price * qty);
}

const BDT = (n: number) =>
  "৳" +
  n.toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// ── Stock status helpers ───────────────────────────────────────────────────────

function StockBadge({ stock, status }: { stock: number; status: ProductTableRow["status"] }) {
  if (status === "OUT_OF_STOCK")
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-destructive/10 text-destructive">
        Out
      </span>
    );
  if (status === "LOW_STOCK")
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-600">
        {stock}
      </span>
    );
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600">
      {stock}
    </span>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function PointOfSale() {
  const { getToken } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const hidInputRef = useRef<HTMLInputElement>(null);
  const [hidBuffer, setHidBuffer] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const {
    mutate: createSale,
    isPending: confirming,
    isSuccess: done,
    reset: resetCreateSale,
  } = usePostData("/sales/create");
  const debouncedSearch = useDebounce(search, 300);

  const productQuery = new URLSearchParams({
    search: debouncedSearch,
    page: String(page),
    limit: String(pageSize),
  });

  const {
    data: productData,
    refetch: refetchProducts,
    isFetching: isFetchingProducts,
    isError: isProductsError,
  } = useGetData<TableResponse<ProductTableRow>>(
    `/products/get/all?${productQuery}`,
  );

  const productsData = productData?.data.items ?? [];
  const totalPages = productData?.data.totalPages ?? 1;

  // ── Cart math ──────────────────────────────────────────────────────────────

  const subtotal = cart.reduce((s, i) => s + i.product.price * i.qty, 0);
  const totalDiscount = cart.reduce(
    (s, i) => s + lineDiscountAmount(i.product.price, i.qty, i.discount),
    0,
  );
  const total = subtotal - totalDiscount;
  const totalQty = cart.reduce((s, i) => s + i.qty, 0);

  // ── Cart actions ───────────────────────────────────────────────────────────

  const addToCart = useCallback((product: CartEntryProduct) => {
    setCart((prev) => {
      const idx = prev.findIndex(
        (i) => i.product.variantId === product.variantId,
      );
      if (idx !== -1) {
        const item = prev[idx];
        if (item.qty >= item.product.availableStock) return prev; // stock cap
        return prev.map((i, j) => (j === idx ? { ...i, qty: i.qty + 1 } : i));
      }
      return [
        ...prev,
        {
          product,
          qty: 1,
          discount: { type: "percent", amount: 0 },
          discountOpen: false,
        },
      ];
    });
  }, []);

  const updateQty = (variantId: string, delta: number) =>
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.product.variantId !== variantId) return i;
          const next = i.qty + delta;
          if (next <= 0) return { ...i, qty: 0 };
          if (next > i.product.availableStock) return i;
          return { ...i, qty: next };
        })
        .filter((i) => i.qty > 0),
    );

  const removeItem = (variantId: string) =>
    setCart((prev) => prev.filter((i) => i.product.variantId !== variantId));

  const clearCart = () => setCart([]);

  const updateDiscount = (variantId: string, discount: Discount) =>
    setCart((prev) =>
      prev.map((i) =>
        i.product.variantId === variantId ? { ...i, discount } : i,
      ),
    );

  const toggleDiscountOpen = (variantId: string) =>
    setCart((prev) =>
      prev.map((i) =>
        i.product.variantId === variantId
          ? { ...i, discountOpen: !i.discountOpen }
          : i,
      ),
    );

  // ── Checkout ───────────────────────────────────────────────────────────────

  const handleConfirmPayment = (payload: CheckoutPayload) => {
    createSale(
      {
        checkout: payload,
        totalAmount: total,
        cartItems: cart.map((i) => ({
          variantId: i.product.variantId,
          quantity: i.qty,
          barcode: i.product.barcode,
          discount: i.discount,
        })),
      },
      {
        onSuccess: () => {
          playSoundWithCacheInstance("dual_beep");
          refetchProducts();
          toast.success("Sale completed");
          setCheckoutOpen(false);
          clearCart();
        },
        onError: (error) => {
          toast.error(error.message);
          playSoundWithCacheInstance("error_beep");
        },
      },
    );
  };

  function handleCheckout() {
    resetCreateSale();
    setCheckoutOpen(true);
  }

  // ── HID barcode scanner ────────────────────────────────────────────────────

  const handleScan = useCallback(
    async (barcode: string) => {
      if (!barcode.trim()) {
        playSoundWithCacheInstance("error_beep");
        return;
      }
      playSoundWithCacheInstance("beep");
      const data = await getProductByBarcode(barcode, getToken);
      if (data) addToCart(data);
      else {
        toast.error(`No product for barcode ${barcode}`);
        playSoundWithCacheInstance("error_beep");
      }
    },
    [addToCart, getToken],
  );

  useEffect(() => {
    const refocus = () => {
      const active = document.activeElement;
      if (
        active !== hidInputRef.current &&
        !(active instanceof HTMLInputElement) &&
        !(active instanceof HTMLTextAreaElement)
      ) {
        hidInputRef.current?.focus();
      }
    };
    document.addEventListener("click", refocus);
    hidInputRef.current?.focus();
    return () => document.removeEventListener("click", refocus);
  }, []);

  const handleHidKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    const code = hidBuffer.trim();
    setHidBuffer("");
    if (code) handleScan(code);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Hidden HID capture input */}
      <input
        ref={hidInputRef}
        value={hidBuffer}
        onChange={(e) => setHidBuffer(e.target.value)}
        onKeyDown={handleHidKeyDown}
        aria-hidden="true"
        tabIndex={-1}
        className="absolute opacity-0 pointer-events-none w-0 h-0"
        autoComplete="off"
      />

      <div className="flex flex-1 overflow-hidden">
        {/* ── Products panel ──────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-border">
          {/* Search bar */}
          <div className="flex gap-2 px-4 py-3 border-b border-border bg-background">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search products…"
                className="pl-8 h-8 text-sm"
              />
            </div>
          </div>

          {/* Product table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-muted/60 backdrop-blur-sm border-b border-border">
                <tr>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5 w-[40%]">
                    Product
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5 w-[20%]">
                    Category
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5 w-[12%]">
                    Variants
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5 w-[14%]">
                    Stock
                  </th>
                  <th className="w-[14%] px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isFetchingProducts &&
                  Array.from({ length: pageSize }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <Skeleton className="h-3.5 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))}

                {!isFetchingProducts &&
                  productsData.map((p) => (
                    <tr
                      key={p.id}
                      onClick={async () => {
                        if (p.stock === 0) {
                          toast.error(`${p.name} is out of stock`);
                          return;
                        }
                        if (p.variants > 1) {
                          toast.info(`${p.name} has multiple variants — scan a barcode to select one`);
                          hidInputRef.current?.focus();
                          return;
                        }
                        const item = await getCartItemByProductId(p.id, getToken);
                        if (item) {
                          addToCart(item);
                          playSoundWithCacheInstance("beep");
                        } else {
                          toast.error(`Could not add ${p.name} to cart`);
                          playSoundWithCacheInstance("error_beep");
                        }
                      }}
                      className="hover:bg-muted/30 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3 font-medium truncate max-w-0">
                        <span className="block truncate">{p.name}</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground truncate max-w-0">
                        <span className="block truncate">{p.category}</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-center">
                        {p.variants}
                      </td>
                      <td className="px-4 py-3">
                        <StockBadge stock={p.stock} status={p.status} />
                      </td>
                    </tr>
                  ))}

                {!isFetchingProducts && isProductsError && (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-16 text-center text-destructive"
                    >
                      <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-60" />
                      <p className="text-sm">Failed to load products</p>
                      <button
                        onClick={() => refetchProducts()}
                        className="text-sm underline mt-1"
                      >
                        Retry
                      </button>
                    </td>
                  </tr>
                )}

                {!isFetchingProducts && !isProductsError && productsData.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-16 text-center text-muted-foreground"
                    >
                      <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No products found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-border bg-background px-6 py-4">
            <Pagination
              page={page}
              limit={pageSize}
              totalPages={totalPages}
              onPageChange={setPage}
              onLimitChange={setPageSize}
            />
          </div>
        </div>

        {/* ── Cart panel ──────────────────────────────────────────────────── */}
        <div className="w-96 shrink-0 flex flex-col bg-card">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Current order</span>
              {totalQty > 0 && (
                <Badge className="h-5 px-1.5 text-[10px] bg-primary rounded-full">
                  {totalQty}
                </Badge>
              )}
            </div>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Items */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground/40 gap-2">
                <ShoppingCart className="w-9 h-9" />
                <p className="text-xs">Cart is empty</p>
                <p className="text-[11px] text-muted-foreground/30">
                  Click + or scan a barcode
                </p>
              </div>
            ) : (
              cart.map((item) => {
                const { discount, discountOpen } = item;
                const hasDiscount = discount.amount > 0;
                const unitDisc = discountedUnitPrice(
                  item.product.price,
                  discount,
                );
                const lineTotal = unitDisc * item.qty;

                return (
                  <div
                    key={item.product.variantId}
                    className="rounded-lg border border-border bg-background overflow-hidden"
                  >
                    {/* Main row */}
                    <div className="flex items-start justify-between px-3 py-2.5">
                      <div className="flex flex-col gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate leading-tight">
                            {item.product.name}
                          </p>
                          <div className="flex items-center gap-1 mt-0.5">
                            {hasDiscount ? (
                              <>
                                <span className="text-[11px] text-muted-foreground/60 line-through tabular-nums">
                                  {BDT(item.product.price)}
                                </span>
                                <span className="text-[11px] text-emerald-600 font-medium tabular-nums">
                                  {BDT(unitDisc)}
                                </span>
                              </>
                            ) : (
                              <span className="text-[11px] text-muted-foreground tabular-nums">
                                {BDT(item.product.price)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Qty controls */}
                        <div>
                          <div className="flex gap-1 shrink-0">
                            <button
                              onClick={() =>
                                updateQty(item.product.variantId, -1)
                              }
                              className="w-6 h-6 rounded-md border border-border flex items-center justify-center hover:border-primary hover:text-primary transition-colors"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-sm font-semibold w-5 text-center tabular-nums">
                              {item.qty}
                            </span>
                            <button
                              onClick={() =>
                                updateQty(item.product.variantId, 1)
                              }
                              disabled={item.qty >= item.product.availableStock}
                              className="w-6 h-6 rounded-md border border-border flex items-center justify-center hover:border-primary hover:text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Line total */}
                          <span className="text-xs font-semibold tabular-nums min-w-[60px] text-right shrink-0">
                            {BDT(lineTotal)}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => removeItem(item.product.variantId)}
                        className="text-muted-foreground hover:text-destructive transition-colors shrink-0 ml-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Discount toggle */}
                    <Collapsible
                      open={discountOpen}
                      onOpenChange={() =>
                        toggleDiscountOpen(item.product.variantId)
                      }
                    >
                      <CollapsibleTrigger asChild>
                        <button className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] text-muted-foreground border-t border-border/60 hover:bg-muted/40 transition-colors">
                          <span className="flex items-center gap-1.5">
                            <Tag className="w-3 h-3" />
                            {hasDiscount ? (
                              <span className="text-emerald-600 font-medium">
                                {discount.type === "percent"
                                  ? `${discount.amount}% off`
                                  : `${BDT(discount.amount)} off`}
                              </span>
                            ) : (
                              "Add discount"
                            )}
                          </span>
                          <ChevronDown
                            className={cn(
                              "w-3 h-3 transition-transform",
                              discountOpen && "rotate-180",
                            )}
                          />
                        </button>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="px-3 py-2 border-t border-border/60 bg-muted/20 flex items-center gap-2">
                          {/* Type toggle */}
                          <div className="flex rounded-md border border-border overflow-hidden text-[11px] shrink-0">
                            {(["percent", "fixed"] as const).map((t) => (
                              <button
                                key={t}
                                onClick={() =>
                                  updateDiscount(item.product.variantId, {
                                    type: t,
                                    amount: 0,
                                  })
                                }
                                className={cn(
                                  "px-2.5 py-1 font-medium transition-colors",
                                  discount.type === t
                                    ? "bg-foreground text-background"
                                    : "bg-background text-muted-foreground hover:bg-muted",
                                )}
                              >
                                {t === "percent" ? "%" : "৳"}
                              </button>
                            ))}
                          </div>

                          {/* Amount input */}
                          <div className="relative flex-1">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground pointer-events-none">
                              {discount.type === "percent" ? "%" : "৳"}
                            </span>
                            <input
                              type="number"
                              min={0}
                              max={
                                discount.type === "percent"
                                  ? 100
                                  : item.product.price
                              }
                              step={discount.type === "percent" ? 1 : 1}
                              value={discount.amount || ""}
                              onChange={(e) =>
                                updateDiscount(item.product.variantId, {
                                  ...discount,
                                  amount: parseFloat(e.target.value) || 0,
                                })
                              }
                              placeholder="0"
                              className="w-full h-7 pl-6 pr-2 text-xs rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                            />
                          </div>

                          {hasDiscount && (
                            <button
                              onClick={() =>
                                updateDiscount(item.product.variantId, {
                                  type: discount.type,
                                  amount: 0,
                                })
                              }
                              className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer totals + charge */}
          {cart.length > 0 && (
            <div className="border-t border-border p-4 space-y-3 bg-card">
              <div className="space-y-1.5 text-sm">
                {totalDiscount > 0 && (
                  <>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal</span>
                      <span className="tabular-nums">{BDT(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-600">
                      <span>Discount</span>
                      <span className="tabular-nums">
                        -{BDT(totalDiscount)}
                      </span>
                    </div>
                  </>
                )}
                <div className="flex justify-between font-semibold text-base pt-1 border-t border-border">
                  <span>Total</span>
                  <span className="tabular-nums">{BDT(total)}</span>
                </div>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={handleCheckout}
                disabled={cart.length === 0}
              >
                <CreditCard className="w-4 h-4" />
                Charge {BDT(total)}
              </Button>
            </div>
          )}
        </div>
      </div>

      <CheckoutModal
        open={checkoutOpen}
        onClose={() => {
          resetCreateSale();
          setCheckoutOpen(false);
        }}
        total={total}
        onConfirm={handleConfirmPayment}
        confirming={confirming}
        done={done}
      />
    </div>
  );
}
