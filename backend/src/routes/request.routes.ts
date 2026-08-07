import { Router } from 'express'
import { downloadRequestAttachment, createRequest, getRequestAttachments, getRequestById, getRequests, goLive } from '../controllers/request.controller.js'
import { requestFurtherDetails, submitInternalDecision } from '../controllers/vendorReview.controller.js'
import { requireRole } from '../middleware/requireRole.js'

export const requestRouter = Router()

requestRouter.post('/', createRequest)
requestRouter.get('/', requireRole('Finance Manager', 'Administrator'), getRequests)
requestRouter.get('/:id/attachments', requireRole('Finance Manager', 'Administrator'), getRequestAttachments)
requestRouter.get('/:id/attachments/:fileId', requireRole('Finance Manager', 'Administrator'), downloadRequestAttachment)
requestRouter.post('/:id/decision', requireRole('Finance Manager', 'Administrator'), submitInternalDecision)
requestRouter.post('/:id/further-details', requireRole('Finance Manager', 'Administrator'), requestFurtherDetails)
requestRouter.get('/:id', requireRole('Finance Manager', 'Administrator'), getRequestById)
requestRouter.post('/:id/golive', goLive)
