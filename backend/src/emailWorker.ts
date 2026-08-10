import 'dotenv/config'
import { inboundEmailService } from './services/inboundEmailService.js'

const dataSource = process.env.DATA_SOURCE ?? 'memory'

if (dataSource !== 'netsuite') {
  throw new Error('The inbound email worker requires DATA_SOURCE=netsuite')
}

if (!inboundEmailService.start({ keepAlive: true })) {
  throw new Error('The inbound email worker requires INBOUND_EMAIL_ENABLED=true')
}

console.log(`Inbound email worker started (data source: ${dataSource})`)

let shuttingDown = false

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return
  shuttingDown = true
  console.log(`Inbound email worker received ${signal}; waiting for the active mailbox poll to finish`)
  await inboundEmailService.stop()
  console.log('Inbound email worker stopped')
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    void shutdown(signal).catch((error: unknown) => {
      console.error('Inbound email worker shutdown failed:', error)
      process.exitCode = 1
    })
  })
}

process.on('uncaughtException', (error) => {
  console.error('Inbound email worker uncaught exception:', error)
  void inboundEmailService.stop().finally(() => {
    process.exitCode = 1
  })
})

process.on('unhandledRejection', (error) => {
  console.error('Inbound email worker unhandled rejection:', error)
  void inboundEmailService.stop().finally(() => {
    process.exitCode = 1
  })
})
