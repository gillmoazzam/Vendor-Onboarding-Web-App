import type { Request, Response } from 'express'
import { repositories } from '../repositories/index.js'

export async function getDashboard(request: Request, response: Response): Promise<void> {
  const myRequests = await repositories.requests.findByRequester(request.user!.userId)
  const statusCounts = {
    total: myRequests.length,
    pendingApproval: myRequests.filter((item) => item.status === 'Pending Approval').length,
    approved: myRequests.filter((item) => item.status === 'Approved').length,
    processed: myRequests.filter((item) => item.status === 'Processed').length,
  }

  const canManageOperations = request.user!.role === 'Finance Manager' || request.user!.role === 'Administrator'
  if (!canManageOperations) {
    response.json({ myRequests: statusCounts, operations: null })
    return
  }

  const [pendingApprovals, approvedRequests, pendingQuestionnaires, submittedQuestionnaires] = await Promise.all([
    repositories.requests.findByStatus('Pending Approval'),
    repositories.requests.findByStatus('Approved'),
    repositories.requests.findPendingQuestionnaires(),
    repositories.requests.findSubmittedQuestionnaires(),
  ])

  response.json({
    myRequests: statusCounts,
    operations: {
      pendingApprovals: pendingApprovals.length,
      approvedRequests: approvedRequests.length,
      pendingQuestionnaires: pendingQuestionnaires.length,
      submittedQuestionnaires: submittedQuestionnaires.length,
    },
  })
}
