import {
  fromNetSuiteQuestionnaireStatusId,
  fromNetSuiteReasonId,
  fromNetSuiteStatusId,
  toNetSuiteQuestionnaireStatusId,
  toNetSuiteReasonId,
  toNetSuiteStatusId,
} from '../../config/netsuiteLists.js'
import { netsuiteClient } from '../../services/netsuiteClient.js'
import type { QuestionnaireStatus, VendorRequest, VendorRequestStatus } from '../../types/domain.js'
import type { IRequestRepository, NewVendorRequest, VendorRequestPatch } from '../interfaces.js'
import { createNetSuiteRecord } from './netsuite-record.client.js'

const recordType = 'customrecord_f3_vendor_onboarding'

const fields = {
  vendorName: 'custrecord_f3_vendor_name',
  vendorAddress: 'custrecord_f3_vendor_address',
  contactPerson: 'custrecord_f3_contact_person',
  contactEmail: 'custrecord_f3_contact_email',
  reason: 'custrecord_f3_reason',
  reasonOther: 'custrecord_f3_reason_other',
  requester: 'custrecord_f3_requester',
  requesterEmail: 'custrecord_f3_requester_email',
  requestDate: 'custrecord_f3_request_date',
  status: 'custrecord_f3_status1',
  approverComments: 'custrecord_f3_approver_comments',
  approvalDate: 'custrecord_f3_approval_date',
  approvalToken: 'custrecord_f3_approval_token',
  createdVendorId: 'custrecord_f3_created_vendor',
  questionnaireStatus: 'custrecord_f3_qn_status',
  questionnaireToken: 'custrecord_f3_qn_token',
  questionnaireSentDate: 'custrecord_f3_qn_sent_date',
  questionnaireSubmittedDate: 'custrecord_f3_qn_submitted_date',
  questionnaireApprovedBy: 'custrecord_f3_qn_approved_by',
  q1: 'custrecord_f3_q1',
  q2: 'custrecord_f3_q2',
  q3: 'custrecord_f3_q3',
  q4: 'custrecord_f3_q4',
  q5: 'custrecord_f3_q5',
} as const

type SuiteQlResponse = { items?: Array<Record<string, unknown>> }

const selectRequest = `
  SELECT
    id AS "id",
    ${fields.vendorName} AS "vendorName",
    ${fields.vendorAddress} AS "vendorAddress",
    ${fields.contactPerson} AS "contactPerson",
    ${fields.contactEmail} AS "contactEmail",
    ${fields.reason} AS "reasonId",
    ${fields.reasonOther} AS "reasonOther",
    ${fields.requester} AS "requesterId",
    BUILTIN.DF(${fields.requester}) AS "requesterName",
    ${fields.requesterEmail} AS "requesterEmail",
    ${fields.requestDate} AS "requestDate",
    ${fields.status} AS "statusId",
    ${fields.approverComments} AS "approverComments",
    ${fields.approvalDate} AS "approvalDate",
    ${fields.approvalToken} AS "approvalToken",
    ${fields.createdVendorId} AS "createdVendorId",
    ${fields.questionnaireStatus} AS "questionnaireStatusId",
    ${fields.questionnaireToken} AS "questionnaireToken",
    ${fields.questionnaireSentDate} AS "questionnaireSentDate",
    ${fields.questionnaireSubmittedDate} AS "questionnaireSubmittedDate",
    ${fields.questionnaireApprovedBy} AS "questionnaireApprovedBy",
    ${fields.q1} AS "q1",
    ${fields.q2} AS "q2",
    ${fields.q3} AS "q3",
    ${fields.q4} AS "q4",
    ${fields.q5} AS "q5"
  FROM ${recordType}
`

