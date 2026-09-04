import { describe, it, expect, beforeEach } from 'bun:test'
import { mockPrisma, resetAllMocks } from '../preload'
import { createTestApp, post, patch, del, json } from '../setup'

type ApiResponse<T> = { success: boolean; message: string; data: T }

const app = createTestApp()

const CATEGORY_ID = '550e8400-e29b-41d4-a716-446655440010'
const PARENT_ID = '550e8400-e29b-41d4-a716-446655440011'

beforeEach(() => {
    resetAllMocks()
})

describe('POST /api/categories/create', () => {
    it('returns 422 when name is missing', async () => {
        const res = await post(app, '/api/categories/create', {})
        expect(res.status).toBe(422)
    })

    it('returns 400 when a category with the same name already exists', async () => {
        mockPrisma.category.findFirst.mockResolvedValueOnce({ id: 'existing', name: 'Snacks' })

        const res = await post(app, '/api/categories/create', { name: 'Snacks' })
        expect(res.status).toBe(400)
    })

    it('returns 400 when parent_id does not resolve to a real category', async () => {
        mockPrisma.category.findFirst.mockResolvedValueOnce(null)
        mockPrisma.category.findUnique.mockResolvedValueOnce(null)

        const res = await post(app, '/api/categories/create', {
            name: 'Sub Snacks',
            parent_id: PARENT_ID,
        })
        expect(res.status).toBe(400)
    })

    it('creates a category and derives its slug from the name', async () => {
        mockPrisma.category.findFirst.mockResolvedValueOnce(null)

        const res = await post(app, '/api/categories/create', { name: 'Cold Drinks' })
        expect(res.status).toBe(201)

        expect(mockPrisma.category.create.mock.calls[0]?.[0].data.slug).toBe('cold-drinks')
    })

    it('does not crash when parent_id is a non-string value', async () => {
        // Regression: the old hand-rolled check did `parent_id.trim()` on any
        // truthy non-string, which threw a TypeError and returned a 500.
        const res = await post(app, '/api/categories/create', {
            name: 'Bad Parent',
            parent_id: 12345,
        })
        expect(res.status).toBe(422) // clean validation error, not a 500 crash
    })
})

describe('PATCH /api/categories/update', () => {
    it('returns 404 when category does not exist', async () => {
        mockPrisma.category.findUnique.mockResolvedValueOnce(null)

        const res = await patch(app, '/api/categories/update', {
            id: CATEGORY_ID,
            name: 'Renamed',
        })
        expect(res.status).toBe(404)
    })

    it('updates an existing category', async () => {
        mockPrisma.category.findUnique.mockResolvedValueOnce({ id: CATEGORY_ID, name: 'Old Name' })

        const res = await patch(app, '/api/categories/update', {
            id: CATEGORY_ID,
            name: 'New Name',
        })
        expect(res.status).toBe(200)
        expect(mockPrisma.category.update.mock.calls.length).toBe(1)
    })
})

describe('DELETE /api/categories/delete', () => {
    it('returns 404 when category does not exist', async () => {
        mockPrisma.category.findUnique.mockResolvedValueOnce(null)

        const res = await del(app, '/api/categories/delete', { id: CATEGORY_ID })
        expect(res.status).toBe(404)
    })

    it('returns 400 (not a generic 500) when the category has products linked', async () => {
        mockPrisma.category.findUnique.mockResolvedValueOnce({ id: CATEGORY_ID, children: [] })
        mockPrisma.product.findMany.mockResolvedValueOnce([{ id: 'prod-1' }])

        const res = await del(app, '/api/categories/delete', { id: CATEGORY_ID })
        expect(res.status).toBe(400)

        const body = await json<ApiResponse<unknown>>(res)
        expect(body.message).toBe('Category has products linked')
    })

    it('deletes the category and its children when no products are linked', async () => {
        mockPrisma.category.findUnique.mockResolvedValueOnce({
            id: CATEGORY_ID,
            children: [{ id: 'child-1' }],
        })
        mockPrisma.product.findMany.mockResolvedValueOnce([])

        const res = await del(app, '/api/categories/delete', { id: CATEGORY_ID })
        expect(res.status).toBe(200)

        expect(mockPrisma.category.deleteMany.mock.calls.length).toBe(1)
        expect(mockPrisma.category.delete.mock.calls.length).toBe(1)
    })
})
