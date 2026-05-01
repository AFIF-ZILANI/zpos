export type AppVariables = {
    clerkUserId: string;
    userId: string;
    userRole: string;
    validatedBody: unknown;
};

export type AppEnv = { Variables: AppVariables };

export type ProductStatus = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";

export type Product = {
    id: string;
    category: string;
    price: number;
    stock: number;
    status: ProductStatus;
};

export type ProductRow = {
    id: string;
    name: string;
    category: string;
    stock: bigint;
    variants: bigint;
    reorder_level: number;
    status: ProductStatus;
};

export type ProductTableRow = {
    id: string;
    name: string;
    category: string;
    stock: number;
    variants: number
    status: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
};

export type PurchaseHistory = {
    id: string;
    supplier: string;
    date: string;
    items: number;
    invoiceNo: string | null;
    total: number;
}

export type OverviewStats = {
    totalPurchases: number;
    totalPurchaseValue: number;
    uniqueSuppliers: number;
    purchasesThisMonth: number;
}

export type CartEntryProduct = {
    variantId: string;
    name: string;
    barcode: string;
    price: number;
    availableStock: number;
}

export type BarcodePrintData = {
    barcode: string;
    productName: string
}

export type PaymentMethod = "CASH" | "BKASH" | "NAGAD" | "ROCKET";
export type PaymentStatus = "PAID" | "DUE" | "PARTIAL";

export interface CustomerInfo {
    name: string;
    phone: string;
    email: string;
    address: string;
}

export interface CheckoutPayload {
    method: PaymentMethod;
    status: PaymentStatus;
    paidAmount: number;
    customer: CustomerInfo;
}


export type DashboardStats = {
    totalRevenueToday: number;
    totalSalesToday: number;
    totalCustomers: number;
    averageOrderValue: number;
};

export type DashboardStatTrend = {
    date: string;
    revenue: { type: "UP" | "DOWN"; percentage: number };
    sales: { type: "UP" | "DOWN"; percentage: number };
    customers: { type: "UP" | "DOWN"; percentage: number };
    averageOrderValue: { type: "UP" | "DOWN"; percentage: number };
};

export type CategorySalesEntry = {
    name: string;
    value: number; // percentage of total, rounded to 2dp
};

export type WeeklySalesEntry = {
    day: string;   // "SAT" | "SUN" | … | "FRI"
    sales: number; // revenue
    orders: number;
};

export type TopProductEntry = {
    name: string;
    sold: number;     // total units sold in the selected period
    revenue: number;  // total revenue in the selected period
    trend: string;    // revenue change vs previous day, e.g. "+12.5%" | "-8.3%"
};

export type DashboardSalesHistory = {
    id: string;
    customerId: string;
    customerName: string;
    items: { productId: string; name: string; qty: number; price: number }[];
    total: number;
    status: PaymentStatus;
    date: string;
    paymentMethod: PaymentMethod;
};

export type CustomerTableData = {
    id: string;
    name: string;
    email?: string;
    phone: string;
    totalOrders: number;
    totalSpent: number;
    lastVisit?: string;
    status: "ACTIVE" | "INACTIVE";
    joinDate: string;
    address: string;
};

export type CustomerStats = {
    totalCustomers: number;
    activeCustomers: number;
    inactiveCustomers: number;
    frequentCustomers: number;
}

export type Trend = {
    isPositive: boolean;
    delta: number;
}

export type StatsItem = {
    value: number;
    trend: Trend;
}

export interface SaleMetrics {
    totalRevenue: StatsItem;
    totalSales: StatsItem;
    unpaidSales: StatsItem;
    totalReturns: StatsItem;
}


// types/invoice.ts
export interface InvoiceLineItem {
    variant_id: string;
    product_name: string;
    variant_name: string | null;
    quantity: number;
    unit_price: number;
    discount_amount: number;
    total: number;
}

export interface InvoicePayment {
    method: string;
    amount: number;
    reference: string | null;
}

export interface Invoice {
    invoice_number: string;
    sale_id: string;
    date: Date;
    cashier: {
        id: string;
        name: string;
    };
    customer: {
        id: string;
        name: string;
        phone: string | null;
    } | null;
    items: InvoiceLineItem[];
    payments: InvoicePayment[];
    subtotal: number;
    discount_amount: number;
    tax_amount: number;
    total: number;
    note: string | null;
    status: string;
}

