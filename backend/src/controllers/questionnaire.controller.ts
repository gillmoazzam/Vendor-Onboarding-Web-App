import type { Request, Response } from 'express'
import { repositories } from '../repositories/index.js'
import { QuestionnaireError, questionnaireService } from '../services/questionnaireService.js'
import { streamQuestionnairePdf } from '../services/questionnairePdfService.js'
import type { QuestionnaireAnswers } from '../types/domain.js'

function firstValue(value: unknown): string | undefined {
  if (typeof value === 'string') return value
  return Array.isArray(value) && typeof value[0] === 'string' ? value[0] : undefined
}

function handleQuestionnaireError(error: unknown, response: Response): boolean {
  if (!(error instanceof QuestionnaireError)) return false
  response.status(error.statusCode).json({ message: error.message })
  return true
}

export async function getPendingQuestionnaires(_request: Request, response: Response): Promise<void> {
  response.json(await repositories.requests.findPendingQuestionnaires())
}

export async function sendQuestionnaire(request: Request, response: Response): Promise<void> {
  const id = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id

  try {
    const questionnaire = await questionnaireService.send(id)
    response.json({ success: true, id: questionnaire.id, message: 'Questionnaire sent successfully' })
  } catch (error) {
    if (error instanceof QuestionnaireError) {
      response.status(error.statusCode).json({ success: false, message: error.message })
      return
    }

    response.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Unable to send questionnaire' })
  }
}

export async function getPublicQuestionnaire(request: Request, response: Response): Promise<void> {
  try {
    const questionnaire = await questionnaireService.getPublicQuestionnaire(firstValue(request.params.id)!, firstValue(request.query.token))
    response.json(questionnaire)
  } catch (error) {
    if (!handleQuestionnaireError(error, response)) throw error
  }
}

export async function submitQuestionnaire(request: Request, response: Response): Promise<void> {
  const { token, answers } = request.body as { token?: string; answers?: QuestionnaireAnswers }

  try {
    const questionnaire = await questionnaireService.submit(firstValue(request.params.id)!, token, answers)
    response.json({ success: true, id: questionnaire.id, message: 'Questionnaire submitted successfully' })
  } catch (error) {
    if (!handleQuestionnaireError(error, response)) throw error
  }
}

export async function getSubmittedQuestionnaires(_request: Request, response: Response): Promise<void> {
  response.json(await questionnaireService.getSubmittedQuestionnaires())
}

export async function approveQuestionnaire(request: Request, response: Response): Promise<void> {
  const id = firstValue(request.params.id)!

  try {
    const questionnaire = await questionnaireService.approve(id, request.user!.userId)
    response.json({ success: true, id: questionnaire.id, message: 'Questionnaire approved successfully' })
  } catch (error) {
    if (!handleQuestionnaireError(error, response)) throw error
  }
}

export async function downloadQuestionnairePdf(request: Request, response: Response): Promise<void> {
  const questionnaire = await repositories.requests.findById(firstValue(request.params.id)!)

  if (!questionnaire) {
    response.status(404).json({ message: 'Questionnaire not found' })
    return
  }

  response.setHeader('Content-Type', 'application/pdf')
  response.setHeader('Content-Disposition', `attachment; filename="vendor-questionnaire-${questionnaire.id}.pdf"`)
  streamQuestionnairePdf(questionnaire, response)
}
