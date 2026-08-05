import { Router } from 'express'
import { login, me } from '../controllers/auth.controller.js'
import { requireAuth } from '../middleware/requireAuth.js'

export const authRouter = Router()

authRouter.post('/login', login)
authRouter.get('/me', requireAuth, me)
