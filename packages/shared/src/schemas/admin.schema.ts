
import { z } from "zod";
export const inviteSchema = z.object({
    email: z.string().email(),
    name: z.string().min(1).optional(),
    role: z.enum(["OWNER", "STAFF"]).default("STAFF"),
});

export const updateSchema = z.object({
    name: z.string().min(1).optional(),
    role: z.enum(["OWNER", "STAFF"]).optional(),
    is_active: z.boolean().optional(),
});


export type InviteInput = z.infer<typeof inviteSchema>;
export type UpdateInput = z.infer<typeof updateSchema>;