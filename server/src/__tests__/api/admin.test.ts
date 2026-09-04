import { describe, it, expect, beforeEach } from 'bun:test'
import { mockPrisma, mockResend, resetAllMocks } from '../preload'
import { createTestApp, get, post, patch, del, json } from '../setup'

type ApiResponse<T> = { success: boolean; message: string; data: T }

const app = createTestApp() // OWNER — matches the real requireRole("OWNER") gate on this router

const USER_ID = '550e8400-e29b-41d4-a716-446655440020'

beforeEach(() => {
    resetAllMocks()
})

describe('POST /api/admin/invite', () => {
    it('returns 409 when the email is already registered', async () => {
        mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 'existing' })

        const res = await post(app, '/api/admin/invite', { email: 'taken@example.com' })
        expect(res.status).toBe(409)
    })

    it('creates a pending user and sends the invite email', async () => {
        mockPrisma.user.findUnique
            .mockResolvedValueOnce(null) // no existing user with this email
            .mockResolvedValueOnce({ name: 'Alice Owner', email: 'alice@example.com' }) // inviter lookup

        const res = await post(app, '/api/admin/invite', {
            email: 'new@example.com',
            role: 'STAFF',
        })
        expect(res.status).toBe(201)

        expect(mockPrisma.user.create.mock.calls[0]?.[0].data.status).toBe('PENDING')
        expect(mockResend.emails.send.mock.calls.length).toBe(1)
        expect(mockResend.emails.send.mock.calls[0]?.[0].to).toBe('new@example.com')
    })

    it('still returns 201 even when the invite email fails to send', async () => {
        mockPrisma.user.findUnique
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce({ name: 'Alice Owner', email: 'alice@example.com' })
        mockResend.emails.send.mockResolvedValueOnce({ data: null, error: { message: 'Resend is down' } as any })

        const res = await post(app, '/api/admin/invite', { email: 'new2@example.com' })
        // Access was already granted (the DB row exists) — a notification
        // failure must not undo that or surface as a user-facing error.
        expect(res.status).toBe(201)
    })
})

describe('PATCH /api/admin (update)', () => {
    it('returns 404 when the user does not exist', async () => {
        mockPrisma.user.findUnique.mockResolvedValueOnce(null)

        const res = await patch(app, '/api/admin', { id: USER_ID, role: 'OWNER' })
        expect(res.status).toBe(404)
    })

    it('updates role and persists it', async () => {
        mockPrisma.user.findUnique.mockResolvedValueOnce({ id: USER_ID, role: 'STAFF' })

        const res = await patch(app, '/api/admin', { id: USER_ID, role: 'OWNER' })
        expect(res.status).toBe(200)

        expect(mockPrisma.user.update.mock.calls[0]?.[0].data.role).toBe('OWNER')
    })
})

describe('DELETE /api/admin/invites (cancelInvite)', () => {
    it('returns 422 for a non-UUID id', async () => {
        const res = await del(app, '/api/admin/invites', { id: 'not-a-uuid' })
        expect(res.status).toBe(422)
    })

    it('returns 400 when the invite is already accepted', async () => {
        mockPrisma.user.findUnique.mockResolvedValueOnce({ id: USER_ID, status: 'ACCEPTED' })

        const res = await del(app, '/api/admin/invites', { id: USER_ID })
        expect(res.status).toBe(400)
    })

    it('cancels a pending invite', async () => {
        mockPrisma.user.findUnique.mockResolvedValueOnce({ id: USER_ID, status: 'PENDING' })

        const res = await del(app, '/api/admin/invites', { id: USER_ID })
        expect(res.status).toBe(200)
        expect(mockPrisma.user.update.mock.calls[0]?.[0].data.status).toBe('CANCELLED')
    })
})

describe('DELETE /api/admin/:id (remove/deactivate)', () => {
    it('refuses to let a user deactivate themself', async () => {
        // createTestApp() injects userId = 'test-user-uuid'
        const res = await del(app, '/api/admin/test-user-uuid')
        expect(res.status).toBe(403)
    })

    it('refuses to deactivate a user who is still PENDING', async () => {
        mockPrisma.user.findUnique.mockResolvedValueOnce({ id: USER_ID, status: 'PENDING' })

        const res = await del(app, '/api/admin/' + USER_ID)
        expect(res.status).toBe(400)
    })

    it('deactivates an accepted user', async () => {
        mockPrisma.user.findUnique.mockResolvedValueOnce({ id: USER_ID, status: 'ACCEPTED' })

        const res = await del(app, '/api/admin/' + USER_ID)
        expect(res.status).toBe(200)
        expect(mockPrisma.user.update.mock.calls[0]?.[0].data.is_active).toBe(false)
    })
})
