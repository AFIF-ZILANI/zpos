import { serve } from '@hono/node-server'
import { app } from './src/app'

const port = Number(process.env.PORT) || 3000

serve({ fetch: app.fetch, port }, () => {
    console.log(`Server running on http://localhost:${port}`)
})