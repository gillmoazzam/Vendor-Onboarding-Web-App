import type { AppUser, Reason, Vendor, VendorRequest } from '../types/domain.js'

export type NewVendorRequest = Omit<VendorRequest, 'id'>
export type VendorRequestPatch = Partial<Omit<VendorRequest, 'id'>>
export type NewVendor = Omit<Vendor, 'id'> & { contactPerson: string; sourceRequestId: string }
export type NewAttachment = { fileName: string; mimeType: string; content: Buffer }
export type StoredAttachment = { id: string; fileName: string; mimeType: string }
export type AttachmentFile = StoredAttachment & { content: Buffer }

export interface IRequestRepository {
  create(data: NewVendorRequest): Promise<VendorRequest>
  delete(id: string): Promise<void>
  findAll(): Promise<VendorRequest[]>
  findById(id: string): Promise<VendorRequest | null>
  update(id: string, patch: VendorRequestPatch): Promise<VendorRequest | null>
}

export interface IUserRepository {
  findByEmail(email: string): Promise<AppUser | null>
  findById(id: string): Promise<AppUser | null>
}

export interface ILookupRepository {
  getReasons(): Promise<Reason[]>
}

export interface IVendorRepository {
  create(vendor: NewVendor): Promise<Vendor>
}

export interface IAttachmentRepository {
  uploadForRequest(requestId: string, attachments: NewAttachment[]): Promise<StoredAttachment[]>
  listForRequest(requestId: string): Promise<StoredAttachment[]>
  getForRequest(requestId: string, attachmentId: string): Promise<AttachmentFile | null>
  deleteAttachments(attachmentIds: string[]): Promise<void>
}
