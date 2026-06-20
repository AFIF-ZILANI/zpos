import { describe, it, expect } from 'bun:test'
import { createTestApp, json } from './setup'

describe('GET /health', () => {
    const app = createTestApp()

    it('returns 200', async () => {
        const res = await app.request('/health')
        expect(res.status).toBe(200)
    })

    it('body has status "ok"', async () => {
        const res = await app.request('/health')
        const body = await json<{ status: string; timestamp: string }>(res)
        expect(body.status).toBe('ok')
    })

    it('body has a valid ISO timestamp', async () => {
        const res = await app.request('/health')
        const body = await json<{ status: string; timestamp: string }>(res)
        expect(typeof body.timestamp).toBe('string')
        expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp)
    })

    it('does not require Authorization', async () => {
        // health is public — no auth header needed
        const res = await app.request('/health', { headers: {} })
        expect(res.status).toBe(200)
    })
})
