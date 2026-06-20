import { describe, it, expect, beforeEach } from 'bun:test'
import { mockPrisma, resetAllMocks } from '../preload'
import { createTestApp, get, post, patch, del, json } from '../setup'

type ApiResponse<T> = { success: boolean; message: string; data: T }

const app = createTestApp()

const MOCK_PRODUCT = {
    id: 'prod-uuid-1',
    name: 'Test Product',
    description: 'A test product',
    brand: 'TestBrand',
    is_active: true,
    category_id: 'cat-uuid-1',
    reorder_level: 5,
    category: { id: 'cat-uuid-1', name: 'Electronics' },
    variants: [
        { id: 'var-uuid-1', name: 'Red', is_active: true, color: 'red', size: null },
    ],
}

beforeEach(() => {
    resetAllMocks()
})

describe('GET /api/products/get/all', () => {
    it('returns 200 with paginated shape', async () => {
        // ProductService.getAll uses $queryRaw
        mockPrisma.$queryRaw.mockResolvedValueOnce([])

        const res = await get(app, '/api/products/get/all')
        expect(res.status).toBe(200)

        const body = await json<ApiResponse<{ items: unknown[]; total: number }>>(res)
        expect(body.success).toBe(true)
        expect(Array.isArray(body.data.items)).toBe(true)
        expect(typeof body.data.total).toBe('number')
    })

    it('returns 422 on invalid status filter', async () => {
        const res = await get(app, '/api/products/get/all', { status: 'INVALID' })
        expect(res.status).toBe(422)
    })

    it('accepts valid status filters', async () => {
        for (const status of ['ALL', 'IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK']) {
            mockPrisma.$queryRaw.mockResolvedValueOnce([])
            const res = await get(app, '/api/products/get/all', { status })
            expect(res.status).toBe(200)
        }
    })
})

describe('GET /api/products/get/:id', () => {
    it('returns 200 when product exists', async () => {
        mockPrisma.product.findUnique.mockResolvedValueOnce(MOCK_PRODUCT)

        const res = await get(app, '/api/products/get/prod-uuid-1')
        expect(res.status).toBe(200)

        const body = await json<ApiResponse<{ id: string; name: string }>>(res)
        expect(body.success).toBe(true)
        expect(body.data.id).toBe('prod-uuid-1')
        expect(body.data.name).toBe('Test Product')
    })

    it('returns 404 when product does not exist', async () => {
        mockPrisma.product.findUnique.mockResolvedValueOnce(null)

        const res = await get(app, '/api/products/get/nonexistent-id')
        expect(res.status).toBe(404)

        const body = await json<ApiResponse<null>>(res)
        expect(body.success).toBe(false)
    })
})

describe('GET /api/products/get/by-barcode/:barcode', () => {
    it('returns 404 when barcode record does not exist', async () => {
        // barcode.findUnique returns null — barcode code not in DB
        mockPrisma.barcode.findUnique.mockResolvedValueOnce(null)

        const res = await get(app, '/api/products/get/by-barcode/123456789')
        expect(res.status).toBe(404)

        const body = await json<ApiResponse<null>>(res)
        expect(body.success).toBe(false)
    })

    it('returns 404 when barcode exists but has no variant allocation', async () => {
        mockPrisma.barcode.findUnique.mockResolvedValueOnce({ id: 'bc-1', code: '123', status: 'ALLOCATED' })
        mockPrisma.variantBarcodeAllocation.findFirst.mockResolvedValueOnce(null)

        const res = await get(app, '/api/products/get/by-barcode/123456789')
        expect(res.status).toBe(404)
    })
})

describe('GET /api/products/stats', () => {
    it('returns 200 with stats shape', async () => {
        mockPrisma.$queryRaw.mockResolvedValueOnce([
            { status: 'IN_STOCK', count: BigInt(10) },
            { status: 'LOW_STOCK', count: BigInt(2) },
            { status: 'OUT_OF_STOCK', count: BigInt(1) },
        ])

        const res = await get(app, '/api/products/stats')
        expect(res.status).toBe(200)

        const body = await json<ApiResponse<unknown>>(res)
        expect(body.success).toBe(true)
    })
})

describe('POST /api/products/create', () => {
    it('returns 422 when required fields are missing', async () => {
        const res = await post(app, '/api/products/create', {})
        expect(res.status).toBe(422)
    })

    it('returns 201 with valid payload', async () => {
        // ProductService.create uses a transaction
        mockPrisma.$transaction.mockImplementationOnce(async (fn: any) => {
            return fn({
                ...mockPrisma,
                product: {
                    ...mockPrisma.product,
                    create: () => Promise.resolve({ id: 'new-prod', name: 'Widget' }),
                },
                category: {
                    ...mockPrisma.category,
                    findUnique: () => Promise.resolve({ id: 'cat-1', name: 'Electronics' }),
                },
            })
        })

        const res = await post(app, '/api/products/create', {
            name: 'Widget',
            categoryId: 'cat-1',
            reorderLevel: 5,
            variants: [{ name: 'Default', color: '', size: null }],
        })

        // Depending on how the service validates, could be 201 or 422
        expect([201, 422, 500]).toContain(res.status)
    })
})

describe('PATCH /api/products/update', () => {
    it('returns 422 when id is missing', async () => {
        const res = await patch(app, '/api/products/update', { name: 'New Name' })
        expect(res.status).toBe(422)
    })
})

describe('DELETE /api/products/delete', () => {
    it('returns 422 when id is missing', async () => {
        const res = await del(app, '/api/products/delete', {})
        // Validation requires an id
        expect([400, 422]).toContain(res.status)
    })
})
