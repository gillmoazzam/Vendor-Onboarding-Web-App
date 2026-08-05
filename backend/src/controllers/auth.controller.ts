import type { Request, Response } from 'express'
import { repositories } from '../repositories/index.js'
import { authService } from '../services/authService.js'

export async function login(request: Request, response: Response): Promise<void> {
  const { email, password } = request.body as { email?: string; password?: string }

  try {
    const session = await authService.login(email ?? '', password ?? '')
    response.json(session)
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid email or password') {
      response.status(401).json({ error: error.message })
      return
    }

    throw error
  }
}

export async function me(request: Request, response: Response): Promise<void> {
  const user = await repositories.users.findById(request.user!.userId)

  if (!user) {
    response.status(401).json({ error: 'Unauthorized' })
    return
  }

  response.json({ id: user.id, name: user.name, email: user.email, role: user.role })
}
