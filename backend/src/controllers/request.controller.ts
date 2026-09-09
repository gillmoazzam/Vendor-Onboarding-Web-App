import type { Request, Response } from 'express'
import { repositories } from '../repositories/index.js'
import { netsuiteAttachmentRestlet } from '../services/netsuiteAttachmentRestlet.js'

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

export async function syncRequestAttachments(request: Request, response: Response): Promise<void> {
  const id = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id
  const vendorRequest = await repositories.requests.findById(id)
  if (!vendorRequest) {
    response.status(404).json({ message: 'Request not found' })
    return
  }

  try {
    const attachments = await repositories.attachments.listForRequest(id)
    if (attachments.length === 0) {
      response.status(400).json({ message: 'No File Cabinet attachments were found for this request' })
      return
    }

    await netsuiteAttachmentRestlet.attachFiles(id, attachments.map((attachment) => attachment.id))
    response.json({ success: true, requestId: id, attachedFileIds: attachments.map((attachment) => attachment.id) })
  } catch (error) {
    console.error(`Unable to sync attachments for Vendor Request #${id}:`, error)
    response.status(502).json({ message: error instanceof Error ? error.message : 'Unable to sync attachments to NetSuite' })
  }
}
