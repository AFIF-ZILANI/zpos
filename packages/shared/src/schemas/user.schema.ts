import { Role } from "generated/prisma";
import { z } from "zod";

// ─── Reusable primitives ────────────────────────────────────────────────────

const phoneRegex = /^\+?[1-9]\d{1,3}[-\s]?\(?\d{1,4}\)?[-\s]?\d{1,4}[-\s]?\d{1,9}$/;
// Matches formats like:
// +8801712345678  +1 (555) 123-4567  +44 7911 123456  +61 412 345 678

const roleEnum = z.nativeEnum(Role)

// ─── Sub-schemas (mirror Prisma nullable/optional fields) ──────────────────

export const createUserSchema = z.object({
    fullName: z
        .string({ error: "Full name is required" })
        .min(3, "Full name must be at least 3 characters")
        .max(100, "Full name must be at most 100 characters")
        .trim(),

    email: z
        .string({ error: "Email is required" })
        .email("Invalid email address")
        .toLowerCase()
        .trim(),

    // phone is String? in Prisma → optional here
    phone: z
        .string()
        .regex(phoneRegex, "Invalid phone number — include country code e.g. +8801712345678"),

    password: z
        .string({ error: "Password is required" })
        .min(8, "Password must be at least 8 characters")
        .max(72, "Password must be at most 72 characters") // Argon2 input limit
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/[a-z]/, "Password must contain at least one lowercase letter")
        .regex(/[0-9]/, "Password must contain at least one number"),

    role: roleEnum,
})


export const loginSchema = z.object({
    email: z
        .string({ error: "Email is required" })
        .email("Invalid email address")
        .toLowerCase()
        .trim(),

    password: z
        .string({ error: "Password is required" })
        .min(1, "Password is required"), // no complexity check on login
})

// ─── Inferred types ─────────────────────────────────────────────────────────

export type CreateUser = z.infer<typeof createUserSchema>
export type Login = z.infer<typeof loginSchema>