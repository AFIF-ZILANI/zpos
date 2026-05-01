// services/invoice.service.ts
import prisma from "@/lib/prisma";
import type { Decimal } from "generated/prisma/runtime/client";
import type { Invoice } from "@/types";


function d(val: Decimal): number {
    return val.toNumber();
}

export async function generateInvoice(saleId: string): Promise<Invoice> {
    const sale = await prisma.sale.findUnique({
        where: { id: saleId },
        include: {
            user: {
                select: { id: true, name: true },
            },
            customer: {
                select: { id: true, name: true, phone: true },
            },
            items: {
                include: {
                    variant: {
                        select: {
                            name: true,           // variant name e.g. "Red / XL"
                            product: {
                                select: { name: true }, // parent product name
                            },
                        },
                    },
                },
            },
            payments: true,
        },
    });

    if (!sale) throw new Error(`Sale not found: ${saleId}`);

    // If you add invoice_number to Sale model later, use that.
    // For now, derive it from created_at + short ID.
    const invoiceNumber = buildInvoiceNumber(sale.id, sale.created_at);

    return {
        invoice_number: invoiceNumber,
        sale_id: sale.id,
        date: sale.created_at,
        cashier: {
            id: sale.user.id,
            name: sale.user.name || "Unknown",
        },
        customer: sale.customer
            ? {
                id: sale.customer.id,
                name: sale.customer.name || "Unknown",
                phone: sale.customer.phone ?? null,
            }
            : null,
        items: sale.items.map((item) => ({
            variant_id: item.variant_id,
            product_name: item.variant.product.name,
            variant_name: item.variant.name ?? null,
            quantity: item.quantity,
            unit_price: d(item.unit_price),
            discount_amount: d(item.discount_amount),
            total: d(item.total),
        })),
        payments: sale.payments.map((p) => ({
            method: p.method,
            amount: d(p.amount),
            reference: p.reference ?? null,
        })),
        subtotal: d(sale.subtotal),
        discount_amount: d(sale.discount_amount),
        tax_amount: d(sale.tax_amount),
        total: d(sale.total),
        note: sale.note ?? null,
        status: sale.status,
    };
}

function buildInvoiceNumber(saleId: string, createdAt: Date): string {
    const date = createdAt.toISOString().slice(0, 10).replace(/-/g, ""); // "20240427"
    const short = saleId.slice(0, 8).toUpperCase();                      // "A3F9C2B1"
    return `INV-${date}-${short}`;                                        // "INV-20240427-A3F9C2B1"
}