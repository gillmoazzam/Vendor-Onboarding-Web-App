import nodemailer from 'nodemailer'
import type { VendorRequest } from '../types/domain.js'

type EmailConfiguration = {
  smtpHost: string
  smtpPort: number
  smtpUser: string
  smtpPass: string
  mailFrom: string
  approverEmail: string
  appBaseUrl: string
}

function getConfiguration(): EmailConfiguration {
  const values = {
    smtpHost: process.env.SMTP_HOST,
    smtpPort: process.env.SMTP_PORT,
    smtpUser: process.env.SMTP_USER,
    smtpPass: process.env.SMTP_PASS,
    mailFrom: process.env.MAIL_FROM,
    approverEmail: process.env.APPROVER_EMAIL,
  }
  const missing = Object.entries(values).filter(([, value]) => !value).map(([key]) => key)

  if (missing.length > 0) throw new Error(`Email configuration is incomplete: ${missing.join(', ')}`)

  const smtpPort = Number(values.smtpPort)
  if (!Number.isInteger(smtpPort) || smtpPort <= 0) throw new Error('SMTP_PORT must be a positive integer')

  return {
    smtpHost: values.smtpHost!,
    smtpPort,
    smtpUser: values.smtpUser!,
    smtpPass: values.smtpPass!,
    mailFrom: values.mailFrom!,
    approverEmail: values.approverEmail!,
    appBaseUrl: (process.env.APP_BASE_URL ?? 'http://localhost:5173').replace(/\/$/, ''),
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]!)
}

function emailLayout(title: string, body: string): string {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:24px 12px;"><tr><td align="center">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-collapse:separate;border-spacing:0;">
      <tr><td style="background:#E8272C;padding:24px 32px;color:#ffffff;font-size:24px;font-weight:bold;">Folio3</td></tr>
      <tr><td style="padding:32px;"><h1 style="margin:0 0 20px;font-size:22px;color:#111827;">${escapeHtml(title)}</h1>${body}</td></tr>
    </table>
  </td></tr></table>
</body></html>`
}

function detailsTable(request: VendorRequest): string {
  const rows: Array<[string, string]> = [
    ['Vendor Legal Name', request.vendorName],
    ['Vendor Legal Address', request.vendorAddress],
    ['Contact Person', request.contactPerson],
    ['Contact Email', request.contactEmail],
    ['Reason for Consideration', request.reasonLabel],
    ['Please explain', request.reasonOther || 'Not provided'],
    ['Requester Name', request.requesterName],
    ['Requester Email', request.requesterEmail],
  ]

  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin:20px 0;">${rows.map(([label, value]) => `<tr><td style="width:42%;padding:10px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:bold;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:10px;border:1px solid #e5e7eb;vertical-align:top;">${escapeHtml(value)}</td></tr>`).join('')}</table>`
}

function requestReplyAddress(mailbox: string, requestId: string): string {
  const atIndex = mailbox.lastIndexOf('@')
  if (atIndex <= 0) return mailbox
  return `${mailbox.slice(0, atIndex)}+vendor-request-${requestId}${mailbox.slice(atIndex)}`
}

export class EmailService {
  async sendAcknowledgement(request: VendorRequest): Promise<void> {
    const configuration = getConfiguration()
    const transporter = nodemailer.createTransport({
      host: configuration.smtpHost,
      port: configuration.smtpPort,
      secure: configuration.smtpPort === 465,
      auth: { user: configuration.smtpUser, pass: configuration.smtpPass },
    })
    const html = emailLayout(
      'Vendor Request Received',
      `<p style="margin:0;font-size:16px;line-height:1.5;">Your request for <strong>${escapeHtml(request.vendorName)}</strong> has been received and is awaiting approval.</p>`,
    )

    await transporter.sendMail({ from: configuration.mailFrom, to: request.requesterEmail, subject: `Vendor Request Received - ${request.vendorName}`, html })
  }

