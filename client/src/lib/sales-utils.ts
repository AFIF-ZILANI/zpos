import type { PaymentStatus, TimeLine } from '@/types'
import {
    startOfDay,
    startOfWeek,
    startOfMonth,
    endOfDay,
    endOfMonth,
    subDays
} from "date-fns"

export function getDateRange(range: TimeLine, customFrom?: Date, customTo?: Date) {
    const now = new Date()

    const thisMonth = () => ({
        from: startOfDay(startOfMonth(now)).toISOString(),
        to: endOfDay(endOfMonth(now)).toISOString(),
    })

    switch (range) {
        case "TODAY":
            return {
                from: startOfDay(now).toISOString(),
                to: endOfDay(now).toISOString(),
            }

        case "YESTERDAY":
            return {
                from: startOfDay(subDays(now, 1)).toISOString(),
                to: endOfDay(subDays(now, 1)).toISOString(),
            }

        case "THIS_WEEK":
            return {
                from: startOfDay(startOfWeek(now, { weekStartsOn: 1 })).toISOString(),
                to: endOfDay(now).toISOString(),
            }

        case "THIS_MONTH":
            return thisMonth()

        case "CUSTOM":
            if (!customFrom || !customTo) return thisMonth()

            return {
                from: startOfDay(customFrom).toISOString(),
                to: endOfDay(customTo).toISOString(),
            }

        default:
            return thisMonth()
    }
}

export function getStatusColor(status: PaymentStatus): string {
    switch (status) {
        case 'PAID':
            return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
        case 'PARTIAL':
            return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
        case 'DUE':
            return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    }
}

export function formatDelta(delta: number): string {
    const sign = delta >= 0 ? '↑' : '↓'
    return `${sign} ${Math.abs(delta)}%`
}

export function calculateDaysOverdue(dueDate: string): number {
    const now = new Date()
    const due = new Date(dueDate)
    const diff = now.getTime() - due.getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24))
}
