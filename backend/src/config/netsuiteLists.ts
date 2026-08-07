import type { QuestionnaireStatus, VendorRequestStatus } from '../types/domain.js'

export const NETSUITE_STATUS_IDS = {
  pendingApproval: '1',
  approved: '2',
  rejected: '3',
  processed: '4',
} as const

export const NETSUITE_QUESTIONNAIRE_STATUS_IDS = {
  notStarted: '1',
  sent: '2',
  submitted: '3',
  approved: '4',
} as const

export const NETSUITE_REASON_IDS = {
  provideServices: '1',
  strategicBusinessPartner: '2',
  supplyProducts: '3',
  other: '4',
  businessOpportunity: '5',
} as const

const statusToId: Record<VendorRequestStatus, string> = {
  'Pending Approval': NETSUITE_STATUS_IDS.pendingApproval,
  Approved: NETSUITE_STATUS_IDS.approved,
  Rejected: NETSUITE_STATUS_IDS.rejected,
  Processed: NETSUITE_STATUS_IDS.processed,
}

const questionnaireStatusToId: Record<QuestionnaireStatus, string> = {
  'Not Started': NETSUITE_QUESTIONNAIRE_STATUS_IDS.notStarted,
  Sent: NETSUITE_QUESTIONNAIRE_STATUS_IDS.sent,
  Submitted: NETSUITE_QUESTIONNAIRE_STATUS_IDS.submitted,
  Approved: NETSUITE_QUESTIONNAIRE_STATUS_IDS.approved,
}

const reasonLabelToId: Record<string, string> = {
  'Provide Services': NETSUITE_REASON_IDS.provideServices,
  'Become a Strategic Business Partner': NETSUITE_REASON_IDS.strategicBusinessPartner,
  'Supply Products': NETSUITE_REASON_IDS.supplyProducts,
  Other: NETSUITE_REASON_IDS.other,
  'Responding to a Business Opportunity': NETSUITE_REASON_IDS.businessOpportunity,
}

function reverseMap<T extends string>(map: Record<T, string>): Record<string, T> {
  return Object.fromEntries(Object.entries(map).map(([key, value]) => [value, key])) as Record<string, T>
}

const idToStatus = reverseMap(statusToId)
const idToQuestionnaireStatus = reverseMap(questionnaireStatusToId)
const idToReasonLabel = reverseMap(reasonLabelToId)

export function toNetSuiteStatusId(status: VendorRequestStatus): string {
  return statusToId[status]
}

export function fromNetSuiteStatusId(id: string): VendorRequestStatus {
  const status = idToStatus[id]
  if (!status) throw new Error(`Unknown NetSuite vendor request status ID: ${id}`)

  return status
}

export function toNetSuiteQuestionnaireStatusId(status: QuestionnaireStatus): string {
  return questionnaireStatusToId[status]
}

export function fromNetSuiteQuestionnaireStatusId(id: string): QuestionnaireStatus {
  const status = idToQuestionnaireStatus[id]
  if (!status) throw new Error(`Unknown NetSuite questionnaire status ID: ${id}`)

  return status
}

export function toNetSuiteReasonId(reason: string): string {
  return reasonLabelToId[reason] ?? reason
}

export function fromNetSuiteReasonId(id: string): { id: string; label: string } {
  const label = idToReasonLabel[id]
  if (!label) throw new Error(`Unknown NetSuite reason ID: ${id}`)

  return { id, label }
}

export function getConfiguredReasons(): Array<{ id: string; label: string }> {
  return Object.entries(reasonLabelToId).map(([label, id]) => ({ id, label }))
}