  async sendApprovalRequest(request: VendorRequest): Promise<void> {
    const configuration = getConfiguration()
    const transporter = nodemailer.createTransport({
      host: configuration.smtpHost,
      port: configuration.smtpPort,
      secure: configuration.smtpPort === 465,
      auth: { user: configuration.smtpUser, pass: configuration.smtpPass },
    })
    const requestUrl = `${configuration.appBaseUrl}/requests/${encodeURIComponent(request.id)}`
    const html = emailLayout(
      `New Vendor Request #${request.id}`,
      `<p style="margin:0;font-size:16px;line-height:1.5;">A new Vendor Registration Request has been received and is awaiting review.</p>${detailsTable(request)}<table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:28px;"><tr><td style="background:#1F3864;"><a href="${requestUrl}" style="display:inline-block;padding:16px 28px;color:#ffffff;text-decoration:none;font-size:16px;font-weight:bold;">VIEW IN VENDOR ONBOARDING PORTAL</a></td></tr></table>`,
    )

    await transporter.sendMail({ from: configuration.mailFrom, to: configuration.approverEmail, subject: `New Vendor Request - ${request.vendorName} - Request #${request.id}`, html })
  }

  async sendAdditionalInformationRequest(request: VendorRequest, comments: string): Promise<void> {
    const configuration = getConfiguration()
    const transporter = nodemailer.createTransport({
      host: configuration.smtpHost,
      port: configuration.smtpPort,
      secure: configuration.smtpPort === 465,
      auth: { user: configuration.smtpUser, pass: configuration.smtpPass },
    })
    const html = emailLayout(
      'Additional Information Required',
      `<p style="margin:0 0 18px;font-size:16px;line-height:1.6;">Thank you for submitting your vendor registration for <strong>${escapeHtml(request.vendorName)}</strong>. Our vendor management team requires additional information before the onboarding review can continue.</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin:20px 0;"><tr><td style="width:38%;padding:10px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:bold;">Request Number</td><td style="padding:10px;border:1px solid #e5e7eb;">${escapeHtml(request.id)}</td></tr><tr><td style="padding:10px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:bold;vertical-align:top;">Information Required</td><td style="padding:10px;border:1px solid #e5e7eb;white-space:pre-wrap;">${escapeHtml(comments)}</td></tr></table><p style="margin:18px 0 0;font-size:16px;line-height:1.6;">Please reply to this email with the requested information so our team can continue reviewing your application.</p>`,
    )
    await transporter.sendMail({
      from: configuration.mailFrom,
      to: request.contactEmail,
      replyTo: requestReplyAddress(configuration.smtpUser, request.id),
      subject: `[Vendor Request #${request.id}] Additional Information Required – Vendor Registration`,
      html,
    })
  }

  async sendVendorReplyNotification(request: VendorRequest): Promise<void> {
    const configuration = getConfiguration()
    const transporter = nodemailer.createTransport({
      host: configuration.smtpHost,
      port: configuration.smtpPort,
      secure: configuration.smtpPort === 465,
      auth: { user: configuration.smtpUser, pass: configuration.smtpPass },
    })
    const requestUrl = `${configuration.appBaseUrl}/requests/${encodeURIComponent(request.id)}`
    const html = emailLayout(
      'Additional Vendor Information Received',
      `<p style="margin:0 0 18px;font-size:16px;line-height:1.6;">Additional information has been received from <strong>${escapeHtml(request.vendorName)}</strong> for Vendor Registration Request <strong>#${escapeHtml(request.id)}</strong>.</p><p style="margin:0 0 24px;font-size:16px;line-height:1.6;">The registration record has been updated with the vendor's comments and any supported attachments.</p><table role="presentation" cellspacing="0" cellpadding="0"><tr><td style="background:#1F3864;"><a href="${requestUrl}" style="display:inline-block;padding:16px 28px;color:#ffffff;text-decoration:none;font-size:16px;font-weight:bold;">REVIEW UPDATED REQUEST</a></td></tr></table>`,
    )
    await transporter.sendMail({ from: configuration.mailFrom, to: configuration.approverEmail, subject: `Additional Vendor Information Received - Request #${request.id}`, html })
  }

