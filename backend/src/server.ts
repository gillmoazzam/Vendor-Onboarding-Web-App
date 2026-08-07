import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { requireAuth } from './middleware/requireAuth.js'
import { approvalRouter } from './routes/approval.routes.js'
import { authRouter } from './routes/auth.routes.js'
import { dashboardRouter } from './routes/dashboard.routes.js'
import { healthRouter } from './routes/health.routes.js'
import { listRouter } from './routes/list.routes.js'
import { requestRouter } from './routes/request.routes.js'
import { questionnaireRouter } from './routes/questionnaire.routes.js'
import { publicQuestionnaireRouter } from './routes/publicQuestionnaire.routes.js'
import { publicVendorRouter } from './routes/publicVendor.routes.js'
import { inboundEmailService } from './services/inboundEmailService.js'

const app = express()
const port = 3001
const dataSource = process.env.DATA_SOURCE ?? 'memory'

app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())
app.use('/api', healthRouter)
app.use('/api/auth', authRouter)
app.use('/api/approvals', approvalRouter)
app.use('/api/questionnaires', publicQuestionnaireRouter)
app.use('/api/vendor', publicVendorRouter)
app.use('/api', requireAuth)
app.use('/api/lists', listRouter)
app.use('/api/dashboard', dashboardRouter)
app.use('/api/requests', requestRouter)
app.use('/api/questionnaires', questionnaireRouter)
app.listen(port, () => {
  console.log(`Server listening on port ${port} (data source: ${dataSource})`)
  inboundEmailService.start()
})
