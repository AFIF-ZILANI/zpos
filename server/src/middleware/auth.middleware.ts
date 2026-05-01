import { verifyToken } from "@clerk/backend";
import type { Context, Next } from "hono";
import { sendError } from "@/utils/response";
import type { AppEnv } from "@/types";

export async function requireAuth(c: Context<AppEnv>, next: Next) {
    const authHeader = c.req.header("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
        return sendError(c, "Missing auth token", "UNAUTHORIZED", 401);
    }

    const token = authHeader.slice(7);

    try {
        const payload = await verifyToken(token, {
            secretKey: process.env.CLERK_SECRET_KEY!,
        });
        c.set("clerkUserId", payload.sub);
        await next();
    } catch {
        return sendError(c, "Invalid or expired token", "UNAUTHORIZED", 401);
    }
}