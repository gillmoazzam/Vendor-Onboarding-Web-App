import { repositories } from '../repositories/index.js'
import type { VendorRequest } from '../types/domain.js'

export type ApprovalAction = 'approve' | 'reject'

export class ApprovalError extends Error {
  constructor(message: string, readonly statusCode: number) {
    super(message)
  }
}

export class ApprovalService {
  async getRequest(id: string, token: string | undefined): Promise<VendorRequest | { alreadyDecided: true; status: VendorRequest['status'] }> {
    const request = await this.getValidatedRequest(id, token)

    if (request.status !== 'Pending Approval') {
      return { alreadyDecided: true, status: request.status }
    }

    return request
  }

  async decide(id: string, token: string | undefined, action: ApprovalAction, comments: string): Promise<VendorRequest> {
    const request = await this.getValidatedRequest(id, token)

    if (request.status !== 'Pending Approval') {
      throw new ApprovalError(`This request has already been ${request.status}`, 409)
    }

    if (action === 'reject' && !comments.trim()) {
      throw new ApprovalError('A comment is required when rejecting a request', 400)
    }

    const updatedRequest = await repositories.requests.update(id, {
      status: action === 'approve' ? 'Approved' : 'Rejected',
      approverComments: comments.trim(),
      approvalDate: new Date().toISOString(),
    })

    if (!updatedRequest) throw new ApprovalError('Request not found', 404)
    return updatedRequest
  }

  private async getValidatedRequest(id: string, token: string | undefined): Promise<VendorRequest> {
    const request = await repositories.requests.findById(id)

    if (!request) throw new ApprovalError('Request not found', 404)
    if (!token || request.approvalToken !== token) throw new ApprovalError('Invalid approval token', 403)

    return request
  }
}

export const approvalService = new ApprovalService()