export interface Sale {
    id: string
    invoiceNumber: string
    customerId: string
    customerName: string
    date: string // ISO
    items: number
    total: number
    paid: number
    due: number
    status: PaymentStatus
    type: "SALE" | "RETURN" | "ALL"
    createdAt: string
}

export interface PaymentData {
    saleId: string;
    invoiceNo: string;
    customer: CustomerInfo;
    status: PaymentStatus;
    paidAmount: number;
    totalAmount: number;
}

export type PaymentCollectPayload = {
    saleId: string
    amount: number
    method: PaymentMethod
    reference?: string
}


export type TProduct = {
    id: string;
    name: string;
    description: string | null;
    brand: string;
    isActive: boolean;
    category: {
        id: string;
        name: string;
    };
    reorderLevel: number;
    variants: {
        id: string;
        isActive: boolean;
        name: string;
        color: string;
        size: string;
    }[];
}

export interface FlatCategory {
    id: string;
    name: string;
    description?: string;
}

export interface Category {
    id: string;
    name: string;
    description?: string;
    children?: Category[];
}


export interface FlatCategory {
    id: string;
    name: string;
    description?: string;
}


export type RowData = PurchaseRowDraft;

export interface PurchaseRowDraft {
    tempId: string;
    variantId?: string;      // UUID string, set once user picks from Select
    quantity?: string;       // raw input string, e.g. "100", "10.5", ""
    unitCost?: string;       // raw input string
    sellingPrice?: string;   // raw input string
}


export interface TableResponse<T> {
    data: {
        items: T[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export type BasicDataResponse<T> = {
    data: T;
}
export interface CustomerInfo {
    name: string;
    phone: string;
    email: string;
    address: string;
}

export interface CheckoutPayload {
    method: PaymentMethod;
    status: PaymentStatus;
    paidAmount: number;
    customer: CustomerInfo;
}


export interface Sale {
    id: string
    invoiceNumber: string
    customerId: string
    customerName: string
    date: string // ISO
    items: number
    total: number
    paid: number
    due: number
    status: PaymentStatus
    isDeleted: boolean
    createdAt: string
    updatedAt: string
}

export interface SaleMetric {
    label: string
    value: number
    delta: number // percentage change
    isPositive: boolean
}

export interface SaleMetrics {
    totalRevenue: StatsItem;
    totalSales: StatsItem;
    uncollectedRevenue: StatsItem;
    voidedSales: StatsItem;
}

export interface OrderStatusData {
    name: string
    value: number
    fill: string
}

export interface HistoryQueryParams {
    from: string // ISO date
    to: string // ISO date
    page: number
    search?: string
    status?: PaymentStatus | 'ALL'
}

export interface PaymentPayload {
    amount: number
    notes?: string
}

export interface DeletePayload {
    reason?: string
}


export type TimeLine = 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'THIS_YEAR' | 'CUSTOM'



export interface Category {
    id: string;
    name: string;
    description?: string;
    children?: Category[];
}


export interface FlatCategory {
    id: string;
    name: string;
    description?: string;
}



export interface PurchaseRowDraft {
    tempId: string;
    variantId?: string;      // UUID string, set once user picks from Select
    quantity?: string;       // raw input string, e.g. "100", "10.5", ""
    unitCost?: string;       // raw input string
    sellingPrice?: string;   // raw input string
}



export interface TableResponse<T> {
    data: {
        items: T[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}




export interface CustomerInfo {
    name: string;
    phone: string;
    email: string;
    address: string;
}

export interface CheckoutPayload {
    method: PaymentMethod;
    status: PaymentStatus;
    paidAmount: number;
    customer: CustomerInfo;
}






export interface Sale {
    id: string
    invoiceNumber: string
    customerId: string
    customerName: string
    date: string // ISO
    items: number
    total: number
    paid: number
    due: number
    status: PaymentStatus
    isDeleted: boolean
    createdAt: string
    updatedAt: string
}

export interface SaleMetric {
    label: string
    value: number
    delta: number // percentage change
    isPositive: boolean
}

export interface SaleMetrics {
    totalRevenue: StatsItem;
    totalSales: StatsItem;
    uncollectedRevenue: StatsItem;
    voidedSales: StatsItem;
}

export interface OrderStatusData {
    name: string
    value: number
    fill: string
}

export interface HistoryQueryParams {
    from: string // ISO date
    to: string // ISO date
    page: number
    search?: string
    status?: PaymentStatus | 'ALL'
}

export interface PaymentPayload {
    amount: number
    notes?: string
}

export interface DeletePayload {
    reason?: string
}