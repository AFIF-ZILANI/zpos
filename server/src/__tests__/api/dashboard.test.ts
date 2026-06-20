import { describe, it, expect, beforeEach } from 'bun:test'
import { mockPrisma, resetAllMocks } from '../preload'
import { createTestApp, get, json } from '../setup'

type ApiResponse<T> = { success: boolean; message: string; data: T }

const app = createTestApp()

beforeEach(() => {
    resetAllMocks()
    // All dashboard endpoints use $queryRaw — default mock returns []
})

describe('GET /api/dashboard/get/stats', () => {
    it('returns 200 with dashboard stats shape', async () => {
        // DashboardController.getDashboardStats uses $queryRaw for today's stats
        mockPrisma.$queryRaw.mockResolvedValue([])

        const res = await get(app, '/api/dashboard/get/stats')
        expect(res.status).toBe(200)

        const body = await json<ApiResponse<unknown>>(res)
        expect(body.success).toBe(true)
    })
})

describe('GET /api/dashboard/get/stat-trend', () => {
    it('returns 200', async () => {
        mockPrisma.$queryRaw.mockResolvedValue([])

        const res = await get(app, '/api/dashboard/get/stat-trend')
        expect(res.status).toBe(200)
    })
})

describe('GET /api/dashboard/get/weekly-sales-graph', () => {
    it('returns 200 with an array', async () => {
        // Controller reads row.sale_date to build week-day buckets
        mockPrisma.$queryRaw.mockResolvedValueOnce([
            { sale_date: new Date('2026-06-14'), revenue: '1500.00', sales: BigInt(3) },
            { sale_date: new Date('2026-06-15'), revenue: '800.00', sales: BigInt(2) },
        ])

        const res = await get(app, '/api/dashboard/get/weekly-sales-graph')
        expect(res.status).toBe(200)

        const body = await json<ApiResponse<unknown[]>>(res)
        expect(body.success).toBe(true)
        expect(Array.isArray(body.data)).toBe(true)
    })

    it('returns empty array when no sales', async () => {
        mockPrisma.$queryRaw.mockResolvedValueOnce([])

        const res = await get(app, '/api/dashboard/get/weekly-sales-graph')
        expect(res.status).toBe(200)

        const body = await json<ApiResponse<unknown[]>>(res)
        expect(Array.isArray(body.data)).toBe(true)
    })
})

describe('GET /api/dashboard/get/category-graph', () => {
    it('returns 200', async () => {
        mockPrisma.$queryRaw.mockResolvedValueOnce([])

        const res = await get(app, '/api/dashboard/get/category-graph')
        expect(res.status).toBe(200)
    })
})

describe('GET /api/dashboard/get/top-products', () => {
    it('returns 200', async () => {
        mockPrisma.$queryRaw.mockResolvedValueOnce([])

        const res = await get(app, '/api/dashboard/get/top-products')
        expect(res.status).toBe(200)
    })
})

describe('GET /api/dashboard/get/sales-history', () => {
    it('returns 200', async () => {
        mockPrisma.$queryRaw.mockResolvedValueOnce([])

        const res = await get(app, '/api/dashboard/get/sales-history')
        expect(res.status).toBe(200)
    })
})

describe('dashboard error handling', () => {
    it('surfaces 500 when DB query throws', async () => {
        // Use mockImplementationOnce (not mockRejectedValueOnce) to avoid
        // Bun reporting the Error as an unhandled rejection before it is consumed
        mockPrisma.$queryRaw.mockImplementationOnce(() => {
            return Promise.reject(new Error('DB connection lost'))
        })

        const res = await get(app, '/api/dashboard/get/stats')
        expect(res.status).toBe(500)

        const body = await json<ApiResponse<null>>(res)
        expect(body.success).toBe(false)
    })
})
