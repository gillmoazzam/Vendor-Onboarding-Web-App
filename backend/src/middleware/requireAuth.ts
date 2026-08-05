import jwt from 'jsonwebtoken'
import type { NextFunction, Request, Response } from 'express'

export function requireAuth(request: Request, response: Response, next: NextFunction): void {
  const authorization = request.header('Authorization')
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined
  const secret = process.env.APP_JWT_SECRET

  if (!token || !secret) {
    response.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    const payload = jwt.verify(token, secret)

    if (typeof payload === 'string' || !payload.userId || !payload.name || !payload.email || !payload.role) {
      response.status(401).json({ error: 'Unauthorized' })
      return
    }

    request.user = {
      userId: String(payload.userId),
      name: String(payload.name),
      email: String(payload.email),
      role: String(payload.role),
    }
    next()
  } catch {
    response.status(401).json({ error: 'Unauthorized' })
  }
}
