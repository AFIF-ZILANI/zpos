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

    // ── Regression: the chart used to render eight bars, every one of them
    // labelled with the wrong weekday (Saturday's bar read "FRI") and one
    // label blank, because the loop ran 0..7 inclusive and subtracted a day
    // when mapping getDay() to a name.
    it('returns exactly seven days labelled SAT through FRI', async () => {
        mockPrisma.$queryRaw.mockResolvedValueOnce([])

        const res = await get(app, '/api/dashboard/get/weekly-sales-graph')
        const body = await json<ApiResponse<Array<{ day: string }>>>(res)

        expect(body.data).toHaveLength(7)
        expect(body.data.map((d) => d.day)).toEqual([
            'SAT', 'SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI',
        ])
        expect(body.data.every((d) => d.day.length > 0)).toBe(true)
    })

    // ── Regression: the day key was built with toISOString(), which converts a
    // local midnight to the previous UTC date. No generated key ever matched a
    // row, so real revenue silently rendered as zero on every bar.
    it('puts a day\'s revenue on that same day', async () => {
        // Pick a concrete day inside the current SAT-FRI week.
        const now = new Date()
        const daysSinceSat = now.getDay() === 6 ? 0 : now.getDay() + 1
        const weekStart = new Date(now)
        weekStart.setDate(now.getDate() - daysSinceSat)
        weekStart.setHours(0, 0, 0, 0)

        const target = new Date(weekStart)
        target.setDate(weekStart.getDate() + 3) // Tuesday

        // Postgres returns DATE as UTC midnight of that calendar day.
        const saleDate = new Date(Date.UTC(
            target.getFullYear(), target.getMonth(), target.getDate()
        ))

        // Mirror the production types: the pg adapter returns a Decimal for a
        // numeric SUM and a bigint for COUNT.
        mockPrisma.$queryRaw.mockResolvedValueOnce([
            { sale_date: saleDate, revenue: { toNumber: () => 1500 }, orders: BigInt(3) },
        ])

        const res = await get(app, '/api/dashboard/get/weekly-sales-graph')
        const body = await json<ApiResponse<Array<{ day: string; sales: number; orders: number }>>>(res)

        // Independent oracle for the weekday name — does not reuse the
        // controller's own lookup table.
        const expectedDay = target
            .toLocaleDateString('en-US', { weekday: 'short' })
            .toUpperCase()

        const bucket = body.data.find((d) => d.day === expectedDay)
        expect(bucket).toBeDefined()
        expect(bucket!.sales).toBe(1500)
        expect(bucket!.orders).toBe(3)

        // and nothing leaked onto the other days
        const total = body.data.reduce((s, d) => s + d.sales, 0)
        expect(total).toBe(1500)
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
