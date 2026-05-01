import { z } from "zod";
import { zodUUID } from "./helper";


const productVariant = z.object({
    color: z.string().optional(),
    size: z.string().optional(),
}).superRefine((data, ctx) => {
    if (!data.color && !data.size) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Color or size is required",
            path: ["color", "size"],
        });
    }
});

export const createProductSchema = z.object({
    name: z.string().min(1, "Product name is required"),
    description: z.string().optional(),
    reorder_level: z.number().optional(),
    brand: z.string().min(1, "Brand is required"),
    category_id: z.string().uuid(),
    variants: z.array(productVariant),
});


export const updateProductSchema = z.object({
    id: z.string().uuid(),
    name: z.string().optional(),
    description: z.string().optional(),
    reorder_level: z.number().optional(),
    category: z.string().uuid().optional(),
    brand: z.string().optional(),
})


export type CreateProduct = z.infer<typeof createProductSchema>
export type UpdateProduct = z.infer<typeof updateProductSchema>


export const updateProductVariantSchema = z.object({
    id: z.string().uuid(),
    color: z.string().optional(),
    size: z.string().optional(),
})

export type UpdateProductVariant = z.infer<typeof updateProductVariantSchema>

export const createProductVariantSchemaSepa = z.object({
    productId: zodUUID,
    color: z.string().optional(),
    size: z.string().optional(),
})

export type CreateProductVariantSepa = z.infer<typeof createProductVariantSchemaSepa>



export const productVariantSchema = z.object({
    color: z.string().optional(),
    size: z.string().optional(),
}).superRefine((data, ctx) => {
    if (!data.color && !data.size) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Color or size is required",
            path: ["color", "size"],
        });
    }
});

export type CreateProductVariant = z.infer<typeof productVariantSchema>
