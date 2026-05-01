import { z } from "zod";

export const updateCategorySchema = z.object({
    id: z.string().min(1, "Category ID is required"),
    name: z.string().min(1, "Category name is required").optional(),
    description: z.string().optional(),
});

export type UpdateCategory = z.infer<typeof updateCategorySchema>;


export const categorySchema = z.object({
    name: z.string().min(1, "Category name is required").max(100),
    description: z.string().max(255).optional(),
    parent_id: z.string().optional(),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;