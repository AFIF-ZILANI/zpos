
import { z } from "zod";

export const paymentMethodSchema = z.enum(["CASH", "BKASH", "NAGAD", "ROCKET"]);
export const paymentStatusSchema = z.enum(["PAID", "DUE", "PARTIAL"]);

export const customerInfoSchema = z.object({
    name: z.string().min(1, "Customer name is required"),
    phone: z.string().min(1, "Phone is required"),
    email: z.string().email("Invalid email").or(z.literal("")),
    address: z.string(),
});

export const checkoutPayloadSchema = z.object({
    method: paymentMethodSchema,
    status: paymentStatusSchema,
    paidAmount: z.number().nonnegative("Paid amount cannot be negative"),
    customer: customerInfoSchema,
});

export const saleSchema = z.object({
    cartItems: z
        .array(
            z.object({
                variantId: z.string().min(1),
                quantity: z.number().int().positive("Quantity must be at least 1"),
                barcode: z.string().min(13).max(13),
                discount: z.object({
                    type: z.enum(["percent", "fixed"]),
                    amount: z.number().nonnegative(),
                }),
            })
        )
        .min(1, "Cart cannot be empty"),

    totalAmount: z.number().nonnegative(),
    checkout: checkoutPayloadSchema,
}).refine(
    (data) => {
        if (data.checkout.status === "PAID") {
            return data.checkout.paidAmount >= data.totalAmount;
        }
        if (data.checkout.status === "DUE") {
            return data.checkout.paidAmount === 0;
        }
        if (data.checkout.status === "PARTIAL") {
            return (
                data.checkout.paidAmount > 0 &&
                data.checkout.paidAmount < data.totalAmount
            );
        }
        return true;
    },
    {
        message: "Paid amount is inconsistent with payment status",
        path: ["checkout", "paidAmount"],
    }
);

export type SalePayload = z.infer<typeof saleSchema>;