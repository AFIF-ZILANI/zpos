import { useState, useCallback } from 'react'
import { getDateRange } from '@/lib/sales-utils'
import type { TimeLine } from '@/types'

export interface DateFilterState {
    range: TimeLine
    customFrom?: Date
    customTo?: Date
    from: string
    to: string
}

export function useDateFilter(initialRange: TimeLine = 'THIS_MONTH'): DateFilterState & {
    setRange: (range: TimeLine) => void
    setCustomDates: (from: Date, to: Date) => void
} {
    const [range, setRange] = useState<TimeLine>(initialRange)
    const [customFrom, setCustomFrom] = useState<Date>()
    const [customTo, setCustomTo] = useState<Date>()

    const { from, to } = getDateRange(range, customFrom, customTo)

    const handleSetRange = useCallback((newRange: TimeLine) => {
        setRange(newRange)
    }, [])

    const handleSetCustomDates = useCallback((from: Date, to: Date) => {
        setRange('CUSTOM')
        setCustomFrom(from)
        setCustomTo(to)
    }, [])

    return {
        range,
        customFrom,
        customTo,
        from,
        to,
        setRange: handleSetRange,
        setCustomDates: handleSetCustomDates,
    }
}
