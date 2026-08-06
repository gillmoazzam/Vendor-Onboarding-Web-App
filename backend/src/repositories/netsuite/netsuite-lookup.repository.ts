import { netsuiteClient } from '../../services/netsuiteClient.js'
import type { Reason } from '../../types/domain.js'
import type { ILookupRepository } from '../interfaces.js'

type SuiteQlResponse = { items?: Array<Record<string, unknown>> }

export class NetSuiteLookupRepository implements ILookupRepository {
  async getReasons(): Promise<Reason[]> {
    const response = await netsuiteClient.suiteql<SuiteQlResponse>(`
      SELECT id AS "id", name AS "label"
      FROM customlist_f3_reason
      ORDER BY id
    `)

    return (response.items ?? []).map((item) => ({ id: String(item.id), label: String(item.label ?? '') }))
  }
}
