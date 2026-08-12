import type { IVendorRepository, NewVendor } from '../interfaces.js'
import type { Vendor } from '../../types/domain.js'

export class MemoryVendorRepository implements IVendorRepository {
  private readonly vendors = new Map<string, Vendor>()
  private nextId = 1

  async create(vendor: NewVendor): Promise<Vendor> {
    const createdVendor: Vendor = {
      id: String(this.nextId++),
      companyName: vendor.companyName,
      email: vendor.email,
      address: vendor.address,
    }
    this.vendors.set(createdVendor.id, createdVendor)
    return createdVendor
  }
}
