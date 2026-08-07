import { createHash } from 'node:crypto'
import { getCACertificates } from 'node:tls'
import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'
import { VendorReplyError, vendorReplyService } from './vendorReplyService.js'

const processedFlag = 'VendorOnboardingProcessed'
const failedFlag = 'VendorOnboardingFailed'

function requiredEnvironment(primary: string, fallback?: string): string {
  const value = process.env[primary]?.trim() || (fallback ? process.env[fallback]?.trim() : '')
  if (!value) throw new Error(`${primary} is required for inbound email processing`)
  return value
}

export class InboundEmailService {
  private timer: NodeJS.Timeout | null = null
  private isPolling = false

  start(): void {
    if (process.env.INBOUND_EMAIL_ENABLED?.trim().toLowerCase() !== 'true') return
    const interval = Number(process.env.INBOUND_EMAIL_POLL_MS ?? 60_000)
    if (!Number.isInteger(interval) || interval < 15_000) throw new Error('INBOUND_EMAIL_POLL_MS must be at least 15000')
    console.log(`Inbound vendor reply processing enabled (poll interval: ${interval}ms)`)
    void this.poll()
    this.timer = setInterval(() => void this.poll(), interval)
    this.timer.unref()
  }

  async poll(): Promise<void> {
    if (this.isPolling) return
    this.isPolling = true
    const client = new ImapFlow({
      host: requiredEnvironment('IMAP_HOST'),
      port: Number(process.env.IMAP_PORT ?? 993),
      secure: true,
      auth: { user: requiredEnvironment('IMAP_USER', 'SMTP_USER'), pass: requiredEnvironment('IMAP_PASS', 'SMTP_PASS') },
      tls: { ca: [...new Set([...getCACertificates('default'), ...getCACertificates('system')])] },
      logger: false,
    })

    try {
      await client.connect()
      const lock = await client.getMailboxLock('INBOX')
      let messages: Awaited<ReturnType<typeof client.fetchAll>> = []
      try {
        const uids = await client.search({
          since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          unKeyword: processedFlag,
          or: [{ subject: 'Vendor Request #' }, { to: '+vendor-request-' }],
        }, { uid: true })
        messages = uids && uids.length > 0
          ? await client.fetchAll(uids.slice(-25), { envelope: true, source: true }, { uid: true })
          : []
      } finally {
        lock.release()
      }

      for (const message of messages) {
        if (!message.source) continue
        try {
          const parsed = await simpleParser(message.source)
          const fallbackMessageId = createHash('sha256').update(message.source).digest('hex')
          const result = await vendorReplyService.process(parsed, fallbackMessageId)
          await client.messageFlagsAdd(message.uid, ['\\Seen', processedFlag], { uid: true })
          console.log(`Processed vendor email reply for request ${result.requestId}${result.duplicate ? ' (duplicate ignored)' : ''}`)
        } catch (error) {
          if (error instanceof VendorReplyError && error.disposition === 'ignore') continue
          console.error(`Failed to process inbound email UID ${message.uid}:`, error)
          if (error instanceof VendorReplyError && error.disposition === 'permanent') {
            await client.messageFlagsAdd(message.uid, ['\\Seen', processedFlag, failedFlag], { uid: true })
          }
        }
      }
    } catch (error) {
      console.error('Inbound vendor email polling failed:', error)
    } finally {
      if (client.usable) await client.logout().catch((error: unknown) => console.error('Inbound mailbox logout failed:', error))
      this.isPolling = false
    }
  }
}

export const inboundEmailService = new InboundEmailService()
