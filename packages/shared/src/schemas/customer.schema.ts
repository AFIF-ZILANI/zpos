import { z } from "zod";
import { zodUUID } from "./helper";

export const customerSchema = z.object({
    name: z
        .string()
        .min(1, "Customer name is required")
        .max(100, "Name too long"),

    phone: z
        .string()
        .trim()
        .regex(/^01[3-9]\d{8}$/, "Enter a valid Bangladeshi phone number"),

    email: z.string().trim().email("Invalid email").optional().or(z.literal("")),

    address: z
        .string()
        .trim()
        .max(255, "Address too long")
        .optional()
        .or(z.literal("")),
});

export type CreateCustomer = z.infer<typeof customerSchema>;


export const updateCustomerSchema = z.object({
    id: zodUUID,
    name: z
        .string()
        .min(1, "Customer name is required")
        .max(100, "Name too long"),

    phone: z
        .string()
        .trim()
        .regex(/^01[3-9]\d{8}$/, "Enter a valid Bangladeshi phone number"),

    email: z.string().trim().email("Invalid email").optional().or(z.literal("")),

    address: z
        .string()
        .trim()
        .max(255, "Address too long")
        .optional()
        .or(z.literal("")),
});

export type UpdateCustomer = z.infer<typeof updateCustomerSchema>;