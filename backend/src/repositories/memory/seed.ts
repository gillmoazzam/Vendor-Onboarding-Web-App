import type { AppUser, Reason, VendorRequest } from '../../types/domain.js'

export const reasons: Reason[] = [
  { id: '1', label: 'Outside Industry Vendor' },
  { id: '2', label: 'Unique Product Not Offered in Industry Today' },
  { id: '3', label: 'Client Vendor Requirement' },
  { id: '4', label: 'Other' },
]

export const users: AppUser[] = [
  { id: '1', email: 'moazzam@demo.com', name: 'Moazzam Gill', role: 'Requester', password: 'Demo@2026' },
  { id: '2', email: 'finance@demo.com', name: 'Sara Khan', role: 'Finance Manager', password: 'Demo@2026' },
  { id: '3', email: 'admin@demo.com', name: 'Admin User', role: 'Administrator', password: 'Demo@2026' },
]

const emptyAnswers = { q1: '', q2: '', q3: '', q4: '', q5: '' }

export const requests: VendorRequest[] = [
  {
    id: '1', vendorName: 'Atlas Office Supplies', vendorAddress: '42 Main Street', contactPerson: 'Ayesha Malik', contactEmail: 'ayesha@atlas.example',
    reasonId: '1', reasonLabel: 'Outside Industry Vendor', reasonOther: '', requesterId: '1', requesterName: 'Moazzam Gill', requesterEmail: 'moazzam@demo.com', requestDate: '2026-08-01T09:00:00.000Z',
    status: 'Approved', approverComments: 'Approved for vendor onboarding.', approvalDate: '2026-08-02T10:00:00.000Z', approvalToken: null, createdVendorId: null,
    questionnaireStatus: 'Not Started', questionnaireToken: null, questionnaireSentDate: null, questionnaireSubmittedDate: null, questionnaireApprovedBy: null, vendorComments: '', answers: emptyAnswers,
  },
  {
    id: '2', vendorName: 'Pinnacle Logistics', vendorAddress: '88 Harbour Road', contactPerson: 'Bilal Ahmed', contactEmail: 'bilal@pinnacle.example',
    reasonId: '3', reasonLabel: 'Client Vendor Requirement', reasonOther: '', requesterId: '1', requesterName: 'Moazzam Gill', requesterEmail: 'moazzam@demo.com', requestDate: '2026-08-03T09:00:00.000Z',
    status: 'Approved', approverComments: 'Client requirement confirmed.', approvalDate: '2026-08-04T10:00:00.000Z', approvalToken: null, createdVendorId: null,
    questionnaireStatus: 'Not Started', questionnaireToken: null, questionnaireSentDate: null, questionnaireSubmittedDate: null, questionnaireApprovedBy: null, vendorComments: '', answers: emptyAnswers,
  },
]
