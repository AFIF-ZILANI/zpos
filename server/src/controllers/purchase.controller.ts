import type { Context } from "hono";
import { sendError, sendSuccess } from "@/utils/response";
import type { NewPurchase } from "@myapp/shared/schemas/purchase.schema";
import prisma from "@/lib/prisma";
import { BarcodeStatus, Prisma, StockDirection, StockMovementType } from "generated/prisma";
import type { BarcodePrintData, OverviewStats, PurchaseHistory } from "@/types";
import { generateEAN13 } from "@/lib/barcode";

type BarcodeRow = {
    code: string
    serial: number
    status: BarcodeStatus
}

type AllocationRow = {
    barcodeCode: string
    variant_id: string
    purchase_item_id: string
}

export const PurchaseController = {
    async createPurchase(c: Context) {
        const { date, invoiceNo, supplier, email, note, phone, products: variants } =
            c.get("validatedBody") as NewPurchase;
        const userId = c.get("userId");

        let formattedResult: BarcodePrintData[] = [];
        await prisma.$transaction(async (tx) => {
            // 1. Validate all variant IDs exist
            const variantIds = variants.map((p) => p.variantId);

            const foundVariants = await tx.productVariant.findMany({
                where: { id: { in: variantIds } },
                select: { id: true },
            });

            if (foundVariants.length !== variantIds.length) {
                const foundIds = new Set(foundVariants.map((v) => v.id));
                const missingIds = variantIds.filter((id) => !foundIds.has(id));
                throw new Error(`Invalid variant IDs: ${missingIds.join(", ")}`);
            }

            // 2. Upsert supplier
            const supplierData = await tx.supplier.upsert({
                where: { phone },
                update: {},
                create: { name: supplier, phone, email },
            });

            // 3. Calculate total
            const total = variants.reduce(
                (acc, p) => acc + (Number(p.unitCost) ?? 0) * (Number(p.quantity) ?? 0),
                0
            );

            // 4. Create purchase
            const purchase = await tx.purchase.create({
                data: {
                    date: new Date(date as Date),
                    note,
                    invoice_no: invoiceNo,
                    total,
                    supplier_id: supplierData.id,
                    user_id: userId,
                },
            });

            // 5. Create purchase items
            const purchaseItems = await tx.purchaseItem.createMany({
                data: variants.map((v) => ({
                    purchase_id: purchase.id,
                    variant_id: v.variantId,
                    quantity: Number(v.quantity) ?? 0,
                    cost_price: Number(v.unitCost) ?? 0,
                    sell_price: Number(v.sellingPrice) ?? 0,
                    total: (Number(v.unitCost) ?? 0) * (Number(v.quantity) ?? 0),
                })),
            });

            // 6. Fetch latest stock balance per variant (one query)
            const latestBalances = await tx.stockLedger.findMany({
                where: { variant_id: { in: variantIds } },
                orderBy: { created_at: "desc" },
                distinct: ["variant_id"],
                select: { variant_id: true, balance_after: true },
            });

            const balanceMap = new Map(
                latestBalances.map((b) => [b.variant_id, b.balance_after])
            );

            // 7. Create stock ledger entries
            await tx.stockLedger.createMany({
                data: variants.map((v) => ({
                    variant_id: v.variantId,
                    quantity: Number(v.quantity) ?? 0,
                    purchase_id: purchase.id,
                    type: StockMovementType.PURCHASE,
                    direction: StockDirection.IN,
                    balance_after: (balanceMap.get(v.variantId) ?? 0) + (Number(v.quantity) ?? 0),
                })),
            });

            // 8. Barcode generation + allocation

            const lastBarcode = await tx.barcode.findFirst({
                orderBy: { serial: "desc" },
                select: { serial: true },
            })

            let currentSerial = lastBarcode?.serial ?? 0

            // Build one barcode per unit (respecting quantity)
            const createdPurchaseItems = await tx.purchaseItem.findMany({
                where: { purchase_id: purchase.id },
                select: { id: true, variant_id: true, quantity: true },
            })

            console.log("createdPurchaseItems", createdPurchaseItems)

            const barcodeRows: BarcodeRow[] = []
            const allocationRows: AllocationRow[] = []

            for (const item of createdPurchaseItems) {
                currentSerial += 1
                const code = generateEAN13(currentSerial)
                barcodeRows.push({
                    code,
                    serial: currentSerial,
                    status: BarcodeStatus.ALLOCATED,
                })
                allocationRows.push({
                    barcodeCode: code,
                    variant_id: item.variant_id,
                    purchase_item_id: item.id,
                })
            }

            await tx.barcode.createMany({ data: barcodeRows })

            // fetch created barcodes to get their IDs
            const createdBarcodes = await tx.barcode.findMany({
                where: { code: { in: barcodeRows.map(b => b.code) } },
                select: { id: true, code: true },
            })

            const barcodeIdMap = new Map(createdBarcodes.map(b => [b.code, b.id]))

            await tx.variantBarcodeAllocation.createMany({
                data: allocationRows.map(row => ({
                    variant_id: row.variant_id,
                    barcode_id: barcodeIdMap.get(row.barcodeCode)!,
                    purchase_item_id: row.purchase_item_id,
                    allocated_by: userId,
                }))
            })

            // after all DB operations, build response
            const result = allocationRows.map(row => ({
                variantId: row.variant_id,
                barcode: row.barcodeCode,
            }))

            // fetch product name for each variant
            const variantData = await tx.productVariant.findMany({
                where: { id: { in: variantIds } },
                select: { id: true, name: true, product: { select: { name: true } } },
            })
            formattedResult = result.map(row => ({
                barcode: row.barcode,
                productName: `${variantData.find(v => v.id === row.variantId)?.product.name} - ${variantData.find(v => v.id === row.variantId)?.name}`,
            }))
        })


        console.log(formattedResult)

        return sendSuccess(c, { barcodeData: formattedResult }, "Purchase created successfully");
    },
    async getOverviewStats(c: Context) {
        // 1. Aggregate base purchase metrics
        const [aggregate, supplierCount, completedCount] = await Promise.all([
            prisma.purchase.aggregate({
                where: {},
                _count: { id: true },
                _sum: { total: true },
            }),

            prisma.purchase.findMany({
                where: {
                    supplier_id: { not: null },
                },
                select: { supplier_id: true },
                distinct: ["supplier_id"],
            }),

            prisma.purchase.count({
                where: {
                    items: {
                        some: {},
                    },
                },
            }),
        ]);

        const data: OverviewStats = {
            totalPurchases: aggregate._count.id || 0,
            totalPurchaseValue: Number(aggregate._sum.total || 0),
            uniqueSuppliers: supplierCount.length,
            purchasesThisMonth: completedCount,
        };

        return sendSuccess(c, data, "Overview stats fetched successfully");
    },
    async getPurchaseHistory(c: Context) {
        const { search, timeline, page = "1", limit = "20" } = c.req.query();

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Timeline filter
        const now = new Date();
        let dateFrom: Date | undefined;

        switch (timeline) {
            case "today":
                dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case "this-week": {
                const day = now.getDay();
                dateFrom = new Date(now);
                dateFrom.setDate(now.getDate() - day);
                dateFrom.setHours(0, 0, 0, 0);
                break;
            }
            case "this-month":
                dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case "half-year":
                dateFrom = new Date(now);
                dateFrom.setMonth(now.getMonth() - 6);
                break;
            case "this-year":
                dateFrom = new Date(now.getFullYear(), 0, 1);
                break;
            case "all":
            default:
                dateFrom = undefined;
        }

        const where: Prisma.PurchaseWhereInput = {
            ...(dateFrom && { date: { gte: dateFrom } }),
            ...(search && {
                OR: [
                    { supplier: { name: { contains: search, mode: "insensitive" } } },
                    { invoice_no: { contains: search, mode: "insensitive" } },
                ],
            }),
        };

        const [purchases, total] = await Promise.all([
            prisma.purchase.findMany({
                where,
                skip,
                take: limitNum,
                orderBy: { date: "desc" },
                select: {
                    id: true,
                    date: true,
                    total: true,
                    invoice_no: true,
                    supplier: {
                        select: { name: true },
                    },
                    _count: {
                        select: { items: true },
                    },
                },
            }),
            prisma.purchase.count({ where }),
        ]);

        const data: PurchaseHistory[] = purchases.map((p) => ({
            id: p.id,
            supplier: p.supplier?.name ?? "Unknown",
            date: p.date.toISOString(),
            invoiceNo: p.invoice_no,
            items: p._count.items,
            total: Number(p.total),
        }));

        console.log(data)

        return sendSuccess(c, { items: data, total, page: pageNum, limit: limitNum }, "Purchase history fetched successfully");
    },

    async deletePurchase(c: Context) {
        const { id } = await c.req.json();

        if (!id || typeof id !== "string" || id.trim() === "") {
            return sendError(c, "Purchase ID is required", "BAD_REQUEST", 400);
        }
        const purchase = await prisma.purchase.findUnique({ where: { id } });
        if (!purchase) return sendError(c, "Purchase not found", "BAD_REQUEST", 404);

        await prisma.$transaction(async (tx) => {
            // 1. Get barcode ids
            const allocations = await tx.variantBarcodeAllocation.findMany({
                where: { purchaseItem: { purchase_id: id } },
                select: { barcode_id: true },
            })
            const barcodeIds = allocations.map((a) => a.barcode_id);

            // 2. Delete barcode allocations linked to purchase items
            await tx.variantBarcodeAllocation.deleteMany({
                where: { purchaseItem: { purchase_id: id } },
            });

            // 3. Delete barcodes
            await tx.barcode.deleteMany({
                where: { id: { in: barcodeIds } },
            });

            // 4. Delete stock ledger entries
            await tx.stockLedger.deleteMany({ where: { purchase_id: id } });

            // 5. Delete purchase items
            await tx.purchaseItem.deleteMany({ where: { purchase_id: id } });

            // 6. Delete the purchase itself
            await tx.purchase.delete({ where: { id } });
        });
        return sendSuccess(c, "Purchase deleted successfully");
    }
};