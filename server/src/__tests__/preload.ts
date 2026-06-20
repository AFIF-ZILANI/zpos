import { mock } from 'bun:test'

// Set all required env vars before any module can read them
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/pos_test'
process.env.CLERK_SECRET_KEY = 'sk_test_dummy_key_for_testing_only'
process.env.RESEND_API_KEY = 're_dummy_key_for_testing'
process.env.NODE_ENV = 'test'

const makeModel = () => ({
    findMany: mock(() => Promise.resolve([])),
    findUnique: mock(() => Promise.resolve(null)),
    findFirst: mock(() => Promise.resolve(null)),
    create: mock(() => Promise.resolve({ id: 'test-id' })),
    createMany: mock(() => Promise.resolve({ count: 1 })),
    update: mock(() => Promise.resolve({ id: 'test-id' })),
    updateMany: mock(() => Promise.resolve({ count: 1 })),
    delete: mock(() => Promise.resolve({ id: 'test-id' })),
    deleteMany: mock(() => Promise.resolve({ count: 1 })),
    count: mock(() => Promise.resolve(0)),
    aggregate: mock(() => Promise.resolve({ _sum: { total: null, amount: null }, _count: { id: 0 } })),
    upsert: mock(() => Promise.resolve({ id: 'test-id' })),
    groupBy: mock(() => Promise.resolve([])),
})

export const mockPrisma = {
    product: makeModel(),
    productVariant: makeModel(),
    category: makeModel(),
    customer: makeModel(),
    sale: makeModel(),
    saleItem: makeModel(),
    payment: makeModel(),
    purchase: makeModel(),
    purchaseItem: makeModel(),
    stockLedger: makeModel(),
    barcode: makeModel(),
    variantBarcodeAllocation: makeModel(),
    counter: makeModel(),
    stockAdjustment: makeModel(),
    user: makeModel(),
    $queryRaw: mock(() => Promise.resolve([])),
    $executeRaw: mock(() => Promise.resolve(0)),
    $transaction: mock((fn: any) =>
        typeof fn === 'function' ? Promise.resolve(fn(mockPrisma)) : Promise.resolve([])
    ),
}

// Replace the real prisma singleton with our mock
mock.module('@/lib/prisma', () => ({ default: mockPrisma }))

// Reset call history on all mock functions between tests
export function resetAllMocks() {
    const resetModel = (m: ReturnType<typeof makeModel>) => {
        Object.values(m).forEach((fn) => {
            if (typeof fn === 'function' && 'mockReset' in fn) fn.mockReset()
        })
    }
    const models = [
        'product', 'productVariant', 'category', 'customer', 'sale', 'saleItem',
        'payment', 'purchase', 'purchaseItem', 'stockLedger', 'barcode',
        'variantBarcodeAllocation', 'counter', 'stockAdjustment', 'user',
    ] as const
    for (const key of models) {
        resetModel(mockPrisma[key] as any)
    }
    if ('mockReset' in mockPrisma.$queryRaw) (mockPrisma.$queryRaw as any).mockReset()
    if ('mockReset' in mockPrisma.$executeRaw) (mockPrisma.$executeRaw as any).mockReset()
    if ('mockReset' in mockPrisma.$transaction) (mockPrisma.$transaction as any).mockReset()

    // Restore default implementations after reset
    mockPrisma.$queryRaw.mockImplementation(() => Promise.resolve([]))
    mockPrisma.$executeRaw.mockImplementation(() => Promise.resolve(0))
    mockPrisma.$transaction.mockImplementation((fn: any) =>
        typeof fn === 'function' ? Promise.resolve(fn(mockPrisma)) : Promise.resolve([])
    )
    for (const key of models) {
        const m = mockPrisma[key] as any
        if (m.findMany) m.findMany.mockImplementation(() => Promise.resolve([]))
        if (m.findUnique) m.findUnique.mockImplementation(() => Promise.resolve(null))
        if (m.findFirst) m.findFirst.mockImplementation(() => Promise.resolve(null))
        if (m.create) m.create.mockImplementation(() => Promise.resolve({ id: 'test-id' }))
        if (m.createMany) m.createMany.mockImplementation(() => Promise.resolve({ count: 1 }))
        if (m.update) m.update.mockImplementation(() => Promise.resolve({ id: 'test-id' }))
        if (m.updateMany) m.updateMany.mockImplementation(() => Promise.resolve({ count: 1 }))
        if (m.delete) m.delete.mockImplementation(() => Promise.resolve({ id: 'test-id' }))
        if (m.count) m.count.mockImplementation(() => Promise.resolve(0))
        if (m.aggregate) m.aggregate.mockImplementation(() => Promise.resolve({ _sum: { total: null, amount: null }, _count: { id: 0 } }))
        if (m.groupBy) m.groupBy.mockImplementation(() => Promise.resolve([]))
        if (m.upsert) m.upsert.mockImplementation(() => Promise.resolve({ id: 'test-id' }))
    }
}
