import { netsuiteClient } from '../../services/netsuiteClient.js'
import type { Vendor } from '../../types/domain.js'
import type { IVendorRepository, NewVendor } from '../interfaces.js'
import { createNetSuiteRecord } from './netsuite-record.client.js'

type SuiteQlResponse = { items?: Array<Record<string, unknown>> }

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is required for the NetSuite connection`)

  return value
}

function escapeSuiteQlLiteral(value: string): string {
  return value.replace(/'/g, "''")
}

async function findIdByExternalId(recordType: 'vendor' | 'contact', externalId: string): Promise<string | null> {
  const response = await netsuiteClient.suiteql<SuiteQlResponse>(
    `SELECT id FROM ${recordType} WHERE externalid = '${escapeSuiteQlLiteral(externalId)}'`,
  )
  const id = response.items?.[0]?.id
  return id == null || id === '' ? null : String(id)
}

async function ensureContact(vendorId: string, vendor: NewVendor, subsidiaryId: string, externalId: string): Promise<void> {
  if (await findIdByExternalId('contact', externalId)) return

  const nameParts = vendor.contactPerson.trim().split(/\s+/).filter(Boolean)
  const lastName = nameParts.pop()
  if (!lastName) throw new Error('A contact person is required to create the NetSuite Contact')

  try {
    await createNetSuiteRecord('/record/v1/contact', {
      externalId,
      ...(nameParts.length > 0 ? { firstName: nameParts.join(' ') } : {}),
      lastName,
      email: vendor.email,
      company: { id: vendorId },
      subsidiary: { id: subsidiaryId },
    })
  } catch (error) {
    if (await findIdByExternalId('contact', externalId)) return
    throw error
  }
}

export class NetSuiteVendorRepository implements IVendorRepository {
  async create(vendor: NewVendor): Promise<Vendor> {
    const subsidiaryId = requiredEnvironment('NS_DEFAULT_SUBSIDIARY')
    const vendorExternalId = `f3-vendor-request-${vendor.sourceRequestId}`
    const contactExternalId = `${vendorExternalId}-contact`
    let id = await findIdByExternalId('vendor', vendorExternalId)

    if (!id) {
      try {
        id = await createNetSuiteRecord('/record/v1/vendor', {
          externalId: vendorExternalId,
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
      } catch (error) {
        id = await findIdByExternalId('vendor', vendorExternalId)
        if (!id) throw error
      }
    }

    await ensureContact(id, vendor, subsidiaryId, contactExternalId)

    return { id, companyName: vendor.companyName, email: vendor.email, address: vendor.address }
  }
}
