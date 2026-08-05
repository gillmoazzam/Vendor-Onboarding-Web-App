export type VendorRequestStatus =
  | 'Pending Approval'
  | 'Approved'
  | 'Rejected'
  | 'Processed'

export type QuestionnaireStatus =
  | 'Not Started'
  | 'Sent'
  | 'Submitted'
  | 'Approved'

export type QuestionnaireAnswers = {
  q1: string
  q2: string
  q3: string
  q4: string
  q5: string
}

export type VendorRequest = {
  id: string
  vendorName: string
  vendorAddress: string
  contactPerson: string
  contactEmail: string
  reasonId: string
  reasonLabel: string
  reasonOther: string
  requesterId: string
  requesterName: string
  requesterEmail: string
  requestDate: string
  status: VendorRequestStatus
  approverComments: string
  approvalDate: string | null
  approvalToken: string | null
  createdVendorId: string | null
  questionnaireStatus: QuestionnaireStatus
  questionnaireToken: string | null
  questionnaireSentDate: string | null
  questionnaireSubmittedDate: string | null
  questionnaireApprovedBy: string | null
  answers: QuestionnaireAnswers
}

export type AppUser = {
  id: string
  name: string
  email: string
  role: string
  password: string
}

export type Reason = {
  id: string
  label: string
}

export type Vendor = {
  id: string
  companyName: string
  email: string
  address: string
}
