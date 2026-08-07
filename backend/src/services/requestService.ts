import { randomBytes } from 'node:crypto'
import { repositories } from '../repositories/index.js'
import type { NewAttachment } from '../repositories/interfaces.js'
import type { QuestionnaireAnswers, VendorRequest } from '../types/domain.js'

export type CreateVendorRequestInput = {
  vendorName: string
  vendorAddress: string
  contactPerson: string
  contactEmail: string
  reasonId: string
  reasonOther: string
}

export type CreatePublicVendorRequestInput = CreateVendorRequestInput & {
  answers: QuestionnaireAnswers
}

export class RequestService {
  async create(input: CreateVendorRequestInput, requester: NonNullable<Express.Request['user']>): Promise<VendorRequest> {
    const reasons = await repositories.lookups.getReasons()
    const reason = reasons.find((item) => item.id === input.reasonId)

    if (!reason) throw new Error('Invalid reason')

    return repositories.requests.create({
      vendorName: input.vendorName,
      vendorAddress: input.vendorAddress,
      contactPerson: input.contactPerson,
      contactEmail: input.contactEmail,
      reasonId: reason.id,
      reasonLabel: reason.label,
      reasonOther: input.reasonOther,
      requesterId: requester.userId,
      requesterName: requester.name,
      requesterEmail: requester.email,
      requestDate: new Date().toISOString(),
      status: 'Pending Approval',
      approverComments: '',
      approvalDate: null,
      approvalToken: randomBytes(16).toString('hex'),
      createdVendorId: null,
      questionnaireStatus: 'Not Started',
      questionnaireToken: null,
      questionnaireSentDate: null,
      questionnaireSubmittedDate: null,
      questionnaireApprovedBy: null,
      vendorComments: '',
      answers: { q1: '', q2: '', q3: '', q4: '', q5: '' },
    })
  }

  async createPublic(input: CreatePublicVendorRequestInput, attachments: NewAttachment[] = []): Promise<VendorRequest> {
    const reasons = await repositories.lookups.getReasons()
    const reason = reasons.find((item) => item.id === input.reasonId)

    if (!reason) throw new Error('Invalid reason')
    if (reason.label.trim() === 'Other' && !input.reasonOther.trim()) throw new Error('Please explain the reason')

    const submittedAt = new Date().toISOString()
    const request = await repositories.requests.create({
      vendorName: input.vendorName,
      vendorAddress: input.vendorAddress,
      contactPerson: input.contactPerson,
      contactEmail: input.contactEmail,
      reasonId: reason.id,
      reasonLabel: reason.label.trim(),
      reasonOther: input.reasonOther,
      requesterId: '',
      requesterName: input.contactPerson,
      requesterEmail: input.contactEmail,
      requestDate: submittedAt,
      status: 'Pending Approval',
      approverComments: '',
      approvalDate: null,
      approvalToken: randomBytes(16).toString('hex'),
      createdVendorId: null,
      questionnaireStatus: 'Submitted',
      questionnaireToken: null,
      questionnaireSentDate: null,
      questionnaireSubmittedDate: submittedAt,
      questionnaireApprovedBy: null,
      vendorComments: '',
      answers: input.answers,
    })

    if (attachments.length > 0) {
      try {
        await repositories.attachments.uploadForRequest(request.id, attachments)
      } catch (error) {
        try {
          await repositories.requests.delete(request.id)
        } catch (cleanupError) {
          console.error(`Failed to roll back vendor registration ${request.id}:`, cleanupError)
        }
        throw error
      }
    }
    return request
  }
}

export const requestService = new RequestService()
