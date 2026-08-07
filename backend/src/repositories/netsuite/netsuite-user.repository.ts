import { netsuiteClient } from '../../services/netsuiteClient.js'
import type { AppUser } from '../../types/domain.js'
import type { IUserRepository } from '../interfaces.js'

type SuiteQlResponse = { items?: Array<Record<string, unknown>> }

const selectUser = `
  SELECT
    id AS "id",
    entityid AS "name",
    email AS "email",
    BUILTIN.DF(custentity_f3_app_role) AS "role",
    custentity_f3_app_password AS "password"
  FROM employee
`

function escapeSuiteQlLiteral(value: string): string {
  return value.replace(/'/g, "''")
}

function mapUser(row: Record<string, unknown>): AppUser {
  return {
    id: String(row.id),
    name: String(row.name ?? ''),
    email: String(row.email ?? ''),
    role: String(row.role ?? ''),
    password: String(row.password ?? ''),
  }
}

export class NetSuiteUserRepository implements IUserRepository {
  async findByEmail(email: string): Promise<AppUser | null> {
    return this.findOne(`email = '${escapeSuiteQlLiteral(email)}'`)
  }

  async findById(id: string): Promise<AppUser | null> {
    return this.findOne(`id = '${escapeSuiteQlLiteral(id)}'`)
  }

  private async findOne(where: string): Promise<AppUser | null> {
    const response = await netsuiteClient.suiteql<SuiteQlResponse>(`${selectUser} WHERE ${where}`)
    const row = response.items?.[0]
    return row ? mapUser(row) : null
  }
}
