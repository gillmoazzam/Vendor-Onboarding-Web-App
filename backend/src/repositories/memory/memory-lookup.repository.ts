import type { ILookupRepository } from '../interfaces.js'
import type { Reason } from '../../types/domain.js'

export class MemoryLookupRepository implements ILookupRepository {
  constructor(private readonly reasons: Reason[]) {}

  async getReasons(): Promise<Reason[]> {
    return [...this.reasons]
  }
}
