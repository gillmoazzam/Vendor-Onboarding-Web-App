import { netsuiteAttachmentRestlet } from '../../services/netsuiteAttachmentRestlet.js'
import { netsuiteClient } from '../../services/netsuiteClient.js'
import type { AttachmentFile, IAttachmentRepository, NewAttachment, StoredAttachment } from '../interfaces.js'
import { deleteNetSuiteFile, getNetSuiteFile, uploadNetSuiteFile, type NetSuiteFileType } from './netsuite-soap.client.js'

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is required for the NetSuite connection`)
  return value
}

function getFileType(fileName: string): NetSuiteFileType {
  const extension = fileName.toLowerCase().split('.').pop()
  if (extension === 'pdf') return '_PDF'
  if (extension === 'doc' || extension === 'docx') return '_WORD'
  if (extension === 'xls' || extension === 'xlsx') return '_EXCEL'
  throw new Error(`Unsupported attachment type: ${fileName}`)
}

function safeFileName(requestId: string, fileName: string): string {
  const sanitized = fileName.replace(/[^a-zA-Z0-9._() -]/g, '_')
  return `vendor-request-${requestId}-${sanitized}`
}

function escapeSuiteQlLiteral(value: string): string {
  return value.replace(/'/g, "''")
}

function mimeTypeFor(fileName: string): string {
  const extension = fileName.toLowerCase().split('.').pop()
  if (extension === 'pdf') return 'application/pdf'
  if (extension === 'doc') return 'application/msword'
  if (extension === 'docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  if (extension === 'xls') return 'application/vnd.ms-excel'
  if (extension === 'xlsx') return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  return 'application/octet-stream'
}

type FileQueryResponse = { items?: Array<{ id?: string | number; name?: string }> }

export class NetSuiteAttachmentRepository implements IAttachmentRepository {
  async uploadForRequest(requestId: string, attachments: NewAttachment[]): Promise<StoredAttachment[]> {
    const folderId = requiredEnvironment('NS_VENDOR_ATTACHMENT_FOLDER')
    const stored: StoredAttachment[] = []

    try {
      for (const attachment of attachments) {
        const fileName = safeFileName(requestId, attachment.fileName)
        const id = await uploadNetSuiteFile({ fileName, fileType: getFileType(attachment.fileName), folderId, content: attachment.content })
        stored.push({ id, fileName, mimeType: attachment.mimeType })
      }

      const attached = await netsuiteAttachmentRestlet.attachFiles(requestId, stored.map((file) => file.id))
      if (!attached) {
        console.warn(`Stored ${stored.length} file(s) for Vendor Request #${requestId}, but the NetSuite attachment RESTlet is not configured`)
      }
    } catch (error) {
      const cleanupResults = await Promise.allSettled(stored.map((file) => deleteNetSuiteFile(file.id)))
      for (const result of cleanupResults) {
        if (result.status === 'rejected') console.error('Failed to clean up a NetSuite file after attachment failure:', result.reason)
      }
      throw error
    }

    return stored
  }

  async listForRequest(requestId: string): Promise<StoredAttachment[]> {
    const folderId = requiredEnvironment('NS_VENDOR_ATTACHMENT_FOLDER')
    const prefix = `vendor-request-${requestId}-`
    const response = await netsuiteClient.suiteql<FileQueryResponse>(`
      SELECT id, name
      FROM file
      WHERE folder = '${escapeSuiteQlLiteral(folderId)}'
        AND name LIKE '${escapeSuiteQlLiteral(prefix)}%'
      ORDER BY id
    `)
    return (response.items ?? []).map((file) => {
      const storedName = String(file.name ?? '')
      const fileName = storedName.startsWith(prefix) ? storedName.slice(prefix.length) : storedName
      return { id: String(file.id ?? ''), fileName, mimeType: mimeTypeFor(fileName) }
    }).filter((file) => Boolean(file.id && file.fileName))
  }

  async getForRequest(requestId: string, attachmentId: string): Promise<AttachmentFile | null> {
    const attachment = (await this.listForRequest(requestId)).find((file) => file.id === attachmentId)
    if (!attachment) return null
    const file = await getNetSuiteFile(attachmentId)
    return { ...attachment, content: file.content }
  }

  async deleteAttachments(attachmentIds: string[]): Promise<void> {
    const results = await Promise.allSettled(attachmentIds.map((attachmentId) => deleteNetSuiteFile(attachmentId)))
    const failure = results.find((result) => result.status === 'rejected')
    if (failure?.status === 'rejected') throw failure.reason
  }
}
