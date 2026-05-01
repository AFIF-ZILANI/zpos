import type { Context } from "hono";
import type { AppEnv } from "@/types";
import prisma from "@/lib/prisma";
import { sendError, sendSuccess } from "@/utils/response";
import type { InviteInput, UpdateInput } from "@myapp/shared/schemas/admin.schema";
import { Role } from "generated/prisma";


export const AdminController = {
    // GET /api/admin — list all users
    async getAll(c: Context<AppEnv>) {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true,
                is_active: true,
                created_at: true,
            },
            orderBy: { created_at: "desc" },
        });

        return sendSuccess(c, { items: users }, "Users fetched", 200);
    },

    // POST /api/admin/invite — pre-register an email so they can sign in
    async invite(c: Context<AppEnv>) {
        const body = c.get("validatedBody") as InviteInput;

        const { email, name, role } = body;

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return sendError(c, "This email is already registered", "CONFLICT", 409);
        }

        const user = await prisma.user.create({
            data: {
                email,
                name: name ?? null,
                role,
                password_hash: "clerk_managed",
                is_active: true,
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                is_active: true,
            },
        });

        return sendSuccess(c, user, "User invited successfully", 201);
    },

    // PATCH /api/admin/:id — update role or active status
    async update(c: Context<AppEnv>) {
        const id = c.req.param("id");
        const body = c.get("validatedBody") as UpdateInput;

        // Prevent demoting yourself
        if (id === c.get("userId") && body.role === Role.STAFF) {
            return sendError(c, "You cannot change your own role", "FORBIDDEN", 403);
        }

        const user = await prisma.user.update({
            where: { id },
            data: body,
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                is_active: true,
            },
        });

        return sendSuccess(c, user, "User updated", 200);
    },

    // DELETE /api/admin/:id — deactivate (soft delete)
    async remove(c: Context<AppEnv>) {
        const id = c.req.param("id");

        if (id === c.get("userId")) {
            return sendError(c, "You cannot deactivate yourself", "FORBIDDEN", 403);
        }

        await prisma.user.update({
            where: { id },
            data: { is_active: false },
        });

        return sendSuccess(c, null, "User deactivated", 200);
    },
};