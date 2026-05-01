// export interface Category {
//     id: string;
//     name: string;
//     description?: string;
//     children?: Category[];
// }

// export type ProductStatus = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";

// export interface FlatCategory {
//     id: string;
//     name: string;
//     description?: string;
// }
// export type ProductTableRow = {
//     id: string;
//     name: string;
//     category: string;
//     stock: number;
//     variants: number
//     status: ProductStatus;
// };

// export type RowData = PurchaseRowDraft;

// export interface PurchaseRowDraft {
//     tempId: string;
//     variantId?: string;      // UUID string, set once user picks from Select
//     quantity?: string;       // raw input string, e.g. "100", "10.5", ""
//     unitCost?: string;       // raw input string
//     sellingPrice?: string;   // raw input string
// }

// export type PurchaseHistory = {
//     id: string;
//     supplier: string;
//     date: string;
//     items: number;
//     invoiceNo: string | null;
//     total: number;
// }

// export type OverviewStats = {
//     totalPurchases: number;
//     totalPurchaseValue: number;
//     uniqueSuppliers: number;
//     purchasesThisMonth: number;
// }

// export interface TableResponse<T> {
//     data: {
//         items: T[];
//         total: number;
//         page: number;
//         limit: number;
//         totalPages: number;
//     };
// }

// export type BasicDataResponse<T> = {
//     data: T;
// }

// export type Trend = {
//     isPositive: boolean;
//     delta: number;
// }

// export type StatsItem = {
//     value: number;
//     trend: Trend;
// }


// export type Product = {
//     id: string;
//     name: string;
//     category: string;
//     price: number;
//     stock: number;
//     status: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
// };

// export type CartEntryProduct = {
//     variantId: string;
//     barcode: string;
//     name: string;
//     price: number;
//     availableStock: number;
// }

// export type BarcodePrintData = {
//     barcode: string;
//     productName: string
// }

// export type PaymentMethod = "CASH" | "BKASH" | "NAGAD" | "ROCKET";
// export type PaymentStatus = "PAID" | "DUE" | "PARTIAL";

// export interface CustomerInfo {
//     name: string;
//     phone: string;
//     email: string;
//     address: string;
// }

// export interface CheckoutPayload {
//     method: PaymentMethod;
//     status: PaymentStatus;
//     paidAmount: number;
//     customer: CustomerInfo;
// }

// export type DashboardStats = {
//     totalRevenueToday: number;
//     totalSalesToday: number;
//     totalCustomers: number;
//     averageOrderValue: number;
// };

// export type DashboardStatTrend = {
//     date: string;
//     revenue: { type: "UP" | "DOWN"; percentage: number };
//     sales: { type: "UP" | "DOWN"; percentage: number };
//     customers: { type: "UP" | "DOWN"; percentage: number };
//     averageOrderValue: { type: "UP" | "DOWN"; percentage: number };
// };

// export type WeeklySalesEntry = {
//     day: string;   // "SAT" | "SUN" | … | "FRI"
//     sales: number; // revenue
//     orders: number;
// };

// export type CategorySalesEntry = {
//     name: string;
//     value: number; // percentage of total, rounded to 2dp
// };

// export type TopProductEntry = {
//     name: string;
//     sold: number;     // total units sold in the selected period
//     revenue: number;  // total revenue in the selected period
//     trend: string;    // revenue change vs previous day, e.g. "+12.5%" | "-8.3%"
// };

// export type DashboardSalesHistory = {
//     id: string;
//     customerId: string;
//     customerName: string;
//     items: { productId: string; name: string; qty: number; price: number }[];
//     total: number;
//     status: PaymentStatus
//     date: string;
//     paymentMethod: PaymentMethod
// };

// export type CustomerTableData = {
//     id: string;
//     name: string;
//     email?: string;
//     phone: string;
//     totalOrders: number;
//     totalSpent: number;
//     lastVisit?: string;
//     status: "ACTIVE" | "INACTIVE";
//     joinDate: string;
//     address: string;
// };

