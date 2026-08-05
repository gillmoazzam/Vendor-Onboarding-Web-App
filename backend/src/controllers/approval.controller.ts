import type { Request, Response } from 'express'
import { approvalService, type ApprovalAction, ApprovalError } from '../services/approvalService.js'
import { emailService } from '../services/emailService.js'

function firstValue(value: unknown): string | undefined {
  if (typeof value === 'string') return value
  return Array.isArray(value) && typeof value[0] === 'string' ? value[0] : undefined
}

function handleApprovalError(error: unknown, response: Response): boolean {
  if (!(error instanceof ApprovalError)) return false
  response.status(error.statusCode).json({ message: error.message })
  return true
}

export async function getApprovalRequest(request: Request, response: Response): Promise<void> {
  try {
    const result = await approvalService.getRequest(firstValue(request.params.id)!, firstValue(request.query.token))
    response.json(result)
  } catch (error) {
    if (!handleApprovalError(error, response)) throw error
  }
}

export async function submitDecision(request: Request, response: Response): Promise<void> {
  const { token, action, comments } = request.body as { token?: string; action?: ApprovalAction; comments?: string }

  if (action !== 'approve' && action !== 'reject') {
    response.status(400).json({ message: 'Action must be approve or reject' })
    return
  }

  try {
    const updatedRequest = await approvalService.decide(firstValue(request.params.id)!, token, action, comments ?? '')
    void emailService.sendDecisionOutcome(updatedRequest).catch((error: unknown) => {
      console.error('Failed to send vendor decision outcome email:', error)
    })
    response.json({ success: true, status: updatedRequest.status })
  } catch (error) {
    if (!handleApprovalError(error, response)) throw error
  }
}
