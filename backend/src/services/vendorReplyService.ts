import type { ParsedMail } from 'mailparser'
import { repositories } from '../repositories/index.js'
import type { NewAttachment } from '../repositories/interfaces.js'
import { emailService } from './emailService.js'

const maximumAttachmentSize = 10 * 1024 * 1024
const maximumAttachments = 10
const mimeTypes: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}

export class VendorReplyError extends Error {
  constructor(message: string, readonly disposition: 'ignore' | 'permanent' | 'retry' = 'retry') {
    super(message)
  }
}

function addresses(value: ParsedMail['to']): string[] {
  const groups = value ? (Array.isArray(value) ? value : [value]) : []
  return groups.flatMap((group) => group.value.map((entry) => entry.address?.toLowerCase()).filter((address): address is string => Boolean(address)))
}

function requestIdFromEmail(email: ParsedMail): string | null {
  const recipientMatch = addresses(email.to).join(' ').match(/\+vendor-request-(\d+)@/i)
  const subjectMatch = email.subject?.match(/\[Vendor Request #(\d+)\]/i)
  const bodyMatch = email.text?.match(/Request (?:Number\s*:|#)\s*#?(\d+)/i)
  return recipientMatch?.[1] ?? subjectMatch?.[1] ?? bodyMatch?.[1] ?? null
}

function textFromHtml(html: string): string {
  return html
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>|<\/p>|<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
}

function extractReplyText(email: ParsedMail): string {
  const rawText = email.text?.trim() || (typeof email.html === 'string' ? textFromHtml(email.html).trim() : '')
  if (!rawText) return ''
  const separators = [
    /^On .+wrote:\s*$/im,
    /^-{2,}\s*Original Message\s*-{2,}\s*$/im,
    /^From:\s.+$/im,
  ]
  const cutAt = separators.map((pattern) => rawText.search(pattern)).filter((index) => index > 0).sort((left, right) => left - right)[0]
  return (cutAt === undefined ? rawText : rawText.slice(0, cutAt)).trim()
}

function parseAttachments(email: ParsedMail): NewAttachment[] {
  const attachments = email.attachments.filter((attachment) => attachment.contentDisposition !== 'inline' && attachment.filename)
  if (attachments.length > maximumAttachments) throw new VendorReplyError('Vendor reply contains more than 10 attachments', 'permanent')

  return attachments.map((attachment) => {
    const fileName = attachment.filename!.trim()
    const extension = fileName.toLowerCase().split('.').pop() ?? ''
    const mimeType = mimeTypes[extension]
    if (!mimeType) throw new VendorReplyError(`Unsupported vendor reply attachment: ${fileName}`, 'permanent')
    if (attachment.content.length > maximumAttachmentSize) throw new VendorReplyError(`Vendor reply attachment exceeds 10 MB: ${fileName}`, 'permanent')
    return { fileName, mimeType, content: attachment.content }
  })
}

export class VendorReplyService {
  async process(email: ParsedMail, fallbackMessageId: string): Promise<{ requestId: string; duplicate: boolean }> {
    const requestId = requestIdFromEmail(email)
    if (!requestId) throw new VendorReplyError('Email does not contain a Vendor Request reference', 'ignore')

    const request = await repositories.requests.findById(requestId)
    if (!request) throw new VendorReplyError(`Vendor Request #${requestId} was not found`, 'permanent')

    const sender = email.from?.value[0]?.address?.trim().toLowerCase()
    if (!sender || sender !== request.contactEmail.trim().toLowerCase()) {
      throw new VendorReplyError(`Reply sender does not match Vendor Request #${requestId}`, 'permanent')
    }

    const messageId = (email.messageId?.trim() || fallbackMessageId).replace(/[\r\n]/g, '')
    const emailMarker = `Email reference: ${messageId}`
    const notificationMarker = `Reviewer notification sent for: ${messageId}`
    let currentRequest = request
    let duplicate = request.vendorComments.includes(emailMarker)

    if (!duplicate) {
      const replyText = extractReplyText(email)
      if (!replyText) throw new VendorReplyError(`Vendor reply for Request #${requestId} did not contain comments`, 'permanent')
      const attachments = parseAttachments(email)
      const stored = attachments.length > 0 ? await repositories.attachments.uploadForRequest(requestId, attachments) : []
      const entry = [
        '--- Vendor Email Reply ---',
        `Received: ${(email.date ?? new Date()).toISOString()}`,
        `From: ${sender}`,
        emailMarker,
        `Attachments: ${stored.length > 0 ? stored.map((file) => file.fileName).join(', ') : 'None'}`,
        '',
        replyText,
      ].join('\n')
      const vendorComments = request.vendorComments ? `${request.vendorComments}\n\n${entry}` : entry
      try {
        const updated = await repositories.requests.update(requestId, { vendorComments })
        if (!updated) throw new Error(`Vendor Request #${requestId} was not found during update`)
        currentRequest = updated
      } catch (error) {
        if (stored.length > 0) {
          try {
            await repositories.attachments.deleteAttachments(stored.map((file) => file.id))
          } catch (cleanupError) {
            console.error(`Failed to clean up attachments for Vendor Request #${requestId}:`, cleanupError)
          }
        }
        throw error
      }
    }

    if (!currentRequest.vendorComments.includes(notificationMarker)) {
      await emailService.sendVendorReplyNotification(currentRequest)
      const vendorComments = `${currentRequest.vendorComments}\n${notificationMarker}`
      const updated = await repositories.requests.update(requestId, { vendorComments })
      if (!updated) throw new Error(`Vendor Request #${requestId} was not found while recording reviewer notification`)
      currentRequest = updated
    }

    return { requestId, duplicate }
  }
}

export const vendorReplyService = new VendorReplyService()
