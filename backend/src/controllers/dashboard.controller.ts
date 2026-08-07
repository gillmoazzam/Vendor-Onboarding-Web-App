import type { Request, Response } from 'express'
import { repositories } from '../repositories/index.js'

export async function getDashboard(request: Request, response: Response): Promise<void> {
  const canReviewVendors = request.user!.role === 'Finance Manager' || request.user!.role === 'Administrator'
  if (!canReviewVendors) {
    response.json({ vendorRequests: null })
    return
  }

  const vendorRequests = await repositories.requests.findAll()

  response.json({
    vendorRequests: {
      total: vendorRequests.length,
      pendingApproval: vendorRequests.filter((item) => item.status === 'Pending Approval').length,
      approved: vendorRequests.filter((item) => item.status === 'Approved').length,
      rejected: vendorRequests.filter((item) => item.status === 'Rejected').length,
      processed: vendorRequests.filter((item) => item.status === 'Processed').length,
    },
  })
}
