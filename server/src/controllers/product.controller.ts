import prisma from "@/lib/prisma";
import { normalizeProductName } from "@/lib/product-name-normalizer";
import type { CreateProduct, CreateProductVariantSepa, UpdateProduct, UpdateProductVariant } from "@myapp/shared/schemas/product.schema";
import { ProductService } from "@/services/product.service";
import type { CartEntryProduct, ProductStatus, TProduct } from "@/types";
import { sendError, sendSuccess } from "@/utils/response";
import { BarcodeStatus } from "generated/prisma";
import type { Context } from "hono";

export const ProductController = {
    async getAll(c: Context) {
        const page = Math.max(1, parseInt(c.req.query("page") ?? "1", 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(c.req.query("limit") ?? "20", 10) || 20));
        const search = c.req.query("search")?.trim() ?? "";
        const status = (c.req.query("status")?.trim().toUpperCase() ?? "ALL") as ProductStatus | "ALL";

        // console.log("[Status]", status);
        const VALID_STATUSES = ["ALL", "IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK"];
        if (!VALID_STATUSES.includes(status)) {
            return sendError(
                c,
                `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
                "INVALID_REQUEST",
                422
            );
        }

        const products = await ProductService.getAll(prisma, page, limit, search, status);

        return sendSuccess(
            c,
            {
                items: products.data,
                total: products.total,
                currentPage: page,
                totalPages: Math.ceil(products.total / limit),
                hasNext: page < Math.ceil(products.total / limit),
                hasPrev: page > 1,
            },
            "Products fetched successfully",
            200
        );
    },
    async getById(c: Context) {
        const id = c.req.param("id") ?? "";

        const product = await prisma.product.findUnique({
            where: {
                id: id
            },
            include: {
                category: true,
                variants: true,
            }
        });

        if (!product) {
            return sendError(c, "Product not found", "NOT_FOUND", 404);
        }

        const productData: TProduct = {
            id: product.id,
            name: product.name,
            description: product.description,
            brand: product.brand ?? "",
            isActive: product.is_active,
            category: {
                id: product.category_id,
                name: product.category.name,
            },
            reorderLevel: product.reorder_level,
            variants: product.variants.map((v) => ({
                id: v.id,
                name: v.name ?? "",
                isActive: v.is_active,
                color: v.color ?? "",
                size: v.size ?? "",
            })),
        }

        return sendSuccess(c, productData, "Product fetched successfully", 200);
    },
    async create(c: Context) {
        const body = c.get("validatedBody") as CreateProduct;
        const product = await ProductService.create(body)

        return sendSuccess(c, product, "Product created successfully", 201);
    },
    async update(c: Context) {
        const body = c.get("validatedBody") as UpdateProduct;
        const { id, name, description, reorder_level, category, brand } = body;

        await prisma.product.update({
            where: { id },
            data: {
                ...(name && {
                    name,
                    normalized_key: normalizeProductName(name),
                }),
                ...(brand && { brand }),
                ...(description !== undefined && { description }),
                ...(reorder_level !== undefined && { reorder_level }),
                ...(category && { category_id: category }),
            },
        });

        return sendSuccess(c, {}, "Product updated successfully", 200);
    },
    async deleteById(c: Context) {
        const { id } = await c.req.json();
        console.log("[Delete Product]", id);
        if (!id || typeof id !== "string" || id.trim() === "") {
            return sendError(c, "Invalid ID", "BAD_REQUEST", 400);
        }

        const product = await prisma.product.findUnique({
            where: { id },
            include: { variants: { select: { id: true } } },
        });

        if (!product) {
            return sendError(c, "Product not found", "NOT_FOUND", 404);
        }

        const variantIds = product.variants.map((v) => v.id);

        await prisma.$transaction(async (tx) => {
            await tx.variantBarcodeAllocation.deleteMany({
                where: { variant_id: { in: variantIds } },
            });

            await tx.stockLedger.deleteMany({
                where: { variant_id: { in: variantIds } },
            });

            await tx.purchaseItem.deleteMany({
                where: { variant_id: { in: variantIds } },
            });

            await tx.saleItem.deleteMany({
                where: { variant_id: { in: variantIds } },
            });

            await tx.productVariant.deleteMany({
                where: { id: { in: variantIds } },
            });

            await tx.product.delete({
                where: { id },
            });
        });

        return sendSuccess(c, {}, "Product deleted successfully", 200);
    },
    async getPurchaseData(c: Context) {
        const productVariants = await prisma.productVariant.findMany({
            include: {
                product: {
                    include: {
                        category: true,
                    }
                }
            },
        });

        const formattedProducts = productVariants.map((v) => ({
            id: v.id,
            name: `${v.product.name} - ${v.name}`,
            category: v.product.category.name,

        }));

        return sendSuccess(c, formattedProducts, "Products for purchase fetched successfully", 200);
    },

    async getByBarcode(c: Context) {
        const barcode = c.req.param("barcode");
        console.log("[Barcode]", barcode);

        if (!barcode?.trim()) {
            return sendError(c, "Invalid barcode", "BAD_REQUEST", 400);
        }


        let result: CartEntryProduct | null = null;
        await prisma.$transaction(async (tx) => {

            const barodeData = await tx.barcode.findUnique({
                where: {
                    code: barcode,
                    status: BarcodeStatus.ALLOCATED,
                },
            });

            if (!barodeData) {
                return sendError(c, "Barcode not found", "NOT_FOUND", 404);
            }

            const allocation = await tx.variantBarcodeAllocation.findFirst({
                where: {
                    barcode_id: barodeData.id
                },
                include: {
                    purchaseItem: {
                        select: {
                            sell_price: true,
                        },
                    },
                    variant: {
                        include: {
                            product: true,
                            stockLedgers: {
                                orderBy: { created_at: "desc" },
                                take: 1,
                                select: { balance_after: true },
                            },
                        },
                    },
                },
            });

            if (!allocation) {
                return sendError(c, "Barcode not found or not active", "NOT_FOUND", 404);
            }

            const { variant, purchaseItem } = allocation;
            const availableStock = variant.stockLedgers[0]?.balance_after ?? 0;

            result = {
                variantId: variant.id,
                name: `${variant.product.name}${variant.name ? ` - ${variant.name}` : ""}`,
                price: Number(purchaseItem.sell_price),
                barcode: barodeData.code,
                availableStock,
            };
        })
        // console.log(result)

        return sendSuccess(c, result ?? {}, "Variant fetched successfully", 200);
    },

    async updateVariant(c: Context) {
        const body = c.get("validatedBody") as UpdateProductVariant;
        const { id, color, size, } = body;

        console.log(id)
        console.log(color)
        console.log(size)

        if (!color && !size) {
            return sendError(c, "Color or size is required", "BAD_REQUEST", 400);
        }

        const variant = await prisma.productVariant.findUnique({
            where: { id },
        });

        if (!variant) {
            return sendError(c, "Variant not found", "NOT_FOUND", 404);
        }

        const name = `${color?.trim() ? color?.trim().toUpperCase() : variant.color ? variant.color : ""} / ${size?.trim() ? size?.trim().toUpperCase() : variant.size ? variant.size.toUpperCase() : ""}`

        const v = await prisma.productVariant.update({
            where: { id },
            data: {
                name,
                ...(color && { color, }),
                ...(size && { size }),
            },
        });
        return sendSuccess(c, {}, "Variant updated successfully", 200);
    },

    async toggleVariantById(c: Context) {
        const { id } = await c.req.json();

        console.log("[Deactive Variant]", id);
        if (!id || typeof id !== "string" || id.trim() === "") {
            return sendError(c, "Invalid ID", "BAD_REQUEST", 400);
        }

        const variant = await prisma.productVariant.findUnique({
            where: { id },
        });

        if (!variant) {
            return sendError(c, "Variant not found", "NOT_FOUND", 404);
        }

        await prisma.productVariant.update({
            where: { id },
            data: {
                is_active: !variant.is_active,
            },
        });

        return sendSuccess(c, {}, "Variant toggled successfully", 200);
    },

    async deleteVariantById(c: Context) {

        // check if variant is used in any purchase or sale
        // warning!!! :=> this func is not ready to use yet

        const { id } = await c.req.json();

        console.log("[Delete Variant]", id);
        if (!id || typeof id !== "string" || id.trim() === "") {
            return sendError(c, "Invalid ID", "BAD_REQUEST", 400);
        }

        const variant = await prisma.productVariant.findUnique({
            where: { id },
        });

        if (!variant) {
            return sendError(c, "Variant not found", "NOT_FOUND", 404);
        }

        await prisma.productVariant.delete({
            where: { id },
        });



        return sendSuccess(c, {}, "Variant deleted successfully", 200);
    },

    async createVariant(c: Context) {
        const body = c.get("validatedBody") as CreateProductVariantSepa;
        const { productId, color, size } = body;

        const product = await prisma.product.findUnique({
            where: { id: productId },
            include: {
                variants: true
            }
        });

        if (!product) {
            return sendError(c, "Product not found", "NOT_FOUND", 404);
        }

        const name = `${color?.trim() ? color?.trim().toUpperCase() : product.name} / ${size?.trim() ? size?.trim().toUpperCase() : product.name}`

        const variant = await prisma.productVariant.create({
            data: {
                product_id: product.id,
                name,
                color,
                size,
            },
        });

        return sendSuccess(c, variant, "Variant created successfully", 201);
    },
    async getProductStats(c: Context) {
        console.log("Hello")
        const result = await prisma.$queryRaw<
            {
                total_products: number
                total_stock: number
                total_low_stock: number
                total_out_of_stock: number
            }[]
        >`
        WITH latest_stock AS (
            SELECT DISTINCT ON (variant_id)
                variant_id,
                balance_after
            FROM stock_ledgers
            ORDER BY variant_id, created_at DESC
        ),
        variant_stock AS (
            SELECT
                pv.id,
                pv.product_id,
                COALESCE(ls.balance_after,0) AS stock
            FROM product_variants pv
            LEFT JOIN latest_stock ls ON ls.variant_id = pv.id
            WHERE pv.is_active = true
        ),
        product_stock AS (
            SELECT
                p.id,
                p.reorder_level,
                COALESCE(SUM(vs.stock),0) AS stock
            FROM products p
            LEFT JOIN variant_stock vs ON vs.product_id = p.id
            WHERE p.is_active = true
            GROUP BY p.id
        )
        SELECT
            COUNT(*)::int AS total_products,
            COALESCE(SUM(stock),0)::int AS total_stock,
            COUNT(*) FILTER (
                WHERE stock > 0 AND stock <= reorder_level
            )::int AS total_low_stock,
            COUNT(*) FILTER (
                WHERE stock = 0
            )::int AS total_out_of_stock
        FROM product_stock
        `

        const stats = result[0]

        return sendSuccess(
            c,
            {
                totalProducts: Number(stats?.total_products),
                totalStock: Number(stats?.total_stock),
                totalLowStock: Number(stats?.total_low_stock),
                totalOutOfStock: Number(stats?.total_out_of_stock),
            },
            "Product stats fetched successfully",
            200
        )
    }
}