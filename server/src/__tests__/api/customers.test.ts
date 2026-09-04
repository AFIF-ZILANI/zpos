import { describe, it, expect, beforeEach } from 'bun:test'
import { mockPrisma, resetAllMocks } from '../preload'
import { createTestApp, get, post, put, patch, json } from '../setup'

type ApiResponse<T> = { success: boolean; message: string; data: T }

const app = createTestApp()

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440001'
const VALID_UUID2 = '550e8400-e29b-41d4-a716-446655440002'

const MOCK_CUSTOMER = {
    id: VALID_UUID,
    name: 'Alice Smith',
    phone: '01700000001',
    email: 'alice@example.com',
    address: '123 Test St',
    is_active: true,
    created_at: new Date(),
    // sales is included by the controller's findMany select
    sales: [],
}

beforeEach(() => {
    resetAllMocks()
})

describe('GET /api/customers/get/all', () => {
    it('returns 200 with items array', async () => {
        mockPrisma.customer.findMany.mockResolvedValueOnce([MOCK_CUSTOMER])
        mockPrisma.customer.count.mockResolvedValueOnce(1)

        const res = await get(app, '/api/customers/get/all')
        expect(res.status).toBe(200)

        const body = await json<ApiResponse<unknown>>(res)
        expect(body.success).toBe(true)
    })

    it('returns 200 with empty list when no customers', async () => {
        mockPrisma.customer.findMany.mockResolvedValueOnce([])
        mockPrisma.customer.count.mockResolvedValueOnce(0)

        const res = await get(app, '/api/customers/get/all')
        expect(res.status).toBe(200)
    })
})

describe('POST /api/customers/create', () => {
    it('returns 422 when name is missing', async () => {
        const res = await post(app, '/api/customers/create', { phone: '01700000001' })
        expect(res.status).toBe(422)

        const body = await json<ApiResponse<null>>(res)
        expect(body.success).toBe(false)
    })

    it('returns 422 when phone is missing', async () => {
        const res = await post(app, '/api/customers/create', { name: 'Bob' })
        expect(res.status).toBe(422)
    })

    it('returns 201 with valid payload', async () => {
        // createCustomer wraps in $transaction and returns sendSuccess(c, {}, ..., 201)
        // so data is {} — just verify success and status
        mockPrisma.customer.create.mockResolvedValueOnce({
            ...MOCK_CUSTOMER,
            name: 'Bob Jones',
            phone: '01800000002',
        })

        const res = await post(app, '/api/customers/create', {
            name: 'Bob Jones',
            phone: '01800000002',
        })
        expect(res.status).toBe(201)

        const body = await json<ApiResponse<object>>(res)
        expect(body.success).toBe(true)
    })

    it('returns 201 when optional email/address are provided', async () => {
        mockPrisma.customer.create.mockResolvedValueOnce({
            ...MOCK_CUSTOMER,
            name: 'Carol',
            phone: '01900000003',
        })

        const res = await post(app, '/api/customers/create', {
            name: 'Carol',
            phone: '01900000003',
            email: 'carol@example.com',
            address: '456 Main St',
        })
        expect(res.status).toBe(201)
    })
})

describe('PUT /api/customers/update', () => {
    it('returns 422 when id is missing', async () => {
        const res = await put(app, '/api/customers/update', { name: 'New Name' })
        expect(res.status).toBe(422)
    })

    it('returns 200 on valid update', async () => {
        // update schema requires id to be a valid UUID
        mockPrisma.customer.findUnique.mockResolvedValueOnce(MOCK_CUSTOMER)
        mockPrisma.customer.update.mockResolvedValueOnce({
            ...MOCK_CUSTOMER,
            name: 'Updated Name',
        })

        const res = await put(app, '/api/customers/update', {
            id: VALID_UUID,
            name: 'Updated Name',
            phone: '01700000001',
        })
        expect(res.status).toBe(200)
    })
})

describe('PATCH /api/customers/toggle-status', () => {
    it('returns 422 when id is missing', async () => {
        const res = await patch(app, '/api/customers/toggle-status', {})
        expect([400, 422]).toContain(res.status)
    })

    it('returns 200 on valid toggle', async () => {
        mockPrisma.customer.findUnique.mockResolvedValueOnce(MOCK_CUSTOMER)
        mockPrisma.customer.update.mockResolvedValueOnce({
            ...MOCK_CUSTOMER,
            is_active: false,
        })

        const res = await patch(app, '/api/customers/toggle-status', {
            id: VALID_UUID,
        })
        expect(res.status).toBe(200)
    })
})

describe('GET /api/customers/get/stats', () => {
    it('returns 200 with stats', async () => {
        mockPrisma.customer.count.mockResolvedValue(25)

        const res = await get(app, '/api/customers/get/stats')
        expect(res.status).toBe(200)

        const body = await json<ApiResponse<unknown>>(res)
        expect(body.success).toBe(true)
    })
})
