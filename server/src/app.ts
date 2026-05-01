import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { secureHeaders } from 'hono/secure-headers'
import { timeout } from 'hono/timeout'
import { rateLimiter } from 'hono-rate-limiter'
import { csrf } from 'hono/csrf'
import { HTTPException } from 'hono/http-exception'
import { AppError } from '@/utils/AppError'
import { sendError } from '@/utils/response'
import productRouter from './routes/product.route'
import categoryRouter from './routes/category.route'
import purchaseRouter from './routes/purchase.route'
import saleRouter from './routes/sale.route'
import dashboardRouter from './routes/dashbord.route'
import customerRouter from './routes/customer.route'
import analyticsRouter from './routes/analytics.route'
import adminRouter from './routes/admin.route'

import { requireAuth } from './middleware/auth.middleware'
import { syncUser } from './middleware/authSyncUser.middleware'
import type { AppEnv } from './types'

export const app = new Hono<AppEnv>()

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') ?? [
    'http://localhost:3000',
    'http://localhost:5173',
]

// --- Security Headers ---
app.use('*', secureHeaders({
    contentSecurityPolicy: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
    },
    xFrameOptions: 'DENY',
    referrerPolicy: 'strict-origin-when-cross-origin',
}))

const isDev = process.env.NODE_ENV === 'development'

// --- CSRF Protection (skip in dev) ---
if (!isDev) {
    app.use('*', csrf({ origin: allowedOrigins }))
}

// --- CORS ---
app.use('*', cors({
    origin: isDev ? '*' : allowedOrigins,
    allowMethods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    exposeHeaders: ['X-Request-Id'],
    credentials: isDev ? false : true,
    maxAge: 86400,
}))

// --- Timeout ---
app.use('*', timeout(30_000))

// --- Rate Limiting ---
app.use('*', rateLimiter({
    windowMs: 60_000,
    limit: 120,
    keyGenerator: (c) =>
        c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown',
}))

// --- Logging ---
app.use('*', logger())

// --- Public routes (no auth required) ---
app.get('/health', (c) =>
    c.json({ status: 'ok', timestamp: new Date().toISOString() })
)

// --- Auth middleware for all /api/* routes ---
// Must be registered BEFORE app.route() calls
app.use('/api/*', requireAuth, syncUser)

// --- Auth test (useful during development) ---
if (isDev) {
    app.get('/api/auth-test', (c) =>
        c.json({
            clerkUserId: c.get('clerkUserId'),
            userId: c.get('userId'),
            userRole: c.get('userRole'),
        })
    )
}

// --- Routes ---
app.route('/api/products', productRouter)
app.route('/api/categories', categoryRouter)
app.route('/api/purchase', purchaseRouter)
app.route('/api/sales', saleRouter)
app.route('/api/dashboard', dashboardRouter)
app.route('/api/analytics', analyticsRouter)
app.route('/api/customers', customerRouter)
app.route('/api/admin', adminRouter)

// --- Error Handling ---
app.onError((err, c) => {
    if (err instanceof AppError) {
        return sendError(c, err.message, err.code, err.status, err.details)
    }
    if (err instanceof HTTPException) {
        return sendError(c, err.message || 'Request failed', 'HTTP_ERROR', err.status as any)
    }
    console.error('[Unhandled]', err)
    return sendError(c, 'Internal server error', 'INTERNAL_ERROR', 500)
})

app.notFound((c) => sendError(c, 'Route not found', 'ROUTE_NOT_FOUND', 404))