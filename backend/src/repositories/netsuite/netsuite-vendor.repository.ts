import type { Vendor } from '../../types/domain.js'
import type { IVendorRepository, NewVendor } from '../interfaces.js'
import { createNetSuiteRecord } from './netsuite-record.client.js'

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is required for the NetSuite connection`)

  return value
}

export class NetSuiteVendorRepository implements IVendorRepository {
  async create(vendor: NewVendor): Promise<Vendor> {
    const id = await createNetSuiteRecord('/record/v1/vendor', {
      companyName: vendor.companyName,
      isPerson: false,
      email: vendor.email,
      subsidiary: { id: requiredEnvironment('NS_DEFAULT_SUBSIDIARY') },
      addressbook: {
        items: [
          {
            addressbookaddress: {
              addr1: vendor.address,
            },
          },
        ],
      },
    })

    return { ...vendor, id }
  }
}
