import type { Request, Response } from 'express'
import { emailService } from '../services/emailService.js'
import { captchaService } from '../services/captchaService.js'
import { requestService, type CreatePublicVendorRequestInput } from '../services/requestService.js'

const requiredFields: Array<keyof Omit<CreatePublicVendorRequestInput, 'answers'>> = [
  'vendorName',
  'vendorAddress',
  'contactPerson',
  'contactEmail',
  'reasonId',
]

function isComplete(input: unknown): input is CreatePublicVendorRequestInput {
  if (!input || typeof input !== 'object') return false

  const candidate = input as Partial<CreatePublicVendorRequestInput>
  const hasFields = requiredFields.every((field) => typeof candidate[field] === 'string' && candidate[field].trim().length > 0)
  const hasAnswers = candidate.answers && ['q1', 'q2', 'q3', 'q4', 'q5'].every((key) => {
    const answer = candidate.answers?.[key as keyof typeof candidate.answers]
    return typeof answer === 'string'
  })

  return Boolean(hasFields && hasAnswers && typeof candidate.contactEmail === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate.contactEmail))
}

function parseInput(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body
  const candidate = body as Record<string, unknown>
  if (typeof candidate.answers !== 'string') return candidate

  try {
    return { ...candidate, answers: JSON.parse(candidate.answers) as unknown }
  } catch {
    return candidate
  }
}

export async function createPublicVendorRequest(request: Request, response: Response): Promise<void> {
  const input = parseInput(request.body)
  if (!isComplete(input)) {
    response.status(400).json({ success: false, message: 'Complete all required registration fields' })
    return
  }

  const captchaVerificationToken = typeof request.body?.captchaVerificationToken === 'string' ? request.body.captchaVerificationToken : ''
  if (!captchaService.consumeVerification(captchaVerificationToken)) {
    response.status(400).json({ success: false, code: 'CAPTCHA_FAILED', message: 'Complete the security check again before submitting.' })
    return
  }

  try {
    const uploadedFiles = Array.isArray(request.files) ? request.files : []
    const attachments = uploadedFiles.map((file) => ({ fileName: file.originalname, mimeType: file.mimetype, content: file.buffer }))
    const createdRequest = await requestService.createPublic(input, attachments)
    void emailService.sendAcknowledgement(createdRequest).catch((error: unknown) => {
      console.error('Failed to send public vendor acknowledgement email:', error)
    })
    void emailService.sendApprovalRequest(createdRequest).catch((error: unknown) => {
      console.error('Failed to send public vendor approval request email:', error)
    })
    response.status(200).json({ success: true, id: createdRequest.id, attachmentCount: attachments.length, message: 'Vendor registration submitted successfully' })
  } catch (error) {
    if (error instanceof Error && (error.message === 'Invalid reason' || error.message === 'Please explain the reason')) {
      response.status(400).json({ success: false, message: error.message })
      return
    }

    console.error('Public vendor registration failed:', error)
    response.status(502).json({ success: false, message: 'We could not complete your registration right now. Your information was not submitted. Please try again.' })
  }
}

export function createCaptchaChallenge(_request: Request, response: Response): void {
  try {
    response.json(captchaService.createChallenge())
  } catch (error) {
    console.error('Unable to create vendor security challenge:', error)
    response.status(500).json({ message: 'The security check is temporarily unavailable. Please refresh and try again.' })
  }
}

export function verifyCaptchaChallenge(request: Request, response: Response): void {
  const token = typeof request.body?.token === 'string' ? request.body.token : ''
  const answer = typeof request.body?.answer === 'string' ? request.body.answer : ''
  const verificationToken = captchaService.verifyChallenge(token, answer)
  if (!verificationToken) {
    response.status(400).json({ code: 'CAPTCHA_FAILED', message: 'That answer was incorrect or the question expired. Please try the new question.' })
    return
  }
  response.json({ verificationToken })
}
