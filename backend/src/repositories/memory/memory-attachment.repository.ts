import type { AttachmentFile, IAttachmentRepository, NewAttachment, StoredAttachment } from '../interfaces.js'

export class MemoryAttachmentRepository implements IAttachmentRepository {
  private readonly attachments = new Map<string, AttachmentFile[]>()
  private nextId = 1

  async uploadForRequest(requestId: string, attachments: NewAttachment[]): Promise<StoredAttachment[]> {
    const stored = attachments.map((attachment) => ({ id: String(this.nextId++), ...attachment }))
    this.attachments.set(requestId, [...(this.attachments.get(requestId) ?? []), ...stored])
    return stored
  }

  async listForRequest(requestId: string): Promise<StoredAttachment[]> {
    return (this.attachments.get(requestId) ?? []).map(({ id, fileName, mimeType }) => ({ id, fileName, mimeType }))
  }

  async getForRequest(requestId: string, attachmentId: string): Promise<AttachmentFile | null> {
    return this.attachments.get(requestId)?.find((attachment) => attachment.id === attachmentId) ?? null
  }

  async deleteAttachments(attachmentIds: string[]): Promise<void> {
    const ids = new Set(attachmentIds)
    for (const [requestId, attachments] of this.attachments) {
      this.attachments.set(requestId, attachments.filter((attachment) => !ids.has(attachment.id)))
    }
  }
}
