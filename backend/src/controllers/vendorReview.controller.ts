import type { Request, Response } from 'express'
import { VendorReviewError, vendorReviewService, type ReviewAction } from '../services/vendorReviewService.js'

function requestId(request: Request): string {
  return Array.isArray(request.params.id) ? request.params.id[0] : request.params.id
}

function handleReviewError(error: unknown, response: Response): void {
  if (error instanceof VendorReviewError) {
    response.status(error.statusCode).json({ success: false, message: error.message })
    return
  }
  console.error('Internal vendor review failed:', error)
  response.status(502).json({ success: false, message: 'We could not update this vendor request. Please try again.' })
}

export async function submitInternalDecision(request: Request, response: Response): Promise<void> {
  const action = request.body?.action as ReviewAction | undefined
  if (action !== 'approve' && action !== 'reject') {
    response.status(400).json({ success: false, message: 'Choose Approve or Reject' })
    return
  }
  try {
    const comments = typeof request.body?.comments === 'string' ? request.body.comments : ''
    const result = await vendorReviewService.decide(requestId(request), action, comments)
    response.json({ success: true, ...result })
  } catch (error) {
    handleReviewError(error, response)
  }
}

export async function requestFurtherDetails(request: Request, response: Response): Promise<void> {
  const comments = typeof request.body?.comments === 'string' ? request.body.comments : ''
  try {
    await vendorReviewService.requestFurtherDetails(requestId(request), comments, request.user!.name)
    response.json({ success: true, message: 'Additional information request sent successfully' })
  } catch (error) {
    handleReviewError(error, response)
  }
}
