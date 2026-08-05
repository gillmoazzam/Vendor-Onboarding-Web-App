import jwt from 'jsonwebtoken'
import { repositories } from '../repositories/index.js'

export type AuthSession = {
  token: string
  user: {
    userId: string
    name: string
    email: string
    role: string
  }
}

export class AuthService {
  async login(email: string, password: string): Promise<AuthSession> {
    const user = await repositories.users.findByEmail(email.trim())

    if (!user || user.password.trim() !== password.trim()) {
      throw new Error('Invalid email or password')
    }

    const sessionUser = { userId: user.id, name: user.name, email: user.email, role: user.role }
    const secret = process.env.APP_JWT_SECRET

    if (!secret) throw new Error('APP_JWT_SECRET is required')

    return {
      user: sessionUser,
      token: jwt.sign(sessionUser, secret, {
        expiresIn: process.env.APP_JWT_EXPIRY as jwt.SignOptions['expiresIn'],
      }),
    }
  }
}

export const authService = new AuthService()
