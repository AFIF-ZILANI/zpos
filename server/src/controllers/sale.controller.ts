import { sendError, sendSuccess } from "@/utils/response";
import type { Context } from "hono";
import type { SalePayload } from "@myapp/shared/schemas/sale.schema";
import prisma from "@/lib/prisma";
import { Decimal } from "generated/prisma/runtime/client";
import type { PaymentCollectPayload, PaymentData, PaymentStatus, Trend } from "@/types";
import { PaymentMethod, Prisma, SaleStatus, StockDirection, StockMovementType } from "generated/prisma";
import { AppError } from "@/utils/AppError";

// ── Types ────────────────────────────────────────────────────────────────────

interface LineItem {
    variantId: string;
    barcodeId: string;
    quantity: number;
    unitPrice: number;
    discountAmount: number;
    total: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function calcLineDiscount(
    sellPrice: number,
    quantity: number,
    discount: { type: "percent" | "fixed"; amount: number }
): number {
    if (discount.type === "percent") {
        return +(sellPrice * quantity * (discount.amount / 100)).toFixed(2);
    }
    return +Math.min(discount.amount, sellPrice * quantity).toFixed(2);
}

function toPaymentMethod(method: string) {
    return method.toUpperCase() as "CASH" | "BKASH" | "NAGAD" | "ROCKET";
}

type StatsItem = { value: number; trend: Trend };
interface SaleMetrics {
    totalRevenue: StatsItem;
    totalSales: StatsItem;
    uncollectedRevenue: StatsItem;
    voidedSales: StatsItem;
}

function calcTrend(current: number, previous: number): Trend {
    if (previous === 0) return current > 0 ? { isPositive: true, delta: 100 } : { isPositive: false, delta: 0 };
    return current > previous ? { isPositive: true, delta: ((current - previous) / previous) * 100 } : { isPositive: false, delta: ((previous - current) / previous) * 100 };
}

function getPreviousPeriod(from: string, to: string) {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const diffMs = toDate.getTime() - fromDate.getTime();

    return {
        prevFrom: new Date(fromDate.getTime() - diffMs),
        prevTo: new Date(fromDate.getTime() - 1), // 1ms before current period starts
    };
}

function deriveStatus(paidAmount: Decimal, total: Decimal): PaymentStatus {
    if (paidAmount.gte(total)) return "PAID";
    if (paidAmount.lte(0)) return "DUE";
    return "PARTIAL";
}


const VALID_STATUSES = ["ALL", "PAID", "DUE", "PARTIAL", "UNPAID"] as const;
type PaymentStatusFilter = (typeof VALID_STATUSES)[number];
type FilterKey = "ALL" | "PAID" | "DUE" | "PARTIAL" | "UNPAID";

type RawSaleRow = {
    id: string;
    invoice_number: string;
    invoiced_at: Date;
    created_at: Date;
    subtotal: string;
    discount_amount: string;
    tax_amount: string;
    total: string;
    paid_amount: string;
    due_amount: string;
    payment_status: "PAID" | "DUE" | "PARTIAL";
    sale_status: string;
    note: string | null;
    customer_id: string | null;
    customer_name: string | null;
    customer_phone: string | null;
    user_id: string;
    user_name: string | null;
    total_quantity: number; // sum of item quantities
    total_count: number;    // pagination window total
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function parsePagination(page?: string, limit?: string) {
    const pageNum = Math.max(1, parseInt(page ?? `${DEFAULT_PAGE}`, 10));
    const limitNum = Math.min(MAX_LIMIT, Math.max(1, parseInt(limit ?? `${DEFAULT_LIMIT}`, 10)));
    return { pageNum, limitNum, offset: (pageNum - 1) * limitNum };
}

function isValidStatus(val: string): val is PaymentStatusFilter {
    return VALID_STATUSES.includes(val as PaymentStatusFilter);
}

function resolveFilterKey(status: PaymentStatusFilter): FilterKey {
    return status as FilterKey;
}

function buildSearchClause(search: string | null): Prisma.Sql {
    if (!search) return Prisma.sql``;
    const like = `%${search}%`;
    return Prisma.sql`
        AND (
            sa.invoice_number ILIKE ${like}
            OR c.name         ILIKE ${like}
            OR c.phone        ILIKE ${like}
        )
    `;
}
function buildHavingClause(filterKey: FilterKey): Prisma.Sql {
    switch (filterKey) {
        case "PAID":
            return Prisma.sql`
                HAVING COALESCE(SUM(p.amount), 0) >= s.total
            `;
        case "DUE":
            return Prisma.sql`
                HAVING COALESCE(SUM(p.amount), 0) = 0
            `;
        case "PARTIAL":
            return Prisma.sql`
                HAVING COALESCE(SUM(p.amount), 0) > 0
                   AND COALESCE(SUM(p.amount), 0) < s.total
            `;
        case "UNPAID":
            return Prisma.sql`
                HAVING COALESCE(SUM(p.amount), 0) < s.total
            `;
        case "ALL":
            return Prisma.sql``;
    }
}

function buildSalesQuery(params: {
    fromDate: Date;
    toDate: Date;
    filterKey: FilterKey;
    search: string | null;
    limitNum: number;
    offset: number;
}): Prisma.Sql {
    const { fromDate, toDate, filterKey, search, limitNum, offset } = params;

    const havingClause = buildHavingClause(filterKey);
    const searchClause = buildSearchClause(search);

    return Prisma.sql`
        WITH sale_aggregates AS (
            SELECT
                s.id,
                s.invoice_number,
                s.invoiced_at,
                s.created_at,
                s.subtotal,
                s.discount_amount,
                s.tax_amount,
                s.waived_amount,
                s.total,
                s.status    AS sale_status,
                s.note,
                s.customer_id,
                s.user_id,
                COALESCE(SUM(p.amount), 0)::NUMERIC AS paid_amount,
                GREATEST(
                    s.total - COALESCE(SUM(p.amount), 0), 0
                )::NUMERIC AS due_amount,
                CASE
                    WHEN COALESCE(SUM(p.amount), 0) >= s.total THEN 'PAID'
                    WHEN COALESCE(SUM(p.amount), 0)  = 0       THEN 'DUE'
                    ELSE 'PARTIAL'
                END AS payment_status
            FROM sales s
            LEFT JOIN payments p ON p.sale_id = s.id
            WHERE
                s.invoiced_at >= ${fromDate}
                AND s.invoiced_at <= ${toDate}
            GROUP BY
                s.id, s.invoice_number, s.invoiced_at, s.created_at,
                s.subtotal, s.discount_amount, s.tax_amount, s.waived_amount,
                s.total, s.status, s.note, s.customer_id, s.user_id
            ${havingClause}
        ),
        joined AS (
            SELECT
                sa.*,
                c.name                             AS customer_name,
                c.phone                            AS customer_phone,
                u.name                             AS user_name,
                COALESCE(SUM(si.quantity), 0)::INT AS total_quantity
            FROM sale_aggregates sa
            LEFT JOIN customers  c  ON c.id      = sa.customer_id
            LEFT JOIN users      u  ON u.id      = sa.user_id
            LEFT JOIN sale_items si ON si.sale_id = sa.id
            WHERE 1 = 1
            ${searchClause}
            GROUP BY
                sa.id, sa.invoice_number, sa.invoiced_at, sa.created_at,
                sa.subtotal, sa.discount_amount, sa.tax_amount, sa.waived_amount,
                sa.total, sa.sale_status, sa.note, sa.customer_id, sa.user_id,
                sa.paid_amount, sa.due_amount, sa.payment_status,
                c.name, c.phone, u.name
        ),
        paginated AS (
            SELECT
                *,
                COUNT(*) OVER ()::INT AS total_count
            FROM joined
            ORDER BY invoiced_at DESC, id DESC
        )
        SELECT * FROM paginated
        LIMIT  ${limitNum}
        OFFSET ${offset}
    `;
}


// ── Controller ───────────────────────────────────────────────────────────────

export const SaleController = {
    async createSale(c: Context) {
        const body = c.get("validatedBody") as SalePayload;
        const userId = c.get("userId") as string;

        const { checkout } = body;

        // ── 1. Resolve barcodes ────────────────────────────────────────────────
        const incomingBarcodes = body.cartItems.map((i) => i.barcode);

        const barcodeRecords = await prisma.barcode.findMany({
            where: { code: { in: incomingBarcodes } },
            select: { id: true, code: true },
        });

        if (barcodeRecords.length !== incomingBarcodes.length) {
            const found = new Set(barcodeRecords.map((b) => b.code));
            const missing = incomingBarcodes.filter((code) => !found.has(code));
            return sendError(c, `Barcodes not found: ${missing.join(", ")}`, "BARCODE_NOT_FOUND", 422);
        }

        const barcodeCodeToId = new Map(barcodeRecords.map((b) => [b.code, b.id]));
        const barcodeIdToCode = new Map(barcodeRecords.map((b) => [b.id, b.code]));
        const barcodeIds = barcodeRecords.map((b) => b.id);

        // ── 2. Resolve allocations ─────────────────────────────────────────────
        const allocations = await prisma.variantBarcodeAllocation.findMany({
            where: { barcode_id: { in: barcodeIds } },
            select: {
                barcode_id: true,
                variant_id: true,
                purchaseItem: { select: { sell_price: true } },
            },
        });

        if (allocations.length !== barcodeIds.length) {
            const found = new Set(allocations.map((a) => a.barcode_id));
            const missing = barcodeIds
                .filter((id) => !found.has(id))
                .map((id) => barcodeIdToCode.get(id) ?? id);
            return sendError(
                c,
                `No purchase allocation for barcodes: ${missing.join(", ")}`,
                "ALLOCATION_NOT_FOUND",
                422
            );
        }

        const allocationByBarcodeId = new Map(allocations.map((a) => [a.barcode_id, a]));

        // ── 3. Aggregate quantities per variant ────────────────────────────────
        const qtyByVariantId = new Map<string, number>();
        for (const item of body.cartItems) {
            qtyByVariantId.set(
                item.variantId,
                (qtyByVariantId.get(item.variantId) ?? 0) + item.quantity
            );
        }
        const variantIds = [...qtyByVariantId.keys()];

        // ── 4. Build line items — all pricing derived server-side ──────────────
        let subtotal = 0;
        let totalDiscountAmount = 0;
        const lineItems: LineItem[] = [];

        for (const item of body.cartItems) {
            const barcodeId = barcodeCodeToId.get(item.barcode)!;
            const allocation = allocationByBarcodeId.get(barcodeId)!;
            const sellPrice = +Number(allocation.purchaseItem.sell_price).toFixed(2);

            if (sellPrice <= 0) {
                return sendError(
                    c,
                    `Invalid sell price for barcode ${item.barcode}`,
                    "INVALID_PRICE",
                    422
                );
            }

            const lineGross = +(sellPrice * item.quantity).toFixed(2);
            const lineDiscount = calcLineDiscount(sellPrice, item.quantity, item.discount);
            const lineNet = +(lineGross - lineDiscount).toFixed(2);

            subtotal = +(subtotal + lineGross).toFixed(2);
            totalDiscountAmount = +(totalDiscountAmount + lineDiscount).toFixed(2);

            lineItems.push({
                variantId: item.variantId,
                barcodeId,
                quantity: item.quantity,
                unitPrice: sellPrice,
                discountAmount: lineDiscount,
                total: lineNet,
            });
        }

        const taxAmount = 0;
        const total = +(subtotal - totalDiscountAmount + taxAmount).toFixed(2);
        const paidAmount = checkout.status === "DUE" ? 0 : checkout.paidAmount;

        // paidAmount is client-supplied — validate against the total we just
        // computed server-side from cart pricing, not the client's own total.
        if (paidAmount > total) {
            return sendError(
                c,
                "Paid amount exceeds sale total",
                "INVALID_PAYMENT_AMOUNT",
                422
            );
        }

        // ── 5. Customer upsert — outside transaction ───────────────────────────
        const customerRecord = await prisma.customer.upsert({
            where: { phone: checkout.customer.phone },
            update: {
                name: checkout.customer.name,
                address: checkout.customer.address || undefined,
                email: checkout.customer.email || undefined,
            },
            create: {
                name: checkout.customer.name,
                phone: checkout.customer.phone,
                address: checkout.customer.address || undefined,
                email: checkout.customer.email || undefined,
            },
            select: { id: true },
        });

        // ── 6. Transaction ─────────────────────────────────────────────────────
        await prisma.$transaction(async (tx) => {

            // 6a. Lock variant rows to serialize concurrent stock writes.
            //     product_variants.id is TEXT (not uuid) — no cast needed. The
            //     prior ::uuid cast compared a uuid against a text column, which
            //     is what caused "operator does not exist".
            const lockedVariants = await tx.$queryRaw<
                Array<{ id: string; name: string | null; product_name: string }>
            >(
                Prisma.sql`
                    SELECT pv.id, pv.name, p.name AS product_name
                    FROM product_variants pv
                    JOIN products p ON p.id = pv.product_id
                    WHERE pv.id IN (${Prisma.join(variantIds)})
                    FOR UPDATE OF pv
                `
            );

            if (lockedVariants.length !== variantIds.length) {
                throw new AppError("One or more variants not found", "VARIANT_NOT_FOUND", 422);
            }

            const variantMeta = new Map(
                lockedVariants.map((v) => [v.id, { name: v.name, productName: v.product_name }])
            );

            // 6b. Read current stock balances — inside the lock, authoritative
            const latestLedgerEntries = await tx.$queryRaw<
                Array<{ variant_id: string; balance_after: number }>
            >(
                Prisma.sql`
                    SELECT DISTINCT ON (variant_id) variant_id, balance_after
                    FROM stock_ledgers
                    WHERE variant_id IN (${Prisma.join(variantIds)})
                    ORDER BY variant_id, created_at DESC
                `
            );

            const stockMap = new Map(
                latestLedgerEntries.map((e) => [e.variant_id, Number(e.balance_after)])
            );

            // 6c. Validate stock
            for (const [variantId, requestedQty] of qtyByVariantId) {
                const stock = stockMap.get(variantId);

                // A variant with zero purchases will have no ledger entry — treat as 0 stock
                const available = stock ?? 0;

                if (available < requestedQty) {
                    throw new AppError(
                        `Insufficient stock for variant ${variantId} (available: ${available}, requested: ${requestedQty})`,
                        "INSUFFICIENT_STOCK",
                        422
                    );
                }
            }

            // 6d. Invoice number — atomic increment inside transaction
            const counter = await tx.counter.update({
                where: { key: "invoice" },
                data: { value: { increment: 1 } },
            });
            const invoiceNo = `INV-${new Date().getFullYear()}-${String(counter.value).padStart(6, "0")}`;

            // 6e. Create sale + items + optional payment
            const newSale = await tx.sale.create({
                data: {
                    user_id: userId,
                    invoice_number: invoiceNo,
                    invoiced_at: new Date(),
                    customer_id: customerRecord.id,
                    subtotal: new Decimal(subtotal),
                    discount_amount: new Decimal(totalDiscountAmount),
                    tax_amount: new Decimal(taxAmount),
                    total: new Decimal(total),
                    status: SaleStatus.COMPLETED,
                    items: {
                        create: lineItems.map((l) => ({
                            variant_id: l.variantId,
                            quantity: l.quantity,
                            product_name: variantMeta.get(l.variantId)?.productName ?? "Unknown Product",
                            variant_name: variantMeta.get(l.variantId)?.name ?? null,
                            unit_price: new Decimal(l.unitPrice),
                            discount_amount: new Decimal(l.discountAmount),
                            total: new Decimal(l.total),
                        })),
                    },
                    ...(paidAmount > 0 && {
                        payments: {
                            create: {
                                method: toPaymentMethod(checkout.method),
                                amount: new Decimal(paidAmount),
                            },
                        },
                    }),
                },
                select: { id: true, invoice_number: true },
            });

            // 6f. Stock ledger — one entry per variant
            await tx.stockLedger.createMany({
                data: [...qtyByVariantId.entries()].map(([variantId, qty]) => ({
                    variant_id: variantId,
                    type: StockMovementType.SALE,
                    direction: StockDirection.OUT,
                    quantity: qty,
                    balance_after: (stockMap.get(variantId) ?? 0) - qty,
                    sale_id: newSale.id,
                })),
            });

            // Return invoice number so it can be sent back in the response
            return newSale;
        });

        return sendSuccess(c, { message: "Sale created successfully" }, "Sale created successfully", 201);
    },

    async getStats(c: Context) {
        const { from, to } = c.req.query();

        if (!from || !to) {
            return sendError(c, "Timeline is required", "INVALID_REQUEST", 422);
        }

        const currentFrom = new Date(from);
        const currentTo = new Date(to);
        const { prevFrom, prevTo } = getPreviousPeriod(from, to);

        const [
            // ── Current period ──────────────────────────────────────────────
            currentSales,
            currentPayments,
            currentVoided,

            // ── Previous period ─────────────────────────────────────────────
            previousSales,
            previousPayments,
            previousVoided,
        ] = await Promise.all([

            // Revenue + sale count (current) — exclude VOID
            prisma.sale.aggregate({
                where: {
                    invoiced_at: { gte: currentFrom, lte: currentTo },
                    status: { not: SaleStatus.VOID },
                },
                _sum: { total: true },
                _count: { id: true },
            }),

            // Collected payments on non-void sales (current)
            prisma.payment.aggregate({
                where: {
                    created_at: { gte: currentFrom, lte: currentTo },
                    sale: {
                        invoiced_at: { gte: currentFrom, lte: currentTo },
                        status: { not: SaleStatus.VOID },
                    },
                },
                _sum: { amount: true },
            }),

            // Voided sales count (current) — operational health signal
            prisma.sale.count({
                where: {
                    invoiced_at: { gte: currentFrom, lte: currentTo },
                    status: SaleStatus.VOID,
                },
            }),

            // Revenue + sale count (previous) — exclude VOID
            prisma.sale.aggregate({
                where: {
                    invoiced_at: { gte: prevFrom, lte: prevTo },
                    status: { not: SaleStatus.VOID },
                },
                _sum: { total: true },
                _count: { id: true },
            }),

            // Collected payments on non-void sales (previous)
            prisma.payment.aggregate({
                where: {
                    created_at: { gte: prevFrom, lte: prevTo },
                    sale: {
                        invoiced_at: { gte: prevFrom, lte: prevTo },
                        status: { not: SaleStatus.VOID },
                    },
                },
                _sum: { amount: true },
            }),

            // Voided sales count (previous)
            prisma.sale.count({
                where: {
                    invoiced_at: { gte: prevFrom, lte: prevTo },
                    status: SaleStatus.VOID,
                },
            }),
        ]);

        // ── Derive values ──────────────────────────────────────────────────────────

        const currRevenue = Number(currentSales._sum.total ?? 0);
        const prevRevenue = Number(previousSales._sum.total ?? 0);

        const currSaleCount = currentSales._count.id;
        const prevSaleCount = previousSales._count.id;

        // Uncollected revenue = invoiced total minus payments received in period.
        // Scoped to the period — not a global due ledger. Fast and good enough for
        // a dashboard stat. For exact per-sale due balances use a dedicated report.
        const currCollected = Number(currentPayments._sum.amount ?? 0);
        const prevCollected = Number(previousPayments._sum.amount ?? 0);
        const currUncollected = Math.max(0, currRevenue - currCollected);
        const prevUncollected = Math.max(0, prevRevenue - prevCollected);

        const currVoided = currentVoided;
        const prevVoided = previousVoided;

        // ── Build response ─────────────────────────────────────────────────────────

        const metrics: SaleMetrics = {
            totalRevenue: {
                value: currRevenue,
                trend: calcTrend(currRevenue, prevRevenue),
            },
            totalSales: {
                value: currSaleCount,
                trend: calcTrend(currSaleCount, prevSaleCount),
            },
            uncollectedRevenue: {
                value: currUncollected,
                trend: calcTrend(currUncollected, prevUncollected),
                // "up" trend is bad — frontend should invert color for this card
            },
            voidedSales: {
                value: currVoided,
                trend: calcTrend(currVoided, prevVoided),
                // "up" trend is bad — same, invert on frontend
            },
        };

        return sendSuccess(c, metrics, "Stats fetched successfully", 200);
    },
    async getSales(c: Context) {
        const { from, to, page, limit, status = "ALL", search } = c.req.query();

        // ── Validate inputs ────────────────────────────────────────────────────────

        if (!from || !to) {
            return sendError(c, "from and to query params are required", "INVALID_REQUEST", 422);
        }

        const fromDate = new Date(from);
        const toDate = new Date(to);

        if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
            return sendError(c, "Invalid date format. Use ISO 8601.", "INVALID_REQUEST", 422);
        }

        if (fromDate > toDate) {
            return sendError(c, "'from' must be before 'to'", "INVALID_REQUEST", 422);
        }

        const normalizedStatus = status.trim().toUpperCase();
        if (!isValidStatus(normalizedStatus)) {
            return sendError(
                c,
                `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
                "INVALID_REQUEST",
                422
            );
        }

        const { pageNum, limitNum, offset } = parsePagination(page, limit);
        const filterKey = resolveFilterKey(normalizedStatus);
        const trimmedSearch = search?.trim() || null;

        // ── Execute ────────────────────────────────────────────────────────────────

        const query = buildSalesQuery({
            fromDate,
            toDate,
            filterKey,
            search: trimmedSearch,
            limitNum,
            offset,
        });

        const rows = await prisma.$queryRaw<RawSaleRow[]>(query);

        // ── Build response ─────────────────────────────────────────────────────────

        const totalCount = rows[0]?.total_count ?? 0;
        const totalPages = Math.ceil(totalCount / limitNum);


        const sales = rows.map((row) => ({
            id: row.id,
            invoiceNumber: row.invoice_number,
            customerId: row.customer_id,
            customerName: row.customer_name,
            customerPhone: row.customer_phone,
            date: row.invoiced_at.toISOString(),
            items: row.total_quantity,
            subtotal: row.subtotal,
            discountAmount: row.discount_amount,
            total: row.total,
            paid: row.paid_amount,
            due: row.due_amount,
            status: row.payment_status,
            saleStatus: row.sale_status,
            note: row.note,
            createdAt: row.created_at.toISOString(),
        }));

        const response = {
            data: sales,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: totalCount,
                totalPages,
                hasNext: pageNum < totalPages,
                hasPrev: pageNum > 1,
            },
            meta: {
                from: fromDate.toISOString(),
                to: toDate.toISOString(),
                status: normalizedStatus,
                search: trimmedSearch,
            },
        }

        return sendSuccess(
            c,
            response
            ,
            "Sales fetched successfully",
            200
        );
    },
    async getChartData(c: Context) {
        const { from, to } = c.req.query();

        const fromDate = from ? new Date(from) : new Date(new Date().setDate(new Date().getDate() - 30));
        const toDate = to ? new Date(to) : new Date();

        type StatusRow = { status: string; count: bigint };

        const rows = await prisma.$queryRaw<StatusRow[]>(Prisma.sql`
            WITH payment_sums AS (
                SELECT
                    s.id,
                    s.total,
                    COALESCE(SUM(p.amount), 0) AS paid
                FROM sales s
                LEFT JOIN payments p ON p.sale_id = s.id
                WHERE s.invoiced_at >= ${fromDate}
                  AND s.invoiced_at <= ${toDate}
                  AND s.status = 'COMPLETED'
                GROUP BY s.id, s.total
            )
            SELECT
                CASE
                    WHEN paid >= total THEN 'PAID'
                    WHEN paid = 0     THEN 'DUE'
                    ELSE                   'PARTIAL'
                END AS status,
                COUNT(*) AS count
            FROM payment_sums
            GROUP BY status
        `);

        const COLORS: Record<string, string> = {
            PAID:    "#1D9E75",
            DUE:     "#EF9F27",
            PARTIAL: "#378ADD",
        };
        const LABELS: Record<string, string> = {
            PAID: "Paid", DUE: "Due", PARTIAL: "Partial",
        };

        const total = rows.reduce((s, r) => s + Number(r.count), 0);
        const data = rows.map((r) => ({
            name:  LABELS[r.status] ?? r.status,
            value: Number(r.count),
            fill:  COLORS[r.status] ?? "#888888",
        }));

        return sendSuccess(c, { data, total }, "Chart data fetched successfully", 200);
    },

    async getPaymentData(c: Context) {
        const { invoiceNo } = c.req.query();

        const sale = await prisma.sale.findUnique({
            where: { invoice_number: invoiceNo },
            include: {
                customer: {
                    select: {
                        name: true,
                        phone: true,
                        email: true,
                        address: true,
                    },
                },
                payments: {
                    select: { amount: true },
                },
            },
        });

        if (!sale) {
            return sendError(c, "Sale not found", "NOT_FOUND", 404);
        }

        const paidAmount = sale.payments.reduce(
            (sum, p) => sum.add(p.amount),
            new Decimal(0)
        );

        const data: PaymentData = {
            saleId: sale.id,
            invoiceNo: sale.invoice_number ?? "",
            customer: {
                name: sale.customer?.name ?? "",
                phone: sale.customer?.phone ?? "",
                email: sale.customer?.email ?? "",
                address: sale.customer?.address ?? "",
            },
            status: deriveStatus(paidAmount, sale.total),
            paidAmount: paidAmount.toNumber(),
            totalAmount: sale.total.toNumber(),
        };

        return sendSuccess(c, data, "Payment data fetched successfully", 200);
    },

    async createPayment(c: Context) {
        const body: PaymentCollectPayload = await c.req.json();

        const { saleId, amount, method, reference } = body;

        if (!saleId || !amount || !method) {
            return sendError(c, "Missing required fields", "INVALID_REQUEST", 422);
        }

        if (amount <= 0) {
            return sendError(c, "Amount must be greater than 0", "INVALID_REQUEST", 422);
        }

        if (!Object.values(PaymentMethod).includes(method)) {
            return sendError(c, "Invalid payment method", "INVALID_REQUEST", 422);
        }

        const sale = await prisma.sale.findUnique({
            where: { id: saleId },
            select: {
                id: true,
                invoice_number: true,
                payments: true,
                total: true,
                customer: {
                    select: {
                        name: true,
                        phone: true,
                        email: true,
                        address: true,
                    },
                },
            }
        });

        if (!sale) {
            return sendError(c, "Sale not found", "NOT_FOUND", 404);
        }

        const paidAmount = sale.payments.reduce(
            (sum, p) => sum.add(p.amount),
            new Decimal(0)
        );

        if (paidAmount.add(new Decimal(amount)).gt(sale.total)) {
            return sendError(c, "Payment amount exceeds total amount", "INVALID_REQUEST", 422);
        }

        await prisma.payment.create({
            data: {
                sale_id: saleId,
                amount: new Decimal(amount),
                method: method,
                reference: reference,
            }
        })


        return sendSuccess(c, {}, "Payment data fetched successfully", 200);
    }

}

