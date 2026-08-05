import { repositories } from '../repositories/index.js'

export class GoLiveError extends Error {
  constructor(message: string, readonly statusCode: number) {
    super(message)
  }
}

export class GoLiveService {
  async goLive(id: string): Promise<{ vendorId: string; vendorName: string }> {
    const request = await repositories.requests.findById(id)

    if (!request) throw new GoLiveError('Request not found', 404)
    if (request.status !== 'Approved') {
      throw new GoLiveError('Only approved vendor requests can go live', 400)
    }

    const vendor = await repositories.vendors.create({
      companyName: request.vendorName,
      email: request.contactEmail,
      address: request.vendorAddress,
    })
    const updatedRequest = await repositories.requests.update(id, {
      createdVendorId: vendor.id,
      status: 'Processed',
    })

    if (!updatedRequest) throw new GoLiveError('Request not found', 404)
    return { vendorId: vendor.id, vendorName: vendor.companyName }
  }
}

export const goLiveService = new GoLiveService()
