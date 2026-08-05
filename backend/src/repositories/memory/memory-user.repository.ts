import type { IUserRepository } from '../interfaces.js'
import type { AppUser } from '../../types/domain.js'

export class MemoryUserRepository implements IUserRepository {
  private readonly usersById = new Map<string, AppUser>()
  private readonly usersByEmail = new Map<string, AppUser>()

  constructor(users: AppUser[]) {
    for (const user of users) {
      this.usersById.set(user.id, user)
      this.usersByEmail.set(user.email, user)
    }
  }

  async findByEmail(email: string): Promise<AppUser | null> {
    return this.usersByEmail.get(email) ?? null
  }

  async findById(id: string): Promise<AppUser | null> {
    return this.usersById.get(id) ?? null
  }
}
