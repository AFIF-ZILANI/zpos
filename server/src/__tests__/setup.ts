import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { AppError } from '@/utils/AppError'
import { sendError } from '@/utils/response'
import productRouter from '@/routes/product.route'
import categoryRouter from '@/routes/category.route'
import saleRouter from '@/routes/sale.route'
import dashboardRouter from '@/routes/dashbord.route'
import customerRouter from '@/routes/customer.route'
import purchaseRouter from '@/routes/purchase.route'
import adminRouter from '@/routes/admin.route'
import type { AppEnv } from '@/types'

// Creates a test version of the app that bypasses Clerk auth
// Always injects OWNER role context — covers the majority of business logic tests
export function createTestApp() {
    const app = new Hono<AppEnv>()

    // Stub auth: skip Clerk verification, inject test user into context
    app.use('/api/*', async (c, next) => {
        c.set('clerkUserId', 'clerk_test_user_id')
        c.set('userId', 'test-user-uuid')
        c.set('userRole', 'OWNER')
        await next()
    })

    app.get('/health', (c) =>
        c.json({ status: 'ok', timestamp: new Date().toISOString() })
    )

    app.route('/api/products', productRouter)
    app.route('/api/categories', categoryRouter)
    app.route('/api/sales', saleRouter)
    app.route('/api/dashboard', dashboardRouter)
    app.route('/api/customers', customerRouter)
    app.route('/api/purchase', purchaseRouter)
    app.route('/api/admin', adminRouter)

    app.onError((err, c) => {
        if (err instanceof AppError) return sendError(c, err.message, err.code, err.status, err.details)
        if (err instanceof HTTPException) return sendError(c, err.message, 'HTTP_ERROR', err.status as any)
        console.error('[test-app error]', err)
        return sendError(c, 'Internal server error', 'INTERNAL_ERROR', 500)
    })

    app.notFound((c) => sendError(c, 'Route not found', 'ROUTE_NOT_FOUND', 404))

    return app
}

export type TestApp = ReturnType<typeof createTestApp>

// Convenience: parse JSON response
export async function json<T = unknown>(res: Response): Promise<T> {
    return res.json() as Promise<T>
}

// Convenience: GET request
export function get(app: TestApp, path: string, query?: Record<string, string>) {
    const url = query ? `${path}?${new URLSearchParams(query)}` : path
    return app.request(url, { method: 'GET' })
}

// Convenience: POST request with JSON body
export function post(app: TestApp, path: string, body: unknown) {
    return app.request(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    })
}

// Convenience: PATCH request with JSON body
export function patch(app: TestApp, path: string, body: unknown) {
    return app.request(path, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    })
}

// Convenience: PUT request with JSON body
export function put(app: TestApp, path: string, body: unknown) {
    return app.request(path, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    })
}

// Convenience: DELETE request
export function del(app: TestApp, path: string, body?: unknown) {
    return app.request(path, {
        method: 'DELETE',
        headers: body ? { 'Content-Type': 'application/json' } : {},
        body: body ? JSON.stringify(body) : undefined,
    })
}