// export type CustomerStats = {
//     totalCustomers: number;
//     activeCustomers: number;
//     inactiveCustomers: number;
//     frequentCustomers: number;
// }

// export type SaleType = 'SALE' | 'RETUEN'


// export interface Sale {
//     id: string
//     invoiceNumber: string
//     customerId: string
//     customerName: string
//     date: string // ISO
//     items: number
//     total: number
//     paid: number
//     due: number
//     status: PaymentStatus
//     type: SaleType
//     isDeleted: boolean
//     createdAt: string
//     updatedAt: string
// }

// export interface SaleMetric {
//     label: string
//     value: number
//     delta: number // percentage change
//     isPositive: boolean
// }

// export interface SaleMetrics {
//     totalRevenue: StatsItem;
//     totalSales: StatsItem;
//     uncollectedRevenue: StatsItem;
//     voidedSales: StatsItem;
// }

// export interface OrderStatusData {
//     name: string
//     value: number
//     fill: string
// }

// export interface HistoryQueryParams {
//     from: string // ISO date
//     to: string // ISO date
//     page: number
//     search?: string
//     status?: PaymentStatus | 'ALL'
//     type?: SaleType | 'ALL'
// }

// export interface PaymentPayload {
//     amount: number
//     notes?: string
// }

// export interface DeletePayload {
//     reason?: string
// }


// export type TimeLine = 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'THIS_YEAR' | 'CUSTOM'


// export type PaymentCollectPayload = {
//     saleId: string
//     amount: number
//     method: PaymentMethod
//     reference?: string
// }

// export type TProduct = {
//     id: string;
//     name: string;
//     description: string | null;
//     brand: string;
//     isActive: boolean;
//     category: {
//         id: string;
//         name: string;
//     };
//     reorderLevel: number;
//     variants: {
//         id: string;
//         isActive: boolean;
//         name: string;
//         color: string;
//         size: string;
//     }[];
// }

// export interface Category {
//     id: string;
//     name: string;
//     description?: string;
//     children?: Category[];
// }


// export interface FlatCategory {
//     id: string;
//     name: string;
//     description?: string;
// }



// export interface PurchaseRowDraft {
//     tempId: string;
//     variantId?: string;      // UUID string, set once user picks from Select
//     quantity?: string;       // raw input string, e.g. "100", "10.5", ""
//     unitCost?: string;       // raw input string
//     sellingPrice?: string;   // raw input string
// }



// export interface TableResponse<T> {
//     data: {
//         items: T[];
//         total: number;
//         page: number;
//         limit: number;
//         totalPages: number;
//     };
// }




// export interface CustomerInfo {
//     name: string;
//     phone: string;
//     email: string;
//     address: string;
// }

// export interface CheckoutPayload {
//     method: PaymentMethod;
//     status: PaymentStatus;
//     paidAmount: number;
//     customer: CustomerInfo;
// }






// export interface Sale {
//     id: string
//     invoiceNumber: string
//     customerId: string
//     customerName: string
//     date: string // ISO
//     items: number
//     total: number
//     paid: number
//     due: number
//     status: PaymentStatus
//     type: SaleType
//     isDeleted: boolean
//     createdAt: string
//     updatedAt: string
// }

// export interface SaleMetric {
//     label: string
//     value: number
//     delta: number // percentage change
//     isPositive: boolean
// }

// export interface SaleMetrics {
//     totalRevenue: StatsItem;
//     totalSales: StatsItem;
//     uncollectedRevenue: StatsItem;
//     voidedSales: StatsItem;
// }

// export interface OrderStatusData {
//     name: string
//     value: number
//     fill: string
// }

// export interface HistoryQueryParams {
//     from: string // ISO date
//     to: string // ISO date
//     page: number
//     search?: string
//     status?: PaymentStatus | 'ALL'
//     type?: SaleType | 'ALL'
// }

// export interface PaymentPayload {
//     amount: number
//     notes?: string
// }

// export interface DeletePayload {
//     reason?: string
// }


export * from "@myapp/shared"