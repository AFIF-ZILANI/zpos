import { describe, it, expect, beforeEach } from 'bun:test'
import { mockPrisma, resetAllMocks } from '../preload'
import { createTestApp, post, del, json } from '../setup'
import { generateEAN13 } from '@/lib/barcode'

type ApiResponse<T> = { success: boolean; message: string; data: T }

const app = createTestApp()

const VARIANT_ID = '550e8400-e29b-41d4-a716-446655440001'
const PURCHASE_ID = '550e8400-e29b-41d4-a716-446655440002'

const VALID_PURCHASE_BODY = {
    date: '2026-01-01',
    supplier: 'Acme Supplies',
    phone: '01700000001',
    products: [
        { variantId: VARIANT_ID, unitCost: 10, quantity: 2, sellingPrice: 20 },
    ],
}

beforeEach(() => {
    resetAllMocks()
})

describe('POST /api/purchase/create', () => {
    it('returns 422 when required fields are missing', async () => {
        const res = await post(app, '/api/purchase/create', {})
        expect(res.status).toBe(422)
    })

    it('creates a purchase, reserves an atomic barcode serial, and returns barcode data', async () => {
        mockPrisma.productVariant.findMany
            // 1. variant-id existence check
            .mockResolvedValueOnce([{ id: VARIANT_ID }])
            // 2. product-name lookup for the response
            .mockResolvedValueOnce([
                { id: VARIANT_ID, name: 'Red', product: { name: 'T-Shirt' } },
            ])
        mockPrisma.supplier.upsert.mockResolvedValueOnce({ id: 'sup-1' })
        mockPrisma.purchase.create.mockResolvedValueOnce({ id: PURCHASE_ID })
        mockPrisma.purchaseItem.findMany.mockResolvedValueOnce([
            { id: 'pi-1', variant_id: VARIANT_ID, quantity: 2 },
        ])
        mockPrisma.$queryRaw
            // 6. FOR UPDATE lock, which also carries current stock
            .mockResolvedValueOnce([{ id: VARIANT_ID, stock_on_hand: 0 }])
            // 8. barcode serial reservation
            .mockResolvedValueOnce([{ serial: 1001 }])

        const expectedCode = generateEAN13(1001)
        mockPrisma.barcode.findMany.mockResolvedValueOnce([
            { id: 'bc-1', code: expectedCode },
        ])

        const res = await post(app, '/api/purchase/create', VALID_PURCHASE_BODY)
        expect(res.status).toBe(200)

        const body = await json<ApiResponse<{ barcodeData: Array<{ barcode: string; productName: string }> }>>(res)
        expect(body.data.barcodeData).toHaveLength(1)
        expect(body.data.barcodeData[0]?.barcode).toBe(expectedCode)
        expect(body.data.barcodeData[0]?.productName).toBe('T-Shirt - Red')

        // The serial must come from the reserved sequence, not a manual increment
        expect(mockPrisma.barcode.createMany.mock.calls[0]?.[0].data[0].serial).toBe(1001)

        // Ledger and the denormalized stock column must move together
        const ledgerRow = mockPrisma.stockLedger.createMany.mock.calls[0]?.[0].data[0]
        expect(ledgerRow.balance_after).toBe(2) // 0 on hand + 2 purchased
        expect(mockPrisma.productVariant.update.mock.calls[0]?.[0]).toEqual({
            where: { id: VARIANT_ID },
            data: { stock_on_hand: { increment: 2 } },
        })
    })

    it('fails the whole transaction when a variant id does not exist', async () => {
        mockPrisma.productVariant.findMany.mockResolvedValueOnce([]) // none found

        const res = await post(app, '/api/purchase/create', VALID_PURCHASE_BODY)
        expect(res.status).toBe(500) // uncaught Error, not AppError — matches current onError behavior

        // Nothing downstream should have been reached
        expect(mockPrisma.purchase.create.mock.calls.length).toBe(0)
    })
})

describe('DELETE /api/purchase/delete', () => {
    it('returns 422 when id is missing', async () => {
        const res = await del(app, '/api/purchase/delete', {})
        expect([400, 422]).toContain(res.status)
    })

    it('returns 404 when purchase does not exist', async () => {
        mockPrisma.purchase.findUnique.mockResolvedValueOnce(null)

        const res = await del(app, '/api/purchase/delete', { id: PURCHASE_ID })
        expect(res.status).toBe(404)
    })

    it('blocks deletion when a variant from this purchase has already been sold', async () => {
        mockPrisma.purchase.findUnique.mockResolvedValueOnce({
            id: PURCHASE_ID,
            items: [{ variant_id: VARIANT_ID }],
        })
        mockPrisma.saleItem.count.mockResolvedValueOnce(1) // has been sold

        const res = await del(app, '/api/purchase/delete', { id: PURCHASE_ID })
        expect(res.status).toBe(409)

        // Must never touch stock_ledgers/barcodes once a sale exists
        expect(mockPrisma.stockLedger.deleteMany.mock.calls.length).toBe(0)
    })

    it('deletes a purchase with no sale history', async () => {
        mockPrisma.purchase.findUnique.mockResolvedValueOnce({
            id: PURCHASE_ID,
            items: [{ variant_id: VARIANT_ID }],
        })
        mockPrisma.saleItem.count.mockResolvedValueOnce(0)
        mockPrisma.variantBarcodeAllocation.findMany.mockResolvedValueOnce([])
        mockPrisma.stockLedger.findMany.mockResolvedValueOnce([]) // nothing left to recompute

        const res = await del(app, '/api/purchase/delete', { id: PURCHASE_ID })
        expect(res.status).toBe(200)

        expect(mockPrisma.purchase.delete.mock.calls.length).toBe(1)
    })
})
