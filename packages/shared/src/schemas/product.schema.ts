import { z } from "zod";
import { zodUUID } from "./helper";


const productVariant = z.object({
    color: z.string().optional(),
    size: z.string().optional(),
});

/** Trim to undefined so "  " never counts as a filled attribute. */
const attr = (v?: string) => {
    const t = v?.trim();
    return t ? t : undefined;
};

export const createProductSchema = z.object({
    name: z.string().min(1, "Product name is required"),
    description: z.string().optional(),
    reorder_level: z.number().optional(),
    brand: z.string().min(1, "Brand is required"),
    category_id: z.string().uuid("Please select a category"),
    variants: z.array(productVariant).min(1, "At least one variant is required"),
}).superRefine((data, ctx) => {
    // A product with a single variant needs no colour or size — that is the
    // plain "base variant" case the data model already allows (ProductVariant
    // .name is nullable precisely for it), and it is how real stock like
    // "Miniket Rice 5kg" or "USB-C Fast Charger" is entered.
    //
    // Two or more variants must each carry something that tells them apart,
    // otherwise the product ends up with indistinguishable rows.
    if (data.variants.length < 2) return;

    const seen = new Map<string, number>();

    data.variants.forEach((v, i) => {
        const color = attr(v.color);
        const size = attr(v.size);

        if (!color && !size) {
            // Anchor the issue on a field that is actually rendered. The old
            // path ["color","size"] resolved to `variants.N.color.size`, which
            // no input owns, so react-hook-form blocked submit while showing
            // no message at all — the form simply did nothing when clicked.
            ctx.addIssue({
                code: "custom",
                message: "Add a colour or size to tell this variant apart",
                path: ["variants", i, "color"],
            });
            return;
        }

        const key = `${(color ?? "").toLowerCase()}|${(size ?? "").toLowerCase()}`;
        const first = seen.get(key);
        if (first !== undefined) {
            ctx.addIssue({
                code: "custom",
                message: "This variant duplicates an earlier one",
                path: ["variants", i, "color"],
            });
        } else {
            seen.set(key, i);
        }
    });
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
            code: "custom",
            message: "Color or size is required",
            // Single-segment path: ["color","size"] resolved to `color.size`,
            // which no input owns, so the message never rendered.
            path: ["color"],
        });
    }
});

export type CreateProductVariant = z.infer<typeof productVariantSchema>
