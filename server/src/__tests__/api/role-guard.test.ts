import { describe, it, expect, beforeEach } from 'bun:test'
import { resetAllMocks } from '../preload'
import { createTestApp, del, post } from '../setup'

// Regression coverage for the fix that added requireRole("OWNER") to
// product/category/purchase delete routes — previously any authenticated
// STAFF (cashier) token could delete products, categories, or purchases.
// A 403 here is the whole point of the fix; if this ever regresses to 200,
// it means a cashier token can delete production data again.

const staffApp = createTestApp('STAFF')
const ownerApp = createTestApp('OWNER')

beforeEach(() => {
    resetAllMocks()
})

describe('STAFF role is blocked from destructive delete routes', () => {
    it('blocks STAFF from DELETE /api/products/delete', async () => {
        const res = await del(staffApp, '/api/products/delete', { id: '550e8400-e29b-41d4-a716-446655440000' })
        expect(res.status).toBe(403)
    })

    it('blocks STAFF from DELETE /api/categories/delete', async () => {
        const res = await del(staffApp, '/api/categories/delete', { id: '550e8400-e29b-41d4-a716-446655440000' })
        expect(res.status).toBe(403)
    })

    it('blocks STAFF from DELETE /api/purchase/delete', async () => {
        const res = await del(staffApp, '/api/purchase/delete', { id: '550e8400-e29b-41d4-a716-446655440000' })
        expect(res.status).toBe(403)
    })

    it('blocks STAFF from every /api/admin/* route', async () => {
        const res = await post(staffApp, '/api/admin/invite', { email: 'x@example.com' })
        expect(res.status).toBe(403)
    })
})

describe('OWNER role is allowed through the same guards', () => {
    it('does not block OWNER with a 403 on DELETE /api/products/delete', async () => {
        const res = await del(ownerApp, '/api/products/delete', { id: '550e8400-e29b-41d4-a716-446655440000' })
        // Reaches the controller (404 — product doesn't exist in this mock —
        // not 403). The guard, not the business logic, is what's under test.
        expect(res.status).not.toBe(403)
    })
})
