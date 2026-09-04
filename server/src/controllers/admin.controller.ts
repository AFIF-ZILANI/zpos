import type { Context } from "hono";
import type { AppEnv } from "@/types";
import prisma from "@/lib/prisma";
import { sendError, sendSuccess } from "@/utils/response";
import type { InviteInput, UpdateInput } from "@myapp/shared/schemas/admin.schema";
import type { IdBody } from "@myapp/shared/schemas/helper";
import { InviteStatus } from "generated/prisma";
import { sendInviteEmail } from "@/services/invite.service";


export const AdminController = {
    // GET /api/admin — list all users
    async getAll(c: Context<AppEnv>) {
        const users = await prisma.user.findMany({
            where: { status: InviteStatus.ACCEPTED },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                status: true,
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

        const inviter = await prisma.user.findUnique({
            where: { id: c.get("userId") },
            select: { name: true, email: true },
        });

        await prisma.user.create({
            data: {
                email,
                name: name ?? null,
                role,
                status: InviteStatus.PENDING,
                is_active: true,
            }
        });

        // Access has already been granted at this point — a failed email is a
        // notification problem, not a reason to fail the invite itself.
        try {
            await sendInviteEmail({
                toEmail: email,
                invitedBy: inviter?.name || inviter?.email || "A team member",
                role,
            });
        } catch (err) {
            console.error("[admin.invite] Failed to send invite email:", err);
        }

        return sendSuccess(c, {}, "User invited successfully", 201);
    },

    // PATCH /api/admin/:id — update role or active status
    async update(c: Context<AppEnv>) {
        const body = c.get("validatedBody") as UpdateInput;
        const user = await prisma.user.findUnique({ where: { id: body.id } });
        if (!user) {
            return sendError(c, "User not found", "NOT_FOUND", 404);
        }

        await prisma.user.update({
            where: { id: body.id },
            data: body,
        });

        return sendSuccess(c, {}, "User updated", 200);
    },

    // DELETE /api/admin/:id — deactivate (soft delete)
    async remove(c: Context<AppEnv>) {
        const id = c.req.param("id");

        if (id === c.get("userId")) {
            return sendError(c, "You cannot deactivate yourself", "FORBIDDEN", 403);
        }

        const user = await prisma.user.findUnique({ where: { id } });
        if (!user) {
            return sendError(c, "User not found", "NOT_FOUND", 404);
        }

        if (user.status === "CANCELLED" || user.status === "PENDING") {
            return sendError(c, "User is not eligible to be deactivated", "BAD_REQUEST", 400);
        }

        await prisma.user.update({
            where: { id },
            data: { is_active: false },
        });

        return sendSuccess(c, null, "User deactivated", 200);
    },
    async cancelInvite(c: Context<AppEnv>) {
        const { id } = c.get("validatedBody") as IdBody;

        const user = await prisma.user.findUnique({ where: { id } });

        if (!user) {
            return sendError(c, "User not found", "NOT_FOUND", 404);
        }

        if (user.status === "CANCELLED" || user.status === "ACCEPTED") {
            return sendError(c, "User is not eligible to be cancelled", "BAD_REQUEST", 400);
        }

        await prisma.user.update({
            where: { id },
            data: { status: InviteStatus.CANCELLED },
        });

        return sendSuccess(c, null, "Invitation cancelled", 200);
    },
    async getInvites(c: Context<AppEnv>) {
        const invites = await prisma.user.findMany({
            where: { status: InviteStatus.PENDING },
            select: {
                id: true,
                email: true,
                name: true,
                status: true,
                role: true,
                created_at: true,
            },
            orderBy: { created_at: "desc" },
        });

        return sendSuccess(c, { items: invites }, "Invites fetched", 200);
    },
    async getDeactivatedUsers(c: Context<AppEnv>) {
        const users = await prisma.user.findMany({
            where: { AND: [{ is_active: false }, { status: InviteStatus.ACCEPTED }] },
            select: {
                id: true,
                email: true,
                name: true,
                phone: true,
                role: true,
                is_active: true,
                created_at: true,
                updated_at: true,
                status: true,
            },
            orderBy: { created_at: "desc" },
        });

        return sendSuccess(c, { items: users }, "Users fetched", 200);
    },
};