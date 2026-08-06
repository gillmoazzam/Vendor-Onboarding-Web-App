import { Router } from 'express'
import { netsuiteClient } from '../services/netsuiteClient.js'

export const healthRouter = Router()

healthRouter.get('/health', (_request, response) => {
  response.json({ status: 'ok', timestamp: new Date().toISOString() })
})

healthRouter.get('/health/netsuite', async (_request, response) => {
  try {
    await netsuiteClient.verifyConnection()
    response.json({ success: true, authentication: 'OAuth 1.0a' })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    response.status(502).json({ success: false, error: message })
  }
})
