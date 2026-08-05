import { Router } from 'express'
import { createRequest, getRequestById, getRequests, goLive } from '../controllers/request.controller.js'

export const requestRouter = Router()

requestRouter.post('/', createRequest)
requestRouter.get('/', getRequests)
requestRouter.get('/:id', getRequestById)
requestRouter.post('/:id/golive', goLive)
