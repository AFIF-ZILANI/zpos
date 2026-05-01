import { createMiddleware } from 'hono/factory'
import { sendError } from '@/utils/response'

const MIN_APP_VERSION = '1.0.0'

function isVersionSupported(version: string) {
    const [maj, min] = version.split('.').map(Number)
    if (maj === undefined || min === undefined) return false

    const [minMaj, minMin] = MIN_APP_VERSION.split('.').map(Number)
    if (minMaj === undefined || minMin === undefined) return false

    return maj > minMaj || (maj === minMaj && min >= minMin)
}

export const mobileMiddleware = createMiddleware(async (c, next) => {
    const platform = c.req.header('X-Platform')  // 'ios' | 'android'
    const version = c.req.header('X-App-Version') // '1.2.0'

    if (version && !isVersionSupported(version)) {
        return sendError(
            c,
            'App version no longer supported. Please update.',
            'VERSION_OUTDATED',
            400
        )
    }

    // Make available downstream
    c.set('platform', platform ?? 'unknown')
    c.set('appVersion', version ?? 'unknown')

    await next()
})