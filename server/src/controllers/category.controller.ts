import type { Context } from "hono";
import { sendError, sendSuccess } from "@/utils/response";
import prisma from "@/lib/prisma";
import type { UpdateCategory } from "@myapp/shared/schemas/category.schema";

export const categoryController = {
    async createCategory(c: Context) {
        const body = await c.req.json();
        const { name, description, parent_id } = body;

        if (!name || typeof name !== "string" || name.trim().length === 0) {
            return sendError(c, "Category name is required", "INVALID_INPUT", 400);
        }

        if (parent_id && typeof parent_id !== "string" && parent_id.trim().length === 0) {
            return sendError(c, "Parent ID must be a string", "INVALID_INPUT", 400);
        }

        if (description && typeof description !== "string" && description.trim().length === 0) {
            return sendError(c, "Description must be a string", "INVALID_INPUT", 400);
        }

        const existingCategory = await prisma.category.findFirst({
            where: {
                name: {
                    equals: name,
                    mode: "insensitive",
                },
            },
        });

        if (existingCategory) {
            return sendError(c, "Category already exists", "INVALID_INPUT", 400);
        }

        if (parent_id) {
            const parentCategory = await prisma.category.findUnique({
                where: {
                    id: parent_id,
                },
            });

            if (!parentCategory) {
                return sendError(c, "Parent category not found", "INVALID_INPUT", 400);
            }
        }



        await prisma.category.create({
            data: {
                name,
                description,
                slug: name.toLowerCase().replace(/\s+/g, "-"),
                parent_id: parent_id || null,
            }
        });
        return sendSuccess(c, {}, "Category created successfully", 201);
    },

    async getCategories(c: Context) {
        const categories = await prisma.category.findMany({
            where: {
                parent_id: null
            },
            select: {
                id: true,
                name: true,
                description: true,
                children: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        children: {
                            select: {
                                id: true,
                                name: true,
                                description: true,
                            }
                        }
                    }
                }
            }
        });
        return sendSuccess(c, categories, "Categories fetched successfully", 200);
    },

    async updateCategory(c: Context) {
        const body = c.get("validatedBody") as UpdateCategory;
        const { id, name, description } = body;

        const category = await prisma.category.findUnique({
            where: {
                id
            }
        });

        if (!category) {
            return sendError(c, "Category not found", "NOT_FOUND", 404);
        }

        await prisma.category.update({
            where: {
                id
            },
            data: {
                name,
                description,
            }
        });
        return sendSuccess(c, {}, "Category updated successfully", 200);
    },

    async deleteCategory(c: Context) {
        const { id } = await c.req.json();
        if (!id || typeof id !== "string" || id.trim() === "") {
            return sendError(c, "Invalid ID", "BAD_REQUEST", 400);
        }

        const category = await prisma.category.findUnique({
            where: { id },
            include: {
                children: true,
            }
        });

        if (!category) {
            return sendError(c, "Category not found", "NOT_FOUND", 404);
        }

        const childrenIds = category.children.map((child) => child.id);

        await prisma.$transaction(async (tx) => {

            const hasProductsLinked = await tx.product.findMany({
                where: {
                    category_id: {
                        in: [id, ...childrenIds],
                    },
                },
            });

            if (hasProductsLinked.length > 0) {

                throw new Error("Category has products linked", {
                    cause: {
                        code: "INVALID_INPUT",
                        statusCode: 400,
                    }
                });
            }

            if (childrenIds.length > 0) {
                await tx.category.deleteMany({
                    where: { id: { in: childrenIds } },
                });
            }
            await tx.category.delete({
                where: { id },
            });
        });

        return sendSuccess(c, {}, "Category deleted successfully", 200);
    },
};