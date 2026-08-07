import type { Request, Response } from 'express'
import { repositories } from '../repositories/index.js'

export async function getRequests(request: Request, response: Response): Promise<void> {
  const requests = await repositories.requests.findAll()
  response.json(requests
    .sort((first, second) => Date.parse(second.requestDate) - Date.parse(first.requestDate))
  )
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

export async function getRequestAttachments(request: Request, response: Response): Promise<void> {
  const id = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id
  const vendorRequest = await repositories.requests.findById(id)
  if (!vendorRequest) {
    response.status(404).json({ message: 'Request not found' })
    return
  }
  response.json(await repositories.attachments.listForRequest(id))
}

export async function downloadRequestAttachment(request: Request, response: Response): Promise<void> {
  const id = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id
  const fileId = Array.isArray(request.params.fileId) ? request.params.fileId[0] : request.params.fileId
  const file = await repositories.attachments.getForRequest(id, fileId)
  if (!file) {
    response.status(404).json({ message: 'Attachment not found' })
    return
  }
  response.setHeader('Content-Type', file.mimeType)
  response.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.fileName)}`)
  response.send(file.content)
}
