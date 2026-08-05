import type { Request, Response } from 'express'
import { repositories } from '../repositories/index.js'

export async function getReasons(_request: Request, response: Response): Promise<void> {
  response.json(await repositories.lookups.getReasons())
}
