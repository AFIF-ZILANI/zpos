import { createClerkClient } from "@clerk/backend";
import type { Context, Next } from "hono";
import type { AppEnv } from "@/types";
import prisma from "@/lib/prisma";
import { sendError } from "@/utils/response";

const clerk = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY!,
});

export async function syncUser(c: Context<AppEnv>, next: Next) {
    const clerkUserId = c.get("clerkUserId");

    try {
        const clerkUser = await clerk.users.getUser(clerkUserId);
        const email = clerkUser.emailAddresses[0]?.emailAddress;

        if (!email) {
            return sendError(c, "No email associated with this account", "UNAUTHORIZED", 401);
        }

        // Check if this email is pre-approved in your DB
        const user = await prisma.user.findUnique({
            where: { email },
            select: { id: true, role: true, is_active: true },
        });

        // Not in DB = not invited = blocked
        if (!user) {
            return sendError(
                c,
                "Access denied. Your account has not been granted access to this system.",
                "FORBIDDEN",
                403
            );
        }

        // In DB but deactivated = blocked
        if (!user.is_active) {
            return sendError(
                c,
                "Your account has been deactivated. Contact your administrator.",
                "FORBIDDEN",
                403
            );
        }

        // Sync name from Clerk in case it changed
        await prisma.user.update({
            where: { id: user.id },
            data: {
                name: [clerkUser.firstName, clerkUser.lastName]
                    .filter(Boolean)
                    .join(" ") || undefined,
            },
        });

        c.set("userId", user.id);
        c.set("userRole", user.role);

        await next();
    } catch (err) {
        console.error("[syncUser]", err);
        return sendError(c, "Authentication failed", "INTERNAL_ERROR", 500);
    }
}