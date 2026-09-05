import { mock } from 'bun:test'

// Set all required env vars before any module can read them
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/pos_test'
process.env.CLERK_SECRET_KEY = 'sk_test_dummy_key_for_testing_only'
process.env.RESEND_API_KEY = 're_dummy_key_for_testing'
process.env.CLIENT_URL = 'http://localhost:5173'
process.env.EMAIL_DOMAIN = 'test.local'
process.env.NODE_ENV = 'test'

const makeModel = () => ({
    findMany: mock((..._args: any[]) => Promise.resolve<any[]>([])),
    findUnique: mock((..._args: any[]) => Promise.resolve<any>(null)),
    findFirst: mock((..._args: any[]) => Promise.resolve<any>(null)),
    create: mock((..._args: any[]) => Promise.resolve<any>({ id: 'test-id' })),
    createMany: mock((..._args: any[]) => Promise.resolve<any>({ count: 1 })),
    update: mock((..._args: any[]) => Promise.resolve<any>({ id: 'test-id' })),
    updateMany: mock((..._args: any[]) => Promise.resolve<any>({ count: 1 })),
    delete: mock((..._args: any[]) => Promise.resolve<any>({ id: 'test-id' })),
    deleteMany: mock((..._args: any[]) => Promise.resolve<any>({ count: 1 })),
    count: mock((..._args: any[]) => Promise.resolve<any>(0)),
    aggregate: mock((..._args: any[]) => Promise.resolve<any>({ _sum: { total: null, amount: null }, _count: { id: 0 } })),
    upsert: mock((..._args: any[]) => Promise.resolve<any>({ id: 'test-id' })),
    groupBy: mock((..._args: any[]) => Promise.resolve<any[]>([])),
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
    supplier: makeModel(),
    user: makeModel(),
    $queryRaw: mock((..._args: any[]) => Promise.resolve<any[]>([])),
    $executeRaw: mock((..._args: any[]) => Promise.resolve<any>(0)),
    $transaction: mock((fn: any) =>
        typeof fn === 'function' ? Promise.resolve(fn(mockPrisma)) : Promise.resolve([])
    ),
}

// Replace the real prisma singleton with our mock
mock.module('@/lib/prisma', () => ({ default: mockPrisma }))

// Replace the real Resend client so invite tests never hit the network
export const mockResend = {
    emails: {
        send: mock((..._args: any[]) => Promise.resolve<any>({ data: { id: 'test-email-id' }, error: null })),
    },
}
mock.module('@/lib/resend', () => ({ resend: mockResend }))

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
        'variantBarcodeAllocation', 'counter', 'stockAdjustment', 'supplier', 'user',
    ] as const
    for (const key of models) {
        resetModel(mockPrisma[key] as any)
    }
    if ('mockReset' in mockPrisma.$queryRaw) (mockPrisma.$queryRaw as any).mockReset()
    if ('mockReset' in mockPrisma.$executeRaw) (mockPrisma.$executeRaw as any).mockReset()
    if ('mockReset' in mockPrisma.$transaction) (mockPrisma.$transaction as any).mockReset()
    mockResend.emails.send.mockReset()
    mockResend.emails.send.mockImplementation(() =>
        Promise.resolve({ data: { id: 'test-email-id' }, error: null })
    )

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
