import { z } from "zod"
import { createMiddleware } from "hono/factory"
import { sendError } from "@/utils/response"

export const validate = <T extends z.ZodType>(schema: T) =>
    createMiddleware(async (c, next) => {
        const body = await c.req.json()
        console.log("Body", body)
        const result = schema.safeParse(body)

        console.log("validation result", result)

        if (!result.success) {
            const errors = result.error.issues.map((i) => ({
                field: i.path.join("."),
                message: i.message,
            }))

            return sendError(c, "Validation failed", "VALIDATION_ERROR", 422, errors)
        }

        c.set("validatedBody", result.data)
        await next()
    })