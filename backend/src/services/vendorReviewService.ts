import { repositories } from '../repositories/index.js'
import { emailService } from './emailService.js'

export type ReviewAction = 'approve' | 'reject'

export class VendorReviewError extends Error {
  constructor(message: string, readonly statusCode: number) {
    super(message)
  }
}

export class VendorReviewService {
  async decide(id: string, action: ReviewAction, comments = ''): Promise<{ status: 'Processed' | 'Rejected'; vendorId?: string }> {
    const request = await repositories.requests.findById(id)
    if (!request) throw new VendorReviewError('Vendor request not found', 404)
    if (request.status !== 'Pending Approval') throw new VendorReviewError(`This request has already been ${request.status}`, 409)

    if (action === 'approve') {
      const vendor = await repositories.vendors.create({
        companyName: request.vendorName,
        email: request.contactEmail,
        address: request.vendorAddress,
        contactPerson: request.contactPerson,
      })
      const updated = await repositories.requests.update(id, {
        status: 'Processed',
        approvalDate: new Date().toISOString(),
        createdVendorId: vendor.id,
      })
      if (!updated) throw new VendorReviewError('Vendor request not found', 404)
      return { status: 'Processed', vendorId: vendor.id }
    }

    const rejectionComments = comments.trim()
    if (!rejectionComments) throw new VendorReviewError('Rejection comments are required', 400)

    const updated = await repositories.requests.update(id, { status: 'Rejected', approvalDate: new Date().toISOString(), approverComments: rejectionComments })
    if (!updated) throw new VendorReviewError('Vendor request not found', 404)
    try {
      await emailService.sendRejectionOutcome(updated)
    } catch (error) {
      try {
        await repositories.requests.update(id, { status: 'Pending Approval', approvalDate: null, approverComments: request.approverComments })
      } catch (rollbackError) {
        console.error(`Failed to restore Vendor Request #${id} after rejection email failed:`, rollbackError)
      }
      throw new VendorReviewError(error instanceof Error ? error.message : 'Unable to send the rejection email', 502)
    }
    return { status: 'Rejected' }
  }

  async requestFurtherDetails(id: string, comments: string, reviewerName: string): Promise<void> {
    const trimmedComments = comments.trim()
    if (!trimmedComments) throw new VendorReviewError('Comments are required', 400)

    const request = await repositories.requests.findById(id)
    if (!request) throw new VendorReviewError('Vendor request not found', 404)
    if (request.status !== 'Pending Approval') throw new VendorReviewError(`This request has already been ${request.status}`, 409)

    await emailService.sendAdditionalInformationRequest(request, trimmedComments)
    const communication = `Additional information requested by ${reviewerName} on ${new Date().toISOString()}: ${trimmedComments}`
    const approverComments = request.approverComments ? `${request.approverComments}\n${communication}` : communication
    const updated = await repositories.requests.update(id, { approverComments })
    if (!updated) throw new VendorReviewError('Vendor request not found', 404)
  }
}

export const vendorReviewService = new VendorReviewService()
