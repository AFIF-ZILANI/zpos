import type { Context, Next } from "hono";
import type { AppEnv } from "@/types";
import { sendError } from "@/utils/response";

export function requireRole(...roles: string[]) {
    return async (c: Context<AppEnv>, next: Next) => {
        const role = c.get("userRole");
        if (!roles.includes(role)) {
            return sendError(c, "Insufficient permissions", "FORBIDDEN", 403);
        }
        await next();
    };
}