import { Router } from 'express'
import { getReasons } from '../controllers/list.controller.js'

export const listRouter = Router()

listRouter.get('/reasons', getReasons)
