import type { Request, Response } from 'express'
import { repositories } from '../repositories/index.js'
import { emailService } from '../services/emailService.js'
import { GoLiveError, goLiveService } from '../services/goLiveService.js'
import { requestService, type CreateVendorRequestInput } from '../services/requestService.js'

export async function getRequests(request: Request, response: Response): Promise<void> {
  const requests = await repositories.requests.findByRequester(request.user!.userId)
  response.json(requests.sort((first, second) => Date.parse(second.requestDate) - Date.parse(first.requestDate)))
}

export async function getRequestById(request: Request, response: Response): Promise<void> {
  const id = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id
  const vendorRequest = await repositories.requests.findById(id)

  if (!vendorRequest) {
    response.status(404).json({ message: 'Request not found' })
    return
  }

  response.json(vendorRequest)
}

export async function createRequest(request: Request, response: Response): Promise<void> {
  try {
    const createdRequest = await requestService.create(request.body as CreateVendorRequestInput, request.user!)
    void emailService.sendAcknowledgement(createdRequest).catch((error: unknown) => {
      console.error('Failed to send vendor request acknowledgement email:', error)
    })
    void emailService.sendApprovalRequest(createdRequest).catch((error: unknown) => {
      console.error('Failed to send vendor approval request email:', error)
    })
    response.status(200).json({ success: true, id: createdRequest.id, message: 'Vendor request created successfully' })
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid reason') {
      response.status(400).json({ success: false, message: error.message })
      return
    }

    throw error
  }
}

export async function goLive(request: Request, response: Response): Promise<void> {
  const id = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id

  try {
    const result = await goLiveService.goLive(id)
    response.json({ success: true, ...result })
  } catch (error) {
    if (error instanceof GoLiveError) {
      response.status(error.statusCode).json({ success: false, message: error.message })
      return
    }

    response.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Unable to take this vendor live' })
  }
}
