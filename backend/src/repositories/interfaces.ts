import type { AppUser, Reason, Vendor, VendorRequest, VendorRequestStatus } from '../types/domain.js'

export type NewVendorRequest = Omit<VendorRequest, 'id'>
export type VendorRequestPatch = Partial<Omit<VendorRequest, 'id'>>
export type NewVendor = Omit<Vendor, 'id'>

export interface IRequestRepository {
  create(data: NewVendorRequest): Promise<VendorRequest>
  findById(id: string): Promise<VendorRequest | null>
  update(id: string, patch: VendorRequestPatch): Promise<VendorRequest | null>
  findByRequester(requesterId: string): Promise<VendorRequest[]>
  findByStatus(status: VendorRequestStatus): Promise<VendorRequest[]>
  findPendingQuestionnaires(): Promise<VendorRequest[]>
  findSubmittedQuestionnaires(): Promise<VendorRequest[]>
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
