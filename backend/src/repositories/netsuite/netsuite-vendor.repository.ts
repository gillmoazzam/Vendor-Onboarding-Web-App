import type { Vendor } from '../../types/domain.js'
import type { IVendorRepository, NewVendor } from '../interfaces.js'
import { createNetSuiteRecord, deleteNetSuiteRecord } from './netsuite-record.client.js'

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is required for the NetSuite connection`)

  return value
}

export class NetSuiteVendorRepository implements IVendorRepository {
  async create(vendor: NewVendor): Promise<Vendor> {
    const subsidiaryId = requiredEnvironment('NS_DEFAULT_SUBSIDIARY')
    const id = await createNetSuiteRecord('/record/v1/vendor', {
      companyName: vendor.companyName,
      isPerson: false,
      email: vendor.email,
      subsidiary: { id: subsidiaryId },
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

    const nameParts = vendor.contactPerson.trim().split(/\s+/).filter(Boolean)
    const lastName = nameParts.pop()
    if (!lastName) {
      await deleteNetSuiteRecord(`/record/v1/vendor/${encodeURIComponent(id)}`)
      throw new Error('A contact person is required to create the NetSuite Contact')
    }

    try {
      await createNetSuiteRecord('/record/v1/contact', {
        ...(nameParts.length > 0 ? { firstName: nameParts.join(' ') } : {}),
        lastName,
        email: vendor.email,
        company: { id },
        subsidiary: { id: subsidiaryId },
      })
    } catch (error) {
      try {
        await deleteNetSuiteRecord(`/record/v1/vendor/${encodeURIComponent(id)}`)
      } catch (cleanupError) {
        console.error(`Failed to remove Vendor ${id} after Contact creation failed:`, cleanupError)
      }
      throw error
    }

    return { id, companyName: vendor.companyName, email: vendor.email, address: vendor.address }
  }
}
