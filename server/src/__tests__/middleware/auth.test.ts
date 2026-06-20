import { describe, it, expect } from 'bun:test'
import { app } from '@/app'

// Tests against the REAL app (with Clerk auth) to verify auth enforcement.
// We don't need a real Clerk token — passing no/bad tokens is enough to assert 401.
// Prisma is mocked by the preload file so no DB connection is required.

describe('Auth middleware', () => {
    it('blocks /api/* without Authorization header → 401', async () => {
        const res = await app.request('/api/products/get/all')
        expect(res.status).toBe(401)
    })

    it('blocks /api/* with malformed Authorization header → 401', async () => {
        const res = await app.request('/api/products/get/all', {
            headers: { Authorization: 'Token bad-format' },
        })
        expect(res.status).toBe(401)
    })

    it('blocks /api/* with an invalid Bearer token → 401', async () => {
        const res = await app.request('/api/products/get/all', {
            headers: { Authorization: 'Bearer not.a.valid.jwt' },
        })
        expect(res.status).toBe(401)
    })

    it('allows /health without auth → 200', async () => {
        const res = await app.request('/health')
        expect(res.status).toBe(200)
    })

    it('returns 404 (not 401) for non-existent public routes', async () => {
        const res = await app.request('/nonexistent-public-route')
        // No auth applied — should 404, not 401
        expect(res.status).toBe(404)
    })

    it('error response body has success=false', async () => {
        const res = await app.request('/api/products/get/all')
        const body = await res.json() as { success: boolean; error: { code: string } }
        expect(body.success).toBe(false)
        expect(body.error.code).toBe('UNAUTHORIZED')
    })
})
