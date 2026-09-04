import { sendError, sendSuccess } from "@/utils/response";
import type { Context } from "hono";
import prisma from "@/lib/prisma";
import type { CustomerTableData } from "@/types";
import type { CreateCustomer, UpdateCustomer } from "@myapp/shared/schemas/customer.schema";
import type { IdBody } from "@myapp/shared/schemas/helper";

export const customerController = {
    getAllCustomers: async (c: Context) => {
        const searchQ = c.req.query("search") || "";
        const limit = parseInt(c.req.query("limit") || "20");
        const page = parseInt(c.req.query("page") || "1");
        const activeStatus = c.req.query("status") as "ACTIVE" | "INACTIVE" | "ALL" | undefined;

        const skip = (page - 1) * limit;

        const where = {
            ...(searchQ && {
                OR: [
                    { name: { contains: searchQ, mode: "insensitive" as const } },
                    { phone: { contains: searchQ, mode: "insensitive" as const } },
                    { email: { contains: searchQ, mode: "insensitive" as const } },
                ],
            }),
            ...(activeStatus && activeStatus !== "ALL" && {
                is_active: activeStatus === "ACTIVE",
            }),
        };

        const [customers, total] = await Promise.all([
            prisma.customer.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: "desc" },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                    address: true,
                    is_active: true,
                    created_at: true,
                    sales: {
                        select: {
                            total: true,
                            created_at: true,
                        },
                        orderBy: { created_at: "desc" },
                    },
                },
            }),
            prisma.customer.count({ where }),
        ]);

        const mapped: CustomerTableData[] = customers.map((customer) => ({
            id: customer.id,
            name: customer.name ?? "",
            email: customer.email ?? undefined,
            phone: customer.phone ?? "",
            address: customer.address ?? "",
            status: customer.is_active ? "ACTIVE" : ("INACTIVE" as const),
            joinDate: customer.created_at.toISOString(),
            totalOrders: customer.sales.length,
            totalSpent: customer.sales.reduce(
                (sum, sale) => sum + Number(sale.total),
                0
            ),
            lastVisit:
                customer.sales.length > 0
                    ? customer.sales[0]?.created_at.toISOString()
                    : customer.created_at.toISOString(),
        }));

        return sendSuccess(
            c,
            {
                items: mapped,
                total: Math.ceil(total / limit),
                page,
                limit,
            },
            "Customers fetched successfully",
            200
        );
    },
    getCustomerStats: async (c: Context) => {
        const FREQUENT_THRESHOLD = 3;

        const [totalCustomers, activeCustomers, frequentCustomerIds] =
            await Promise.all([
                // total
                prisma.customer.count(),

                // active
                prisma.customer.count({
                    where: { is_active: true },
                }),

                // frequent: customers with 3+ sales
                prisma.sale.groupBy({
                    by: ["customer_id"],
                    where: {
                        customer_id: { not: null },
                    },
                    having: {
                        customer_id: {
                            _count: { gte: FREQUENT_THRESHOLD },
                        },
                    },
                    _count: { customer_id: true },
                }),
            ]);

        const stats = {
            totalCustomers,
            activeCustomers,
            inactiveCustomers: totalCustomers - activeCustomers,
            frequentCustomers: frequentCustomerIds.length,
        };

        return sendSuccess(c, stats, "Customer stats fetched successfully", 200);
    },
    createCustomer: async (c: Context) => {
        const body = c.get("validatedBody") as CreateCustomer
        const { name, email, phone, address } = body;

        const result = await prisma.$transaction(async (tx) => {
            const existingCustomer = await tx.customer.findFirst({
                where: {
                    OR: [
                        { phone: { equals: phone } },
                    ],
                },
            });

            if (existingCustomer) {
                return sendError(c, "Customer already exists", "CUSTOMER_ALREADY_EXISTS", 400);
            }

            return await tx.customer.create({
                data: {
                    name,
                    email,
                    phone,
                    address,
                },
            });
        })

        // sendError returns a Response — if the transaction returned an error response, bubble it up
        if (result instanceof Response) return result;

        return sendSuccess(c, result, "Customer created successfully", 201);
    },
    updateCustomer: async (c: Context) => {
        const { id, name, email, phone, address } = c.get("validatedBody") as UpdateCustomer;

        const result = await prisma.$transaction(async (tx) => {
            // Check the customer being updated actually exists
            const customer = await tx.customer.findUnique({
                where: { id },
            });

            if (!customer) {
                return sendError(c, "Customer not found", "CUSTOMER_NOT_FOUND", 404);
            }

            // Check if the new phone is already taken by a DIFFERENT customer
            if (phone !== customer.phone) {
                const phoneConflict = await tx.customer.findFirst({
                    where: {
                        phone,
                        NOT: { id }, // exclude self
                    },
                });

                if (phoneConflict) {
                    return sendError(c, "Phone number already in use", "PHONE_ALREADY_EXISTS", 400);
                }
            }

            return await tx.customer.update({
                where: { id },
                data: { name, email, phone, address },
            });
        });

        // sendError returns a Response — if the transaction returned an error response, bubble it up
        if (result instanceof Response) return result;

        return sendSuccess(c, result, "Customer updated successfully", 200);
    },
    toggleCustomerStatus: async (c: Context) => {
        const { id } = c.get("validatedBody") as IdBody;

        const result = await prisma.$transaction(async (tx) => {
            const customer = await tx.customer.findUnique({
                where: { id },
            });

            if (!customer) {
                return sendError(c, "Customer not found", "CUSTOMER_NOT_FOUND", 404);
            }

            return await tx.customer.update({
                where: { id },
                data: { is_active: !customer.is_active },
            });
        });

        if (result instanceof Response) return result;

        return sendSuccess(c, result, "Customer status toggled successfully", 200);
    },
    deleteCustomer: async (c: Context) => {
        const body: { id: string } = await c.req.json();

        const result = await prisma.$transaction(async (tx) => {
            const customer = await tx.customer.findUnique({
                where: { id: body.id },
            });

            if (!customer) {
                return sendError(c, "Customer not found", "CUSTOMER_NOT_FOUND", 404);
            }

            return await tx.customer.delete({
                where: { id: body.id },
            });
        });

        if (result instanceof Response) return result;

        return sendSuccess(c, result, "Customer deleted successfully", 200);
    },
};