import { describe, it, expect, beforeEach } from 'bun:test'
import { Decimal } from 'generated/prisma/runtime/client'
import { mockPrisma, resetAllMocks } from '../preload'
import { createTestApp, get, post, json } from '../setup'

type ApiResponse<T> = { success: boolean; message: string; data: T }

const app = createTestApp()

const NOW = new Date().toISOString()
const DATE_RANGE = { from: '2026-01-01', to: '2026-12-31' }

beforeEach(() => {
    resetAllMocks()
})

// ── createPayment ──────────────────────────────────────────────────────────────

describe('POST /api/sales/payment/create', () => {
    it('returns 422 when saleId is missing', async () => {
        const res = await post(app, '/api/sales/payment/create', {
            amount: 50,
            method: 'CASH',
        })
        expect(res.status).toBe(422)
    })

    it('returns 422 when amount is missing', async () => {
        const res = await post(app, '/api/sales/payment/create', {
            saleId: 'sale-1',
            method: 'CASH',
        })
        expect(res.status).toBe(422)
    })

    it('returns 422 when method is missing', async () => {
        const res = await post(app, '/api/sales/payment/create', {
            saleId: 'sale-1',
            amount: 50,
        })
        expect(res.status).toBe(422)
    })

    it('returns 422 when amount is zero', async () => {
        const res = await post(app, '/api/sales/payment/create', {
            saleId: 'sale-1',
            amount: 0,
            method: 'CASH',
        })
        expect(res.status).toBe(422)
    })

    it('returns 422 when amount is negative', async () => {
        const res = await post(app, '/api/sales/payment/create', {
            saleId: 'sale-1',
            amount: -10,
            method: 'CASH',
        })
        expect(res.status).toBe(422)
    })

    it('returns 422 for invalid payment method', async () => {
        mockPrisma.sale.findUnique.mockResolvedValueOnce({
            id: 'sale-1',
            invoice_number: 'INV-2026-000001',
            total: new Decimal(100),
            payments: [],
            customer: null,
        })

        const res = await post(app, '/api/sales/payment/create', {
            saleId: 'sale-1',
            amount: 50,
            method: 'INVALID_METHOD',
        })
        expect(res.status).toBe(422)
    })

    it('returns 404 when sale does not exist', async () => {
        mockPrisma.sale.findUnique.mockResolvedValueOnce(null)

        const res = await post(app, '/api/sales/payment/create', {
            saleId: 'nonexistent-sale',
            amount: 50,
            method: 'CASH',
        })
        expect(res.status).toBe(404)
    })

    it('returns 422 when payment would exceed total', async () => {
        mockPrisma.$queryRaw.mockResolvedValueOnce([{ id: 'sale-1' }])
        mockPrisma.sale.findUnique.mockResolvedValueOnce({
            id: 'sale-1',
            invoice_number: 'INV-2026-000001',
            total: new Decimal(100),
            payments: [],
            customer: null,
        })

        const res = await post(app, '/api/sales/payment/create', {
            saleId: 'sale-1',
            amount: 150, // exceeds total of 100
            method: 'CASH',
        })
        expect(res.status).toBe(422)

        const body = await json<ApiResponse<null>>(res)
        expect(body.success).toBe(false)
    })

    it('creates payment and does NOT update sale discount (bug fix verification)', async () => {
        mockPrisma.$queryRaw.mockResolvedValueOnce([{ id: 'sale-1' }])
        mockPrisma.sale.findUnique.mockResolvedValueOnce({
            id: 'sale-1',
            invoice_number: 'INV-2026-000001',
            total: new Decimal(100),
            payments: [],
            customer: null,
        })
        mockPrisma.payment.create.mockResolvedValueOnce({
            id: 'pay-1',
            sale_id: 'sale-1',
            amount: new Decimal(50),
            method: 'CASH',
        })

        const res = await post(app, '/api/sales/payment/create', {
            saleId: 'sale-1',
            amount: 50,
            method: 'CASH',
        })
        expect(res.status).toBe(200)

        // payment.create MUST have been called
        expect(mockPrisma.payment.create.mock.calls.length).toBe(1)

        // sale.update must NOT have been called — this was the critical bug we fixed
        // (previously the controller was overwriting discount_amount on every payment collect)
        expect(mockPrisma.sale.update.mock.calls.length).toBe(0)
    })

    it('passes correct args to payment.create', async () => {
        mockPrisma.$queryRaw.mockResolvedValueOnce([{ id: 'sale-abc' }])
        mockPrisma.sale.findUnique.mockResolvedValueOnce({
            id: 'sale-abc',
            invoice_number: 'INV-2026-000001',
            total: new Decimal(200),
            payments: [],
            customer: null,
        })
        mockPrisma.payment.create.mockResolvedValueOnce({ id: 'pay-2' })

        await post(app, '/api/sales/payment/create', {
            saleId: 'sale-abc',
            amount: 75,
            method: 'BKASH',
            reference: 'TXN123',
        })

        const [call] = mockPrisma.payment.create.mock.calls as any[]
        expect(call[0].data.sale_id).toBe('sale-abc')
        expect(call[0].data.method).toBe('BKASH')
        expect(call[0].data.reference).toBe('TXN123')
    })
})

