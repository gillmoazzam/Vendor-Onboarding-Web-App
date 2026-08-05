import { Router } from 'express'
import { getApprovalRequest, submitDecision } from '../controllers/approval.controller.js'

export const approvalRouter = Router()

approvalRouter.get('/:id', getApprovalRequest)
approvalRouter.post('/:id/decision', submitDecision)