function escapeSuiteQlLiteral(value: string): string {
  return value.replace(/'/g, "''")
}

function toDate(value: string | null): string | null {
  if (!value) return null

  return value.includes('T') ? value.slice(0, 10) : value
}

function text(value: unknown): string {
  return value == null ? '' : String(value)
}

function nullableText(value: unknown): string | null {
  return value == null || value === '' ? null : String(value)
}

function mapRequest(row: Record<string, unknown>): VendorRequest {
  const reason = fromNetSuiteReasonId(text(row.reasonId))

  return {
    id: text(row.id),
    vendorName: text(row.vendorName),
    vendorAddress: text(row.vendorAddress),
    contactPerson: text(row.contactPerson),
    contactEmail: text(row.contactEmail),
    reasonId: reason.id,
    reasonLabel: reason.label,
    reasonOther: text(row.reasonOther),
    requesterId: text(row.requesterId),
    requesterName: text(row.requesterName),
    requesterEmail: text(row.requesterEmail),
    requestDate: text(row.requestDate),
    status: fromNetSuiteStatusId(text(row.statusId)),
    approverComments: text(row.approverComments),
    approvalDate: nullableText(row.approvalDate),
    approvalToken: nullableText(row.approvalToken),
    createdVendorId: nullableText(row.createdVendorId),
    questionnaireStatus: fromNetSuiteQuestionnaireStatusId(text(row.questionnaireStatusId)),
    questionnaireToken: nullableText(row.questionnaireToken),
    questionnaireSentDate: nullableText(row.questionnaireSentDate),
    questionnaireSubmittedDate: nullableText(row.questionnaireSubmittedDate),
    questionnaireApprovedBy: nullableText(row.questionnaireApprovedBy),
    answers: { q1: text(row.q1), q2: text(row.q2), q3: text(row.q3), q4: text(row.q4), q5: text(row.q5) },
  }
}

function toNetSuiteRequest(data: NewVendorRequest): Record<string, unknown> {
  return {
    [fields.vendorName]: data.vendorName,
    [fields.vendorAddress]: data.vendorAddress,
    [fields.contactPerson]: data.contactPerson,
    [fields.contactEmail]: data.contactEmail,
    [fields.reason]: { id: toNetSuiteReasonId(data.reasonId) },
    [fields.reasonOther]: data.reasonOther,
    [fields.requester]: { id: data.requesterId },
    [fields.requesterEmail]: data.requesterEmail,
    [fields.requestDate]: toDate(data.requestDate),
    [fields.status]: { id: toNetSuiteStatusId(data.status) },
    [fields.approverComments]: data.approverComments,
    [fields.approvalDate]: toDate(data.approvalDate),
    [fields.approvalToken]: data.approvalToken,
    [fields.createdVendorId]: data.createdVendorId ? { id: data.createdVendorId } : null,
    [fields.questionnaireStatus]: { id: toNetSuiteQuestionnaireStatusId(data.questionnaireStatus) },
    [fields.questionnaireToken]: data.questionnaireToken,
    [fields.questionnaireSentDate]: toDate(data.questionnaireSentDate),
    [fields.questionnaireSubmittedDate]: toDate(data.questionnaireSubmittedDate),
    [fields.questionnaireApprovedBy]: data.questionnaireApprovedBy ? { id: data.questionnaireApprovedBy } : null,
    [fields.q1]: data.answers.q1,
    [fields.q2]: data.answers.q2,
    [fields.q3]: data.answers.q3,
    [fields.q4]: data.answers.q4,
    [fields.q5]: data.answers.q5,
  }
}

function toNetSuitePatch(patch: VendorRequestPatch): Record<string, unknown> {
  const body: Record<string, unknown> = {}
  const simpleFields: Array<[keyof VendorRequestPatch, string]> = [
    ['vendorName', fields.vendorName], ['vendorAddress', fields.vendorAddress], ['contactPerson', fields.contactPerson],
    ['contactEmail', fields.contactEmail], ['reasonOther', fields.reasonOther], ['requesterEmail', fields.requesterEmail],
    ['approverComments', fields.approverComments], ['approvalToken', fields.approvalToken], ['questionnaireToken', fields.questionnaireToken],
  ]

  for (const [domainField, netSuiteField] of simpleFields) {
    if (domainField in patch) body[netSuiteField] = patch[domainField]
  }

  if ('reasonId' in patch && patch.reasonId !== undefined) body[fields.reason] = { id: toNetSuiteReasonId(patch.reasonId) }
  if ('requesterId' in patch && patch.requesterId !== undefined) body[fields.requester] = { id: patch.requesterId }
  if ('status' in patch && patch.status !== undefined) body[fields.status] = { id: toNetSuiteStatusId(patch.status) }
  if ('questionnaireStatus' in patch && patch.questionnaireStatus !== undefined) body[fields.questionnaireStatus] = { id: toNetSuiteQuestionnaireStatusId(patch.questionnaireStatus) }
  if ('createdVendorId' in patch) body[fields.createdVendorId] = patch.createdVendorId ? { id: patch.createdVendorId } : null
  if ('questionnaireApprovedBy' in patch) body[fields.questionnaireApprovedBy] = patch.questionnaireApprovedBy ? { id: patch.questionnaireApprovedBy } : null
  if ('requestDate' in patch) body[fields.requestDate] = toDate(patch.requestDate ?? null)
  if ('approvalDate' in patch) body[fields.approvalDate] = toDate(patch.approvalDate ?? null)
  if ('questionnaireSentDate' in patch) body[fields.questionnaireSentDate] = toDate(patch.questionnaireSentDate ?? null)
  if ('questionnaireSubmittedDate' in patch) body[fields.questionnaireSubmittedDate] = toDate(patch.questionnaireSubmittedDate ?? null)
  if (patch.answers) {
    body[fields.q1] = patch.answers.q1
    body[fields.q2] = patch.answers.q2
    body[fields.q3] = patch.answers.q3
    body[fields.q4] = patch.answers.q4
    body[fields.q5] = patch.answers.q5
  }

  return body
}

export class NetSuiteRequestRepository implements IRequestRepository {
  async create(data: NewVendorRequest): Promise<VendorRequest> {
    const id = await createNetSuiteRecord(`/record/v1/${recordType}`, toNetSuiteRequest(data))
    const request = await this.findById(id)
    if (!request) throw new Error(`NetSuite created vendor request ${id}, but it could not be read`)

    return request
  }

  async findById(id: string): Promise<VendorRequest | null> {
    const requests = await this.find(`id = '${escapeSuiteQlLiteral(id)}'`)
    return requests[0] ?? null
  }

  async update(id: string, patch: VendorRequestPatch): Promise<VendorRequest | null> {
    const body = toNetSuitePatch(patch)
    if (Object.keys(body).length === 0) return this.findById(id)

    await netsuiteClient.patch(`/record/v1/${recordType}/${encodeURIComponent(id)}`, body)
    return this.findById(id)
  }

  async findByRequester(requesterId: string): Promise<VendorRequest[]> {
    return this.find(`${fields.requester} = '${escapeSuiteQlLiteral(requesterId)}'`, `${fields.requestDate} DESC`)
  }

  async findByStatus(status: VendorRequestStatus): Promise<VendorRequest[]> {
    return this.find(`${fields.status} = '${escapeSuiteQlLiteral(toNetSuiteStatusId(status))}'`)
  }

  async findPendingQuestionnaires(): Promise<VendorRequest[]> {
    return this.find(
      `${fields.status} = '${escapeSuiteQlLiteral(toNetSuiteStatusId('Processed'))}' AND ${fields.questionnaireStatus} = '${escapeSuiteQlLiteral(toNetSuiteQuestionnaireStatusId('Not Started'))}'`,
    )
  }

  async findSubmittedQuestionnaires(): Promise<VendorRequest[]> {
    return this.find(`${fields.questionnaireStatus} = '${escapeSuiteQlLiteral(toNetSuiteQuestionnaireStatusId('Submitted'))}'`)
  }

  private async find(where: string, orderBy = 'id DESC'): Promise<VendorRequest[]> {
    const response = await netsuiteClient.suiteql<SuiteQlResponse>(`${selectRequest} WHERE ${where} ORDER BY ${orderBy}`)
    return (response.items ?? []).map(mapRequest)
  }
}
