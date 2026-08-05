import { Router, type NextFunction, type Request, type Response } from 'express'
import { getPublicQuestionnaire, submitQuestionnaire } from '../controllers/questionnaire.controller.js'

export const publicQuestionnaireRouter = Router()

function requireNumericId(request: Request, _response: Response, next: NextFunction): void {
  const id = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id
  if (!/^\d+$/.test(id)) {
    next('route')
    return
  }
  next()
}

publicQuestionnaireRouter.get('/:id', requireNumericId, getPublicQuestionnaire)
publicQuestionnaireRouter.post('/:id/submit', requireNumericId, submitQuestionnaire)
