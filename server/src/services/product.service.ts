import prisma from "@/lib/prisma";
import { normalizeProductName } from "@/lib/product-name-normalizer";
import type { CreateProduct } from "@myapp/shared/schemas/product.schema";
import type { PrismaTx, ProductRow, ProductStatus, ProductTableRow } from "@/types";
import { Prisma } from "generated/prisma";

export const ProductService = {
    async getAll(
        tx: PrismaTx,
        page = 1,
        pageSize = 20,
        search: string = "",
        status?: ProductStatus | "ALL"
    ): Promise<{ data: ProductTableRow[]; total: number }> {
        const offset = (page - 1) * pageSize;

        // ── Search clause ──────────────────────────────────────────────────────
        const searchClause =
            search.trim() !== ""
                ? Prisma.sql`AND (
                LOWER(p.name)   ILIKE ${"%" + search.trim().toLowerCase() + "%"}
                OR LOWER(c.name) ILIKE ${"%" + search.trim().toLowerCase() + "%"}
              )`
                : Prisma.empty;

        // ── Status clause ──────────────────────────────────────────────────────
        // Status is computed in the CTE, so we filter AFTER computation.
        // We inject as a literal since it's an enum we control (safe).
        const statusClause =
            status && status !== "ALL"
                ? Prisma.sql`AND computed_status = ${status}`
                : Prisma.empty;

        const rows = await tx.$queryRaw<ProductRow[]>(Prisma.sql`
        WITH variant_stock AS (
            SELECT DISTINCT ON (variant_id)
                variant_id,
                balance_after AS stock
            FROM stock_ledgers
            ORDER BY variant_id, created_at DESC
        ),
        product_stock AS (
            SELECT
                pv.product_id,
                COALESCE(SUM(vs.stock), 0)::INT AS total_stock,
                COUNT(pv.id)::INT               AS total_variants
            FROM product_variants pv
            LEFT JOIN variant_stock vs ON vs.variant_id = pv.id
            WHERE pv.is_active = true
            GROUP BY pv.product_id
        ),
        computed AS (
            SELECT
                p.id,
                p.name,
                p.reorder_level,
                p.is_active,
                c.name                          AS category,
                COALESCE(ps.total_stock, 0)     AS stock,
                COALESCE(ps.total_variants, 0)  AS variants,
                CASE
                    WHEN COALESCE(ps.total_stock, 0) = 0                        THEN 'OUT_OF_STOCK'
                    WHEN COALESCE(ps.total_stock, 0) <= p.reorder_level         THEN 'LOW_STOCK'
                    ELSE 'IN_STOCK'
                END                             AS computed_status
            FROM products p
            INNER JOIN categories c ON c.id = p.category_id
            LEFT JOIN  product_stock ps ON ps.product_id = p.id
            WHERE p.is_active = true
        )
        SELECT
            id,
            name,
            reorder_level,
            category,
            stock,
            variants,
            computed_status  AS status,
            COUNT(*) OVER () AS total_count
        FROM computed
        WHERE 1 = 1
        ${searchClause}
        ${statusClause}
        ORDER BY name ASC
        LIMIT  ${pageSize}
        OFFSET ${offset}
    `);

        const total = rows.length > 0 ? Number((rows[0] as any).total_count) : 0;

        return {
            total,
            data: rows.map((row): ProductTableRow => ({
                id: row.id,
                name: row.name,
                category: row.category,
                stock: Number(row.stock),
                variants: Number(row.variants),
                status: row.status as ProductStatus,
            })),
        };
    },
    async getById(tx: PrismaTx, id: string) {
        return tx.product.findUnique({
            where: { id },
            include: {
                variants: true,
            },
        });
    },
    async create(data: CreateProduct) {
        const normalized = normalizeProductName(data.name);

        const result = await prisma.$transaction(async (tx) => {
            const product = await tx.product.create({
                data: {
                    name: data.name,
                    description: data.description,
                    normalized_key: normalized,
                    reorder_level: data.reorder_level,
                    brand: data.brand,
                    category: {
                        connect: {
                            id: data.category_id,
                        },
                    }
                },
                include: {
                    category: {
                        select: {
                            name: true
                        }
                    }
                }
            })
            const variants = await Promise.all(
                data.variants.map((variant) => {
                    return tx.productVariant.create({
                        data: {
                            product: {
                                connect: {
                                    id: product.id,
                                },
                            },
                            name: `${variant.size} - ${variant.color}`,
                            color: variant.color,
                            size: variant.size,
                        },
                    });

                })

            )
            await tx.product.update({
                where: { id: product.id },
                data: {
                    base_variant_id: variants[0]?.id,
                }
            })
            return { product, variants };
        });
        return result;
    },
    async update(tx: PrismaTx, id: string, data: any) {
        return tx.product.update({
            where: { id },
            data,
        });
    },
    async deleteById(tx: PrismaTx, id: string) {
        return tx.product.delete({
            where: { id },
        });
    },
}