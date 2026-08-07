import type { QuestionnaireAnswers } from '../types/domain.js'

export const questions: ReadonlyArray<{ id: string; key: keyof QuestionnaireAnswers; label: string }> = [
  { id: 'Q1', key: 'q1', label: 'What products or services do you provide, and what are your core areas of expertise?' },
  { id: 'Q2', key: 'q2', label: 'What certifications, licenses, registrations, or regulatory approvals do you hold that are relevant to your business?' },
  { id: 'Q3', key: 'q3', label: 'Describe your quality assurance process and how you handle customer complaints, defects, or service issues.' },
  { id: 'Q4', key: 'q4', label: 'Are there any operational, financial, legal, or supply chain risks that could impact your ability to deliver products or services consistently? If yes, please explain.' },
  { id: 'Q5', key: 'q5', label: 'Please provide at least two recent client references or examples of similar projects, products, or services delivered.' },
]