  async sendDecisionOutcome(request: VendorRequest): Promise<void> {
    const configuration = getConfiguration()
    const transporter = nodemailer.createTransport({
      host: configuration.smtpHost,
      port: configuration.smtpPort,
      secure: configuration.smtpPort === 465,
      auth: { user: configuration.smtpUser, pass: configuration.smtpPass },
    })
    const html = emailLayout(
      `Vendor Request ${request.status}`,
      `<p style="margin:0 0 16px;font-size:16px;line-height:1.5;">Your request for <strong>${escapeHtml(request.vendorName)}</strong> was <strong>${escapeHtml(request.status)}</strong>.</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;"><tr><td style="padding:10px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:bold;">Approver Comment</td><td style="padding:10px;border:1px solid #e5e7eb;">${escapeHtml(request.approverComments)}</td></tr></table>`,
    )

    await transporter.sendMail({ from: configuration.mailFrom, to: request.requesterEmail, subject: `Vendor Request ${request.status} - ${request.vendorName}`, html })
  }

  async sendRejectionOutcome(request: VendorRequest): Promise<void> {
    const configuration = getConfiguration()
    const transporter = nodemailer.createTransport({
      host: configuration.smtpHost,
      port: configuration.smtpPort,
      secure: configuration.smtpPort === 465,
      auth: { user: configuration.smtpUser, pass: configuration.smtpPass },
    })
    const html = emailLayout(
      'Vendor Registration Update',
      `<p style="margin:0 0 18px;font-size:16px;line-height:1.6;">Thank you for submitting the vendor registration application for <strong>${escapeHtml(request.vendorName)}</strong>.</p><p style="margin:0 0 18px;font-size:16px;line-height:1.6;">Our vendor management team has carefully reviewed the application. Unfortunately, we are unable to proceed with the registration at this time.</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin:20px 0;"><tr><td style="width:38%;padding:10px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:bold;">Request Number</td><td style="padding:10px;border:1px solid #e5e7eb;">#${escapeHtml(request.id)}</td></tr><tr><td style="padding:10px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:bold;vertical-align:top;">Reason</td><td style="padding:10px;border:1px solid #e5e7eb;white-space:pre-wrap;">${escapeHtml(request.approverComments)}</td></tr></table><p style="margin:0;font-size:16px;line-height:1.6;">You are welcome to submit a new vendor registration request at a later date.</p>`,
    )

    await transporter.sendMail({ from: configuration.mailFrom, to: request.requesterEmail, subject: `Vendor Registration Update - ${request.vendorName}`, html })
  }

  async sendQuestionnaire(request: VendorRequest): Promise<void> {
    const configuration = getConfiguration()
    const transporter = nodemailer.createTransport({
      host: configuration.smtpHost,
      port: configuration.smtpPort,
      secure: configuration.smtpPort === 465,
      auth: { user: configuration.smtpUser, pass: configuration.smtpPass },
    })
    const questionnaireUrl = `${configuration.appBaseUrl}/questionnaire/${encodeURIComponent(request.id)}?token=${encodeURIComponent(request.questionnaireToken ?? '')}`
    const html = emailLayout(
      'Action Required: Vendor Questionnaire',
      `<p style="margin:0 0 20px;font-size:16px;line-height:1.5;">Please complete the vendor questionnaire for <strong>${escapeHtml(request.vendorName)}</strong>.</p><table role="presentation" cellspacing="0" cellpadding="0"><tr><td style="background:#E8272C;"><a href="${questionnaireUrl}" style="display:inline-block;padding:16px 28px;color:#ffffff;text-decoration:none;font-size:16px;font-weight:bold;">COMPLETE QUESTIONNAIRE</a></td></tr></table>`,
    )

    await transporter.sendMail({ from: configuration.mailFrom, to: request.contactEmail, subject: `Action Required - Vendor Questionnaire - ${request.vendorName}`, html })
  }
}

export const emailService = new EmailService()
