import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { secureHeaders } from 'hono/secure-headers'
import { timeout } from 'hono/timeout'
import { rateLimiter } from 'hono-rate-limiter'
import { csrf } from 'hono/csrf'
import { compress } from 'hono/compress'
import { HTTPException } from 'hono/http-exception'
import { AppError } from '@/utils/AppError'
import { sendError, sendSuccess } from '@/utils/response'
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

// --- Response compression ---
// API payloads are JSON (product lists, sales history, dashboard series) and
// compress by roughly 5-10x. This is the single biggest transfer-size win on
// slow connections.
app.use('*', compress())

// --- Timeout ---
app.use('*', timeout(30_000))

// --- Rate Limiting ---
// Keyed per credential when one is present, falling back to IP. Keying on IP
// alone meant every till in a shop shared a single bucket behind one NAT — a
// busy counter plus a dashboard refresh could exhaust it and start failing real
// requests. The limit is also sized for POS traffic: a scan-heavy checkout
// legitimately issues a burst of calls.
app.use('*', rateLimiter({
    windowMs: 60_000,
    limit: Number(process.env.RATE_LIMIT_PER_MINUTE ?? 600),
    keyGenerator: (c) => {
        const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
        const auth = c.req.header('Authorization')
        // The token tail is stable per session and never logged; it just
        // separates concurrent users sharing an egress IP.
        return auth ? `t:${auth.slice(-32)}` : `ip:${ip}`
    },
}))

// --- Logging ---
// Per-request console I/O is synchronous and shows up under load, so keep the
// verbose logger to development only.
if (isDev) {
    app.use('*', logger())
}

// --- Public routes (no auth required) ---
app.get('/health', (c) =>
    c.json({ status: 'ok', timestamp: new Date().toISOString() })
)

// --- Auth middleware for all /api/* routes ---
// Must be registered BEFORE app.route() calls
app.use('/api/*', requireAuth, syncUser)

// --- Current user (so the client can gate role-only UI, e.g. /admin) ---
app.get('/api/me', (c) =>
    sendSuccess(c, { userId: c.get('userId'), role: c.get('userRole') })
)

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