import type { NextFunction, Request, Response } from 'express'

export function requireRole(...roles: string[]) {
  return (request: Request, response: Response, next: NextFunction): void => {
    if (!request.user || !roles.includes(request.user.role)) {
      response.status(403).json({ error: 'Forbidden' })
      return
    }

    next()
  }
}
