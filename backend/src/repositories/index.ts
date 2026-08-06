import type { ILookupRepository, IRequestRepository, IUserRepository, IVendorRepository } from './interfaces.js'
import { MemoryLookupRepository } from './memory/memory-lookup.repository.js'
import { MemoryRequestRepository } from './memory/memory-request.repository.js'
import { MemoryUserRepository } from './memory/memory-user.repository.js'
import { MemoryVendorRepository } from './memory/memory-vendor.repository.js'
import { reasons, requests, users } from './memory/seed.js'
import { NetSuiteLookupRepository } from './netsuite/netsuite-lookup.repository.js'
import { NetSuiteRequestRepository } from './netsuite/netsuite-request.repository.js'
import { NetSuiteUserRepository } from './netsuite/netsuite-user.repository.js'
import { NetSuiteVendorRepository } from './netsuite/netsuite-vendor.repository.js'

export type Repositories = {
  requests: IRequestRepository
  users: IUserRepository
  lookups: ILookupRepository
  vendors: IVendorRepository
}

function createMemoryRepositories(): Repositories {
  return {
    requests: new MemoryRequestRepository(requests),
    users: new MemoryUserRepository(users),
    lookups: new MemoryLookupRepository(reasons),
    vendors: new MemoryVendorRepository(),
  }
}

function createNetSuiteRepositories(): Repositories {
  return {
    requests: new NetSuiteRequestRepository(),
    users: new NetSuiteUserRepository(),
    lookups: new NetSuiteLookupRepository(),
    vendors: new NetSuiteVendorRepository(),
  }
}

function createRepositories(): Repositories {
  const dataSource = process.env.DATA_SOURCE ?? 'memory'

  if (dataSource === 'memory') return createMemoryRepositories()
  if (dataSource === 'netsuite') return createNetSuiteRepositories()

  throw new Error(`Unsupported DATA_SOURCE: ${dataSource}`)
}

export const repositories = createRepositories()
