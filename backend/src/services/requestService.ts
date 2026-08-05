import { randomBytes } from 'node:crypto'
import { repositories } from '../repositories/index.js'
import type { VendorRequest } from '../types/domain.js'

export type CreateVendorRequestInput = {
  vendorName: string
  vendorAddress: string
  contactPerson: string
  contactEmail: string
  reasonId: string
  reasonOther: string
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
      answers: { q1: '', q2: '', q3: '', q4: '', q5: '' },
    })
  }
}

export const requestService = new RequestService()
