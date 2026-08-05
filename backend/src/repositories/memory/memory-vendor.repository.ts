import type { IVendorRepository, NewVendor } from '../interfaces.js'
import type { Vendor } from '../../types/domain.js'

export class MemoryVendorRepository implements IVendorRepository {
  private readonly vendors = new Map<string, Vendor>()
  private nextId = 1

  async create(vendor: NewVendor): Promise<Vendor> {
    const createdVendor = { ...vendor, id: String(this.nextId++) }
    this.vendors.set(createdVendor.id, createdVendor)
    return createdVendor
  }
}
