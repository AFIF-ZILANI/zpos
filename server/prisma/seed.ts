import { Role, SaleStatus, PaymentMethod, StockMovementType, StockDirection, BarcodeStatus } from "../generated/prisma";
import prisma from "../src/lib/prisma";
import * as bcrypt from "bcryptjs";
import { Decimal } from "../generated/prisma/runtime/client";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rnd(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// function pick<T>(arr: T[]): T {
//     return arr[Math.floor(Math.random() * arr.length)];
// }

function dec(n: number) {
    return new Decimal(n);
}

function daysAgo(n: number): Date {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    console.log("🌱 Seeding database...");

    // ── Counter ──────────────────────────────────────────────────────────────────
    await prisma.counter.upsert({
        where: { key: "invoice" },
        update: {},
        create: { key: "invoice", value: 1000 },
    });

    // ── Users ─────────────────────────────────────────────────────────────────────
    const passwordHash = await bcrypt.hash("password123", 10);

    const owner = await prisma.user.upsert({
        where: { email: "owner@posapp.com" },
        update: {},
        create: {
            name: "Rafiq Ahmed",
            email: "owner@posapp.com",
            password_hash: passwordHash,
            phone: "01711000001",
            role: Role.OWNER,
        },
    });

    const staff1 = await prisma.user.upsert({
        where: { email: "staff1@posapp.com" },
        update: {},
        create: {
            name: "Nusrat Jahan",
            email: "staff1@posapp.com",
            password_hash: passwordHash,
            phone: "01711000002",
            role: Role.STAFF,
        },
    });

    const staff2 = await prisma.user.upsert({
        where: { email: "staff2@posapp.com" },
        update: {},
        create: {
            name: "Karim Molla",
            email: "staff2@posapp.com",
            password_hash: passwordHash,
            phone: "01711000003",
            role: Role.STAFF,
        },
    });

    const users = [owner, staff1, staff2];
    console.log("✅ Users created");

    // ── Customers ─────────────────────────────────────────────────────────────────
    const customerData = [
        { name: "Arif Hossain", phone: "01811100001", email: "arif@gmail.com", address: "Rajshahi Sadar" },
        { name: "Salma Begum", phone: "01811100002", email: null, address: "Bogra" },
        { name: "Tanvir Islam", phone: "01811100003", email: "tanvir@mail.com", address: "Chapai Nawabganj" },
        { name: "Rupa Khatun", phone: "01811100004", email: null, address: "Naogaon" },
        { name: "Mahbub Alam", phone: "01811100005", email: "mahbub@example.com", address: "Natore" },
        { name: "Lipi Akter", phone: "01811100006", email: null, address: "Sirajganj" },
        { name: "Jamal Uddin", phone: "01811100007", email: null, address: "Pabna" },
        { name: "Fatema Khanam", phone: "01811100008", email: "fatema@gmail.com", address: "Rajshahi City" },
    ];

    const customers = await Promise.all(
        customerData.map((c) =>
            prisma.customer.upsert({
                where: { phone: c.phone },
                update: {},
                create: { ...c, credit_balance: dec(rnd(0, 500)) },
            })
        )
    );
    console.log("✅ Customers created");

    // ── Categories ────────────────────────────────────────────────────────────────
    const electronics = await prisma.category.upsert({
        where: { slug: "electronics" },
        update: {},
        create: { name: "Electronics", slug: "electronics", description: "Electronic gadgets and accessories" },
    });

    const clothing = await prisma.category.upsert({
        where: { slug: "clothing" },
        update: {},
        create: { name: "Clothing", slug: "clothing", description: "Apparel and fashion" },
    });

    const groceries = await prisma.category.upsert({
        where: { slug: "groceries" },
        update: {},
        create: { name: "Groceries", slug: "groceries", description: "Daily essentials" },
    });

    const phones = await prisma.category.upsert({
        where: { slug: "phones" },
        update: {},
        create: {
            name: "Phones",
            slug: "phones",
            description: "Smartphones and accessories",
            parent_id: electronics.id,
        },
    });

    const accessories = await prisma.category.upsert({
        where: { slug: "accessories" },
        update: {},
        create: {
            name: "Accessories",
            slug: "accessories",
            description: "Phone and electronics accessories",
            parent_id: electronics.id,
        },
    });
    console.log("✅ Categories created");

    // ── Suppliers ─────────────────────────────────────────────────────────────────
    const supplier1 = await prisma.supplier.upsert({
        where: { phone: "01900000001" },
        update: {},
        create: { name: "Dhaka Electronics Wholesale", phone: "01900000001", email: "dew@supplier.com" },
    });

    const supplier2 = await prisma.supplier.upsert({
        where: { phone: "01900000002" },
        update: {},
        create: { name: "Fashion Hub BD", phone: "01900000002", email: "fashionhub@supplier.com" },
    });

    const supplier3 = await prisma.supplier.upsert({
        where: { phone: "01900000003" },
        update: {},
        create: { name: "Agro Fresh Supplies", phone: "01900000003", email: null },
    });
    console.log("✅ Suppliers created");

    // ── Products & Variants ───────────────────────────────────────────────────────

    // Helper to upsert a product (normalized_key used as unique check in real app)
    async function createProduct(
        name: string,
        categoryId: string,
        brand: string | null,
        variants: { name: string | null; color?: string; size?: string }[]
    ) {
        const normalized_key = name.toLowerCase().replace(/\s+/g, "-");
        // Check if exists by normalized_key
        const existing = await prisma.product.findFirst({ where: { normalized_key } });
        if (existing) {
            const existingVariants = await prisma.productVariant.findMany({ where: { product_id: existing.id } });
            return { product: existing, variants: existingVariants };
        }

        const product = await prisma.product.create({
            data: {
                name,
                normalized_key,
                brand,
                category_id: categoryId,
                reorder_level: rnd(5, 20),
                variants: {
                    create: variants.map((v) => ({ name: v.name, color: v.color ?? null, size: v.size ?? null })),
                },
            },
            include: { variants: true },
        });
        return { product, variants: product.variants };
    }

    const { variants: samsungVariants } = await createProduct("Samsung Galaxy A35", phones.id, "Samsung", [
        { name: "8GB/128GB - Black", color: "Black" },
        { name: "8GB/128GB - Blue", color: "Blue" },
        { name: "8GB/256GB - Black", color: "Black" },
    ]);

    const { variants: iPhoneVariants } = await createProduct("iPhone 15", phones.id, "Apple", [
        { name: "128GB - Midnight", color: "Midnight" },
        { name: "256GB - Pink", color: "Pink" },
    ]);

    const { variants: chargerVariants } = await createProduct("USB-C Fast Charger 65W", accessories.id, "Anker", [
        { name: null },
    ]);

    const { variants: earbudsVariants } = await createProduct("Wireless Earbuds Pro", accessories.id, "JBL", [
        { name: "White", color: "White" },
        { name: "Black", color: "Black" },
    ]);

    const { variants: tshirtVariants } = await createProduct("Cotton Polo T-Shirt", clothing.id, null, [
        { name: "White / S", color: "White", size: "S" },
        { name: "White / M", color: "White", size: "M" },
        { name: "White / L", color: "White", size: "L" },
        { name: "Black / M", color: "Black", size: "M" },
        { name: "Black / L", color: "Black", size: "L" },
    ]);

    const { variants: pantVariants } = await createProduct("Slim Fit Chino Pants", clothing.id, null, [
        { name: "Navy / 30", color: "Navy", size: "30" },
        { name: "Navy / 32", color: "Navy", size: "32" },
        { name: "Khaki / 32", color: "Khaki", size: "32" },
        { name: "Khaki / 34", color: "Khaki", size: "34" },
    ]);

    const { variants: riceVariants } = await createProduct("Miniket Rice 5kg", groceries.id, "Pran", [
        { name: null },
    ]);

    const { variants: oilVariants } = await createProduct("Soybean Oil 1L", groceries.id, "Teer", [
        { name: null },
    ]);

    console.log("✅ Products & variants created");

    // ── Barcodes ──────────────────────────────────────────────────────────────────
    // Generate a pool of barcodes, then allocate them during purchase creation
    const barcodePool: { code: string }[] = [];
    for (let i = 1; i <= 120; i++) {
        barcodePool.push({ code: `BC${String(i).padStart(8, "0")}` });
    }

    // Upsert barcodes
    const createdBarcodes: { id: string; code: string }[] = [];
    for (const b of barcodePool) {
        const existing = await prisma.barcode.findUnique({ where: { code: b.code } });
        if (existing) {
            createdBarcodes.push({ id: existing.id, code: existing.code });
        } else {
            const created = await prisma.barcode.create({ data: { code: b.code } });
            createdBarcodes.push({ id: created.id, code: created.code });
        }
    }

    // Retire a couple of barcodes for realism
    await prisma.barcode.update({
        where: { id: createdBarcodes[0].id },
        data: { status: BarcodeStatus.RETIRED, retired_by: owner.id, retired_at: daysAgo(10) },
    });
    await prisma.barcode.update({
        where: { id: createdBarcodes[1].id },
        data: { status: BarcodeStatus.RETIRED, retired_by: staff1.id, retired_at: daysAgo(5) },
    });

    let barcodeIndex = 2; // start from index 2 (0 and 1 are retired)
    function nextBarcode() {
        return createdBarcodes[barcodeIndex++];
    }

    console.log("✅ Barcodes created");

    // ── Purchases ─────────────────────────────────────────────────────────────────
    // Track variant stock manually (for balance_after in ledger)
    const variantStock: Record<string, number> = {};
    function getStock(variantId: string) {
        return variantStock[variantId] ?? 0;
    }
    function addStock(variantId: string, qty: number) {
        variantStock[variantId] = getStock(variantId) + qty;
    }
    function deductStock(variantId: string, qty: number) {
        variantStock[variantId] = getStock(variantId) - qty;
    }

    // Purchase 1 — Electronics batch (30 days ago)
    const purchase1 = await prisma.purchase.create({
        data: {
            supplier_id: supplier1.id,
            user_id: owner.id,
            invoice_no: "PUR-2024-001",
            date: daysAgo(30),
            total: dec(0), // will update
            items: {
                create: [
                    { variant_id: samsungVariants[0].id, quantity: 10, cost_price: dec(28000), sell_price: dec(34500), total: dec(280000) },
                    { variant_id: samsungVariants[1].id, quantity: 8, cost_price: dec(28000), sell_price: dec(34500), total: dec(224000) },
                    { variant_id: samsungVariants[2].id, quantity: 5, cost_price: dec(30000), sell_price: dec(37000), total: dec(150000) },
                    { variant_id: chargerVariants[0].id, quantity: 30, cost_price: dec(600), sell_price: dec(950), total: dec(18000) },
                    { variant_id: earbudsVariants[0].id, quantity: 15, cost_price: dec(2200), sell_price: dec(3200), total: dec(33000) },
                    { variant_id: earbudsVariants[1].id, quantity: 10, cost_price: dec(2200), sell_price: dec(3200), total: dec(22000) },
                ],
            },
        },
        include: { items: true },
    });

    await prisma.purchase.update({ where: { id: purchase1.id }, data: { total: dec(727000) } });

    // Stock ledgers + barcode allocations for purchase 1
    for (const item of purchase1.items) {
        addStock(item.variant_id, item.quantity);
        await prisma.stockLedger.create({
            data: {
                variant_id: item.variant_id,
                type: StockMovementType.PURCHASE,
                direction: StockDirection.IN,
                quantity: item.quantity,
                balance_after: getStock(item.variant_id),
                purchase_id: purchase1.id,
                created_at: daysAgo(30),
            },
        });
        // Allocate barcodes
        for (let q = 0; q < item.quantity; q++) {
            const bc = nextBarcode();
            await prisma.barcode.update({ where: { id: bc.id }, data: { status: BarcodeStatus.ALLOCATED } });
            await prisma.variantBarcodeAllocation.create({
                data: {
                    barcode_id: bc.id,
                    variant_id: item.variant_id,
                    purchase_item_id: item.id,
                    allocated_by: owner.id,
                    allocated_at: daysAgo(30),
                },
            });
        }
    }

    // Purchase 2 — Clothing batch (20 days ago)
    const purchase2 = await prisma.purchase.create({
        data: {
            supplier_id: supplier2.id,
            user_id: staff1.id,
            invoice_no: "PUR-2024-002",
            date: daysAgo(20),
            total: dec(0),
            items: {
                create: [
                    { variant_id: tshirtVariants[0].id, quantity: 20, cost_price: dec(250), sell_price: dec(450), total: dec(5000) },
                    { variant_id: tshirtVariants[1].id, quantity: 25, cost_price: dec(250), sell_price: dec(450), total: dec(6250) },
                    { variant_id: tshirtVariants[2].id, quantity: 20, cost_price: dec(250), sell_price: dec(450), total: dec(5000) },
                    { variant_id: tshirtVariants[3].id, quantity: 15, cost_price: dec(260), sell_price: dec(460), total: dec(3900) },
                    { variant_id: tshirtVariants[4].id, quantity: 15, cost_price: dec(260), sell_price: dec(460), total: dec(3900) },
                    { variant_id: pantVariants[0].id, quantity: 12, cost_price: dec(550), sell_price: dec(950), total: dec(6600) },
                    { variant_id: pantVariants[1].id, quantity: 15, cost_price: dec(550), sell_price: dec(950), total: dec(8250) },
                    { variant_id: pantVariants[2].id, quantity: 10, cost_price: dec(560), sell_price: dec(960), total: dec(5600) },
                    { variant_id: pantVariants[3].id, quantity: 10, cost_price: dec(560), sell_price: dec(960), total: dec(5600) },
                ],
            },
        },
        include: { items: true },
    });

    await prisma.purchase.update({ where: { id: purchase2.id }, data: { total: dec(50100) } });

    for (const item of purchase2.items) {
        addStock(item.variant_id, item.quantity);
        await prisma.stockLedger.create({
            data: {
                variant_id: item.variant_id,
                type: StockMovementType.PURCHASE,
                direction: StockDirection.IN,
                quantity: item.quantity,
                balance_after: getStock(item.variant_id),
                purchase_id: purchase2.id,
                created_at: daysAgo(20),
            },
        });
        for (let q = 0; q < Math.min(item.quantity, 3); q++) {
            // Allocate a subset of barcodes (not every clothing item is individually barcoded in all shops)
            const bc = nextBarcode();
            await prisma.barcode.update({ where: { id: bc.id }, data: { status: BarcodeStatus.ALLOCATED } });
            await prisma.variantBarcodeAllocation.create({
                data: {
                    barcode_id: bc.id,
                    variant_id: item.variant_id,
                    purchase_item_id: item.id,
                    allocated_by: staff1.id,
                    allocated_at: daysAgo(20),
                },
            });
        }
    }

    // Purchase 3 — Grocery batch (15 days ago)
    const purchase3 = await prisma.purchase.create({
        data: {
            supplier_id: supplier3.id,
            user_id: owner.id,
            invoice_no: "PUR-2024-003",
            date: daysAgo(15),
            total: dec(0),
            items: {
                create: [
                    { variant_id: riceVariants[0].id, quantity: 100, cost_price: dec(280), sell_price: dec(340), total: dec(28000) },
                    { variant_id: oilVariants[0].id, quantity: 80, cost_price: dec(155), sell_price: dec(185), total: dec(12400) },
                ],
            },
        },
        include: { items: true },
    });

    await prisma.purchase.update({ where: { id: purchase3.id }, data: { total: dec(40400) } });

    for (const item of purchase3.items) {
        addStock(item.variant_id, item.quantity);
        await prisma.stockLedger.create({
            data: {
                variant_id: item.variant_id,
                type: StockMovementType.PURCHASE,
                direction: StockDirection.IN,
                quantity: item.quantity,
                balance_after: getStock(item.variant_id),
                purchase_id: purchase3.id,
                created_at: daysAgo(15),
            },
        });
    }

    // iPhone purchase — separate, higher value (10 days ago)
    const purchase4 = await prisma.purchase.create({
        data: {
            supplier_id: supplier1.id,
            user_id: owner.id,
            invoice_no: "PUR-2024-004",
            date: daysAgo(10),
            total: dec(0),
            items: {
                create: [
                    { variant_id: iPhoneVariants[0].id, quantity: 5, cost_price: dec(95000), sell_price: dec(115000), total: dec(475000) },
                    { variant_id: iPhoneVariants[1].id, quantity: 3, cost_price: dec(105000), sell_price: dec(126000), total: dec(315000) },
                ],
            },
        },
        include: { items: true },
    });

    await prisma.purchase.update({ where: { id: purchase4.id }, data: { total: dec(790000) } });

    for (const item of purchase4.items) {
        addStock(item.variant_id, item.quantity);
        await prisma.stockLedger.create({
            data: {
                variant_id: item.variant_id,
                type: StockMovementType.PURCHASE,
                direction: StockDirection.IN,
                quantity: item.quantity,
                balance_after: getStock(item.variant_id),
                purchase_id: purchase4.id,
                created_at: daysAgo(10),
            },
        });
        for (let q = 0; q < item.quantity; q++) {
            const bc = nextBarcode();
            await prisma.barcode.update({ where: { id: bc.id }, data: { status: BarcodeStatus.ALLOCATED } });
            await prisma.variantBarcodeAllocation.create({
                data: {
                    barcode_id: bc.id,
                    variant_id: item.variant_id,
                    purchase_item_id: item.id,
                    allocated_by: owner.id,
                    allocated_at: daysAgo(10),
                },
            });
        }
    }

    console.log("✅ Purchases + stock ledgers + barcode allocations created");

    // ── Stock Adjustment ──────────────────────────────────────────────────────────
    const adjustment = await prisma.stockAdjustment.create({
        data: {
            adjusted_by: owner.id,
            reason: "Damage write-off",
            note: "3 chargers found damaged during stock count",
            created_at: daysAgo(7),
            items: {
                create: [
                    { variant_id: chargerVariants[0].id, direction: StockDirection.OUT, quantity: 3, note: "Damaged stock" },
                ],
            },
        },
        include: { items: true },
    });

    deductStock(chargerVariants[0].id, 3);
    await prisma.stockLedger.create({
        data: {
            variant_id: chargerVariants[0].id,
            type: StockMovementType.ADJUSTMENT,
            direction: StockDirection.OUT,
            quantity: 3,
            balance_after: getStock(chargerVariants[0].id),
            adjustment_id: adjustment.id,
            created_at: daysAgo(7),
        },
    });
    console.log("✅ Stock adjustment created");

    // ── Sales ─────────────────────────────────────────────────────────────────────
    let invoiceNumber = 1001;

    async function createSale(opts: {
        userId: string;
        customerId?: string;
        daysBack: number;
        items: { variantId: string; productName: string; variantName: string | null; unitPrice: number; qty: number; itemDiscount?: number }[];
        discount?: number;
        payments: { method: PaymentMethod; amount: number }[];
        waived?: number;
        status?: SaleStatus;
    }) {
        const subtotal = opts.items.reduce((sum, i) => sum + i.unitPrice * i.qty - (i.itemDiscount ?? 0), 0);
        const discount = opts.discount ?? 0;
        const waived = opts.waived ?? 0;
        const total = subtotal - discount;
        const inv = `INV-${invoiceNumber++}`;

        const sale = await prisma.sale.create({
            data: {
                user_id: opts.userId,
                customer_id: opts.customerId ?? null,
                invoice_number: inv,
                invoiced_at: daysAgo(opts.daysBack),
                status: opts.status ?? SaleStatus.COMPLETED,
                subtotal: dec(subtotal),
                discount_amount: dec(discount),
                tax_amount: dec(0),
                waived_amount: dec(waived),
                total: dec(total),
                items: {
                    create: opts.items.map((i) => ({
                        variant_id: i.variantId,
                        product_name: i.productName,
                        variant_name: i.variantName,
                        unit_price: dec(i.unitPrice),
                        quantity: i.qty,
                        discount_amount: dec(i.itemDiscount ?? 0),
                        total: dec(i.unitPrice * i.qty - (i.itemDiscount ?? 0)),
                    })),
                },
                payments: {
                    create: opts.payments.map((p) => ({
                        method: p.method,
                        amount: dec(p.amount),
                    })),
                },
            },
        });

        // Stock ledgers for each sale item
        for (const i of opts.items) {
            deductStock(i.variantId, i.qty);
            await prisma.stockLedger.create({
                data: {
                    variant_id: i.variantId,
                    type: StockMovementType.SALE,
                    direction: StockDirection.OUT,
                    quantity: i.qty,
                    balance_after: getStock(i.variantId),
                    sale_id: sale.id,
                    created_at: daysAgo(opts.daysBack),
                },
            });
        }

        return sale;
    }

    // Sale 1 — Samsung + Charger, customer paid cash, 25 days ago
    await createSale({
        userId: staff1.id,
        customerId: customers[0].id,
        daysBack: 25,
        items: [
            { variantId: samsungVariants[0].id, productName: "Samsung Galaxy A35", variantName: "8GB/128GB - Black", unitPrice: 34500, qty: 1 },
            { variantId: chargerVariants[0].id, productName: "USB-C Fast Charger 65W", variantName: null, unitPrice: 950, qty: 2 },
        ],
        discount: 200,
        payments: [{ method: PaymentMethod.CASH, amount: 36200 }],
    });

    // Sale 2 — T-shirts, bKash, 22 days ago
    await createSale({
        userId: staff2.id,
        customerId: customers[1].id,
        daysBack: 22,
        items: [
            { variantId: tshirtVariants[1].id, productName: "Cotton Polo T-Shirt", variantName: "White / M", unitPrice: 450, qty: 3 },
            { variantId: tshirtVariants[3].id, productName: "Cotton Polo T-Shirt", variantName: "Black / M", unitPrice: 460, qty: 2 },
        ],
        payments: [{ method: PaymentMethod.BKASH, amount: 2270 }],
    });

    // Sale 3 — Grocery run, cash, 18 days ago
    await createSale({
        userId: staff1.id,
        daysBack: 18,
        items: [
            { variantId: riceVariants[0].id, productName: "Miniket Rice 5kg", variantName: null, unitPrice: 340, qty: 5 },
            { variantId: oilVariants[0].id, productName: "Soybean Oil 1L", variantName: null, unitPrice: 185, qty: 3 },
        ],
        payments: [{ method: PaymentMethod.CASH, amount: 2255 }],
    });

    // Sale 4 — iPhone sale! Split payment, 9 days ago
    await createSale({
        userId: owner.id,
        customerId: customers[2].id,
        daysBack: 9,
        items: [
            { variantId: iPhoneVariants[0].id, productName: "iPhone 15", variantName: "128GB - Midnight", unitPrice: 115000, qty: 1 },
        ],
        discount: 1000,
        payments: [
            { method: PaymentMethod.CASH, amount: 50000 },
            { method: PaymentMethod.BKASH, amount: 64000 },
        ],
    });

    // Sale 5 — Samsung Blue + JBL Earbuds, Nagad, 8 days ago
    await createSale({
        userId: staff2.id,
        customerId: customers[3].id,
        daysBack: 8,
        items: [
            { variantId: samsungVariants[1].id, productName: "Samsung Galaxy A35", variantName: "8GB/128GB - Blue", unitPrice: 34500, qty: 1 },
            { variantId: earbudsVariants[0].id, productName: "Wireless Earbuds Pro", variantName: "White", unitPrice: 3200, qty: 1 },
        ],
        payments: [{ method: PaymentMethod.NAGAD, amount: 37700 }],
    });

    // Sale 6 — Pants + T-shirts, cash, 7 days ago
    await createSale({
        userId: staff1.id,
        customerId: customers[4].id,
        daysBack: 7,
        items: [
            { variantId: pantVariants[1].id, productName: "Slim Fit Chino Pants", variantName: "Navy / 32", unitPrice: 950, qty: 2 },
            { variantId: tshirtVariants[2].id, productName: "Cotton Polo T-Shirt", variantName: "White / L", unitPrice: 450, qty: 3 },
        ],
        discount: 150,
        payments: [{ method: PaymentMethod.CASH, amount: 3200 }],
    });

    // Sale 7 — Charger + Earbuds, 5 days ago, walk-in customer
    await createSale({
        userId: staff2.id,
        daysBack: 5,
        items: [
            { variantId: chargerVariants[0].id, productName: "USB-C Fast Charger 65W", variantName: null, unitPrice: 950, qty: 1 },
            { variantId: earbudsVariants[1].id, productName: "Wireless Earbuds Pro", variantName: "Black", unitPrice: 3200, qty: 1 },
        ],
        payments: [{ method: PaymentMethod.CASH, amount: 4150 }],
    });

    // Sale 8 — Grocery repeat, 3 days ago
    await createSale({
        userId: staff1.id,
        customerId: customers[5].id,
        daysBack: 3,
        items: [
            { variantId: riceVariants[0].id, productName: "Miniket Rice 5kg", variantName: null, unitPrice: 340, qty: 10 },
            { variantId: oilVariants[0].id, productName: "Soybean Oil 1L", variantName: null, unitPrice: 185, qty: 6 },
        ],
        payments: [
            { method: PaymentMethod.CASH, amount: 3000 },
            { method: PaymentMethod.ROCKET, amount: 1510 },
        ],
    });

    // Sale 9 — iPhone 256GB Pink, waived 500 BDT (rounding waiver), yesterday
    await createSale({
        userId: owner.id,
        customerId: customers[6].id,
        daysBack: 1,
        items: [
            { variantId: iPhoneVariants[1].id, productName: "iPhone 15", variantName: "256GB - Pink", unitPrice: 126000, qty: 1 },
        ],
        waived: 500,
        payments: [{ method: PaymentMethod.BKASH, amount: 125500 }],
    });

    // Sale 10 — VOID sale (returned order), 2 days ago
    await createSale({
        userId: owner.id,
        customerId: customers[7].id,
        daysBack: 2,
        items: [
            { variantId: tshirtVariants[4].id, productName: "Cotton Polo T-Shirt", variantName: "Black / L", unitPrice: 460, qty: 2 },
        ],
        status: SaleStatus.VOID,
        payments: [{ method: PaymentMethod.CASH, amount: 920 }],
    });

    console.log("✅ Sales + payments + stock ledgers created");
    console.log("\n🎉 Seeding complete!");
    console.log("   Users: owner@posapp.com / staff1@posapp.com / staff2@posapp.com (password: password123)");
}

main()
    .catch((e) => {
        console.error("❌ Seed failed:", e);
        prisma.$disconnect();
        throw e;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });