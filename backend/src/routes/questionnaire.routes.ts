import { Router } from 'express'
import { approveQuestionnaire, downloadQuestionnairePdf, getPendingQuestionnaires, getSubmittedQuestionnaires, sendQuestionnaire } from '../controllers/questionnaire.controller.js'
import { requireRole } from '../middleware/requireRole.js'

export const questionnaireRouter = Router()

questionnaireRouter.get('/pending', getPendingQuestionnaires)
questionnaireRouter.get('/review', requireRole('Finance Manager', 'Administrator'), getSubmittedQuestionnaires)
questionnaireRouter.post('/:id/send', sendQuestionnaire)
questionnaireRouter.post('/:id/approve', requireRole('Finance Manager', 'Administrator'), approveQuestionnaire)
questionnaireRouter.get('/:id/pdf', requireRole('Finance Manager', 'Administrator'), downloadQuestionnairePdf)
