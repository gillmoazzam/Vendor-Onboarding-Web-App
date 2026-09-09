import { Router } from 'express'
import { downloadRequestAttachment, getRequestAttachments, getRequestById, getRequests, syncRequestAttachments } from '../controllers/request.controller.js'
import { requestFurtherDetails, submitInternalDecision } from '../controllers/vendorReview.controller.js'
import { requireRole } from '../middleware/requireRole.js'

export const requestRouter = Router()

requestRouter.get('/', requireRole('Finance Manager', 'Administrator'), getRequests)
requestRouter.get('/:id/attachments', requireRole('Finance Manager', 'Administrator'), getRequestAttachments)
requestRouter.post('/:id/attachments/sync', requireRole('Administrator'), syncRequestAttachments)
requestRouter.get('/:id/attachments/:fileId', requireRole('Finance Manager', 'Administrator'), downloadRequestAttachment)
requestRouter.post('/:id/decision', requireRole('Finance Manager', 'Administrator'), submitInternalDecision)
requestRouter.post('/:id/further-details', requireRole('Finance Manager', 'Administrator'), requestFurtherDetails)
requestRouter.get('/:id', requireRole('Finance Manager', 'Administrator'), getRequestById)