// ── getChartData ──────────────────────────────────────────────────────────────

describe('GET /api/sales/get/chart', () => {
    it('returns 200 with data and total', async () => {
        mockPrisma.$queryRaw.mockResolvedValueOnce([
            { status: 'PAID', count: BigInt(10) },
            { status: 'DUE', count: BigInt(5) },
            { status: 'PARTIAL', count: BigInt(3) },
        ])

        const res = await get(app, '/api/sales/get/chart', DATE_RANGE)
        expect(res.status).toBe(200)

        const body = await json<ApiResponse<{ data: unknown[]; total: number }>>(res)
        expect(body.success).toBe(true)
        expect(typeof body.data.total).toBe('number')
        expect(body.data.total).toBe(18)
        expect(Array.isArray(body.data.data)).toBe(true)
    })

    it('chart items have name, value, and fill', async () => {
        mockPrisma.$queryRaw.mockResolvedValueOnce([
            { status: 'PAID', count: BigInt(7) },
        ])

        const res = await get(app, '/api/sales/get/chart', DATE_RANGE)
        const body = await json<ApiResponse<{ data: { name: string; value: number; fill: string }[] }>>(res)

        const item = body.data.data[0]
        expect(item).toBeTruthy()
        expect(typeof item!.name).toBe('string')
        expect(typeof item!.value).toBe('number')
        expect(item!.fill).toMatch(/^#/)
    })

    it('returns empty data when no sales', async () => {
        mockPrisma.$queryRaw.mockResolvedValueOnce([])

        const res = await get(app, '/api/sales/get/chart', DATE_RANGE)
        const body = await json<ApiResponse<{ data: unknown[]; total: number }>>(res)

        expect(body.data.total).toBe(0)
        expect(body.data.data).toHaveLength(0)
    })
})

// ── getStats ──────────────────────────────────────────────────────────────────

describe('GET /api/sales/get/stats', () => {
    it('returns 422 when from/to are missing', async () => {
        const res = await get(app, '/api/sales/get/stats')
        expect(res.status).toBe(422)
    })

    it('returns 200 with SaleMetrics shape', async () => {
        // aggregate mock returns { _sum: null, _count: 0 } by default
        const res = await get(app, '/api/sales/get/stats', DATE_RANGE)
        expect(res.status).toBe(200)

        const body = await json<ApiResponse<{
            totalRevenue: { value: number }
            totalSales: { value: number }
            uncollectedRevenue: { value: number }
            voidedSales: { value: number }
        }>>(res)

        expect(body.success).toBe(true)
        expect(typeof body.data.totalRevenue.value).toBe('number')
        expect(typeof body.data.totalSales.value).toBe('number')
        expect(typeof body.data.uncollectedRevenue.value).toBe('number')
        expect(typeof body.data.voidedSales.value).toBe('number')
    })
})

// ── getSales ──────────────────────────────────────────────────────────────────

describe('GET /api/sales/get/all', () => {
    it('returns 422 when from/to are missing', async () => {
        const res = await get(app, '/api/sales/get/all')
        expect(res.status).toBe(422)
    })

    it('returns 422 for invalid status filter', async () => {
        const res = await get(app, '/api/sales/get/all', { ...DATE_RANGE, status: 'BOGUS' })
        expect(res.status).toBe(422)
    })

    it('returns 422 when from > to', async () => {
        const res = await get(app, '/api/sales/get/all', {
            from: '2026-12-31',
            to: '2026-01-01',
        })
        expect(res.status).toBe(422)
    })

    it('returns 200 with paginated sales', async () => {
        mockPrisma.$queryRaw.mockResolvedValueOnce([])

        const res = await get(app, '/api/sales/get/all', DATE_RANGE)
        expect(res.status).toBe(200)

        const body = await json<ApiResponse<{ data: unknown[]; pagination: unknown }>>(res)
        expect(body.success).toBe(true)
        expect(Array.isArray(body.data.data)).toBe(true)
        expect(body.data.pagination).toBeTruthy()
    })

    it('accepts all valid status filters', async () => {
        for (const status of ['ALL', 'PAID', 'DUE', 'PARTIAL', 'UNPAID']) {
            mockPrisma.$queryRaw.mockResolvedValueOnce([])
            const res = await get(app, '/api/sales/get/all', { ...DATE_RANGE, status })
            expect(res.status).toBe(200)
        }
    })
})
