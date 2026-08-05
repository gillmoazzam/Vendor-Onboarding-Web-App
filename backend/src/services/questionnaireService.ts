import { randomBytes } from 'node:crypto'
import { questions } from '../config/questions.js'
import { repositories } from '../repositories/index.js'
import { emailService } from './emailService.js'
import type { QuestionnaireAnswers, VendorRequest } from '../types/domain.js'

export class QuestionnaireError extends Error {
  constructor(message: string, readonly statusCode: number) {
    super(message)
  }
}

export class QuestionnaireService {
  async getSubmittedQuestionnaires(): Promise<VendorRequest[]> {
    return repositories.requests.findSubmittedQuestionnaires()
  }

  async approve(id: string, userId: string): Promise<VendorRequest> {
    const request = await repositories.requests.findById(id)

    if (!request) throw new QuestionnaireError('Request not found', 404)
    if (request.questionnaireStatus !== 'Submitted') {
      throw new QuestionnaireError('Only submitted questionnaires can be approved', 400)
    }

    const updatedRequest = await repositories.requests.update(id, {
      questionnaireStatus: 'Approved',
      questionnaireApprovedBy: userId,
    })

    if (!updatedRequest) throw new QuestionnaireError('Request not found', 404)
    return updatedRequest
  }

  async getPublicQuestionnaire(id: string, token: string | undefined): Promise<{ vendorName: string; questionnaireStatus: VendorRequest['questionnaireStatus'] }> {
    const request = await this.getValidatedQuestionnaire(id, token)
    return { vendorName: request.vendorName, questionnaireStatus: request.questionnaireStatus }
  }

  async submit(id: string, token: string | undefined, answers: QuestionnaireAnswers | undefined): Promise<VendorRequest> {
    const request = await this.getValidatedQuestionnaire(id, token)

    if (request.questionnaireStatus === 'Submitted' || request.questionnaireStatus === 'Approved') {
      throw new QuestionnaireError('This questionnaire has already been submitted', 409)
    }

    if (!answers) throw new QuestionnaireError('All questionnaire answers are required', 400)

    for (const question of questions) {
      if (!answers[question.key]?.trim()) {
        throw new QuestionnaireError('All questionnaire answers are required', 400)
      }
    }

    const updatedRequest = await repositories.requests.update(id, {
      answers,
      questionnaireStatus: 'Submitted',
      questionnaireSubmittedDate: new Date().toISOString(),
    })

    if (!updatedRequest) throw new QuestionnaireError('Request not found', 404)
    return updatedRequest
  }

  async send(id: string): Promise<VendorRequest> {
    const request = await repositories.requests.findById(id)

    if (!request) throw new QuestionnaireError('Request not found', 404)
    if (request.status !== 'Processed' || request.questionnaireStatus !== 'Not Started') {
      throw new QuestionnaireError('This request is not pending a questionnaire', 400)
    }

    const updatedRequest = await repositories.requests.update(id, {
      questionnaireToken: randomBytes(16).toString('hex'),
      questionnaireStatus: 'Sent',
      questionnaireSentDate: new Date().toISOString(),
    })

    if (!updatedRequest) throw new QuestionnaireError('Request not found', 404)
    await emailService.sendQuestionnaire(updatedRequest)
    return updatedRequest
  }

  private async getValidatedQuestionnaire(id: string, token: string | undefined): Promise<VendorRequest> {
    const request = await repositories.requests.findById(id)

    if (!request) throw new QuestionnaireError('Request not found', 404)
    if (!token || request.questionnaireToken !== token) throw new QuestionnaireError('Invalid questionnaire token', 403)

    return request
  }
}

export const questionnaireService = new QuestionnaireService()
