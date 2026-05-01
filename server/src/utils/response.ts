import type { Context } from 'hono'

type Meta = {
    page?: number
    limit?: number
    total?: number
    totalPages?: number
}

type SuccessResponse<T> = {
    success: true
    message: string
    data: T
    meta?: Meta
}

type ErrorResponse = {
    success: false
    message: string
    error: {
        code: string
        details?: unknown
    }
}

// Success
export const sendSuccess = <T>(
    c: Context,
    data: T,
    message = 'Success',
    status: 200 | 201 | 204 = 200,
    meta?: Meta
) => {
    const body: SuccessResponse<T> = { success: true, message, data }
    if (meta) body.meta = meta
    return c.json(body, status as any)
}

// Paginated list
export const sendList = <T>(
    c: Context,
    data: T[],
    meta: Meta,
    message = 'Fetched successfully'
) => sendSuccess(c, data, message, 200, meta)

// Error
export const sendError = (
    c: Context,
    message: string,
    code: string,
    status: 400 | 401 | 403 | 404 | 409 | 422 | 500 = 400,
    details?: unknown
) => {
    const body: ErrorResponse = {
        success: false,
        message,
        error: { code, details },
    }
    return c.json(body, status)
}