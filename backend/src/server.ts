import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { requireAuth } from './middleware/requireAuth.js'
import { authRouter } from './routes/auth.routes.js'
import { dashboardRouter } from './routes/dashboard.routes.js'
import { healthRouter } from './routes/health.routes.js'
import { listRouter } from './routes/list.routes.js'
import { requestRouter } from './routes/request.routes.js'
import { publicVendorRouter } from './routes/publicVendor.routes.js'
import { inboundEmailService } from './services/inboundEmailService.js'

const app = express()
const port = 3001
const dataSource = process.env.DATA_SOURCE ?? 'memory'
const defaultOrigins = [
  'http://localhost:5173',
  ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
]
const allowedOrigins = (process.env.CORS_ORIGIN ?? defaultOrigins.join(','))
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

app.use(cors({ origin: allowedOrigins }))
app.use(express.json())
app.use('/api', healthRouter)
app.use('/api/auth', authRouter)
app.use('/api/vendor', publicVendorRouter)
app.use('/api', requireAuth)
app.use('/api/lists', listRouter)
app.use('/api/dashboard', dashboardRouter)
app.use('/api/requests', requestRouter)
if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Server listening on port ${port} (data source: ${dataSource})`)
    inboundEmailService.start()
  })
}

export default app
