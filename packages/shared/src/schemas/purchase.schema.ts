import { z } from "zod";
import { zodUUID, decimalNumber, zodDate, bangladeshiPhoneSchema } from "./helper";

const product = z.object({
    variantId: zodUUID,
    unitCost: decimalNumber,
    quantity: decimalNumber,
    sellingPrice: decimalNumber,
})


export const newPurchaseSchema = z.object({
    date: zodDate,
    invoiceNo: z.string().optional(),
    supplier: z.string().min(1, "Supplier name is required"),
    email: z.string().email("Invalid email").optional(),
    phone: bangladeshiPhoneSchema,
    note: z.string().optional(),
    products: z.array(product).min(1, "At least one product is required"),
})

export type NewPurchase = z.input<typeof newPurchaseSchema>
export type NewPurchaseProduct = z.input<typeof product>
