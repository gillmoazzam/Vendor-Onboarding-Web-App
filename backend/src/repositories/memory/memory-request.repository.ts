import type { IRequestRepository, NewVendorRequest, VendorRequestPatch } from '../interfaces.js'
import type { VendorRequest, VendorRequestStatus } from '../../types/domain.js'

export class MemoryRequestRepository implements IRequestRepository {
  private readonly requests = new Map<string, VendorRequest>()
  private nextId = 1

  constructor(seed: VendorRequest[] = []) {
    for (const request of seed) {
      this.requests.set(request.id, request)
      this.nextId = Math.max(this.nextId, Number(request.id) + 1)
    }
  }

  async create(data: NewVendorRequest): Promise<VendorRequest> {
    const request = { ...data, id: String(this.nextId++) }
    this.requests.set(request.id, request)
    return request
  }

  async findById(id: string): Promise<VendorRequest | null> {
    return this.requests.get(id) ?? null
  }

  async update(id: string, patch: VendorRequestPatch): Promise<VendorRequest | null> {
    const request = this.requests.get(id)
    if (!request) return null

    const updated = { ...request, ...patch, id }
    this.requests.set(id, updated)
    return updated
  }

  async findByRequester(requesterId: string): Promise<VendorRequest[]> {
    return this.filter((request) => request.requesterId === requesterId)
  }

  async findByStatus(status: VendorRequestStatus): Promise<VendorRequest[]> {
    return this.filter((request) => request.status === status)
  }

  async findPendingQuestionnaires(): Promise<VendorRequest[]> {
    return this.filter(
      (request) => request.status === 'Processed' && request.questionnaireStatus === 'Not Started',
    )
  }

  async findSubmittedQuestionnaires(): Promise<VendorRequest[]> {
    return this.filter((request) => request.questionnaireStatus === 'Submitted')
  }

  private filter(predicate: (request: VendorRequest) => boolean): VendorRequest[] {
    return [...this.requests.values()].filter(predicate)
  }
}
