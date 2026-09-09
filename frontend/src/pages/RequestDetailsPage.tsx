import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle2, Download, FileText, MessageSquareText, RefreshCw, XCircle } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ApiErrorCard } from '../components/ApiErrorCard'
import { Badge } from '../components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { questions } from '../config/questions'
import { api } from '../lib/api'

type RequestStatus = 'Pending Approval' | 'Approved' | 'Rejected' | 'Processed'
type VendorRequest = {
  id: string
  vendorName: string
  vendorAddress: string
  contactPerson: string
  contactEmail: string
  reasonLabel: string
  reasonOther: string
  requesterName: string
  requesterEmail: string
  requestDate: string
  status: RequestStatus
  approverComments: string
  approvalDate: string | null
  createdVendorId: string | null
  questionnaireStatus: string
  questionnaireSubmittedDate: string | null
  vendorComments: string
  answers: Record<(typeof questions)[number]['key'], string>
}
type Attachment = { id: string; fileName: string; mimeType: string }

const badgeClasses: Record<RequestStatus, string> = {
  'Pending Approval': 'bg-amber-100 text-amber-800',
  Approved: 'bg-green-100 text-green-800',
  Rejected: 'bg-red-100 text-red-800',
  Processed: 'bg-blue-100 text-blue-800',
}

function displayDate(value: string | null): string {
  if (!value) return 'Not available'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-2 whitespace-pre-wrap text-sm font-medium leading-6 text-slate-800">{value || 'Not provided'}</dd></div>
}

export function RequestDetailsPage() {
  const { id = '' } = useParams()
  const queryClient = useQueryClient()
  const [showFurtherDetails, setShowFurtherDetails] = useState(false)
  const [decisionToConfirm, setDecisionToConfirm] = useState<'approve' | 'reject' | null>(null)
  const [rejectionComments, setRejectionComments] = useState('')
  const [rejectionCommentsError, setRejectionCommentsError] = useState('')
  const [comments, setComments] = useState('')
  const [commentsError, setCommentsError] = useState('')
  const requestQuery = useQuery({ queryKey: ['request', id], queryFn: async () => (await api.get<VendorRequest>(`/requests/${id}`)).data, refetchInterval: 60_000 })
  const attachmentsQuery = useQuery({ queryKey: ['request-attachments', id], queryFn: async () => (await api.get<Attachment[]>(`/requests/${id}/attachments`)).data, refetchInterval: 60_000 })
  const decisionMutation = useMutation({
    mutationFn: async ({ action, comments = '' }: { action: 'approve' | 'reject'; comments?: string }) => (await api.post<{ status: RequestStatus; vendorId?: string }>(`/requests/${id}/decision`, { action, comments })).data,
    onSuccess: (data) => {
      toast.success(data.vendorId ? `Vendor approved and created in NetSuite (Vendor ID: ${data.vendorId})` : 'Vendor request rejected and notification sent')
      setDecisionToConfirm(null)
      setRejectionComments('')
      setRejectionCommentsError('')
      void queryClient.invalidateQueries({ queryKey: ['request', id] })
      void queryClient.invalidateQueries({ queryKey: ['requests'] })
    },
    onError: () => toast.error('Unable to update this vendor request. Please try again.'),
  })
  const furtherDetailsMutation = useMutation({
    mutationFn: async () => (await api.post(`/requests/${id}/further-details`, { comments: comments.trim() })).data,
    onSuccess: () => {
      toast.success('Additional information request sent')
      setShowFurtherDetails(false)
      setComments('')
      void queryClient.invalidateQueries({ queryKey: ['request', id] })
    },
    onError: () => toast.error('Unable to send the email. Please try again.'),
  })
  const attachmentSyncMutation = useMutation({
    mutationFn: async () => (await api.post<{ attachedFileIds: string[] }>(`/requests/${id}/attachments/sync`)).data,
    onSuccess: (data) => toast.success(`${data.attachedFileIds.length} attachment(s) synchronized to the NetSuite Files tab`),
    onError: () => toast.error('Unable to synchronize attachments to NetSuite. Check the RESTlet deployment and execution log.'),
  })

  async function downloadAttachment(attachment: Attachment) {
    try {
      const response = await api.get<Blob>(`/requests/${id}/attachments/${attachment.id}`, { responseType: 'blob' })
      const url = URL.createObjectURL(response.data)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = attachment.fileName
      anchor.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Unable to download this attachment. Please try again.')
    }
  }

  function sendFurtherDetails() {
    if (!comments.trim()) {
      setCommentsError('Comments are required')
      return
    }
    setCommentsError('')
    furtherDetailsMutation.mutate()
  }

  function confirmDecision() {
    if (!decisionToConfirm) return
    if (decisionToConfirm === 'reject' && !rejectionComments.trim()) {
      setRejectionCommentsError('Enter the reason for rejection')
      return
    }
    decisionMutation.mutate({ action: decisionToConfirm, comments: rejectionComments.trim() })
  }

  if (requestQuery.isLoading) return <main className="mx-auto max-w-7xl space-y-5 p-6"><div className="h-8 w-64 animate-pulse rounded bg-slate-200" />{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-40 animate-pulse rounded-2xl bg-slate-100" />)}</main>
  if (requestQuery.isError || !requestQuery.data) return <main className="mx-auto max-w-7xl p-6"><ApiErrorCard message="We could not load this vendor request. Please return to Vendor Requests and try again." /></main>

  const request = requestQuery.data
  return <main className="mx-auto max-w-7xl space-y-6 p-6">
    <Link to="/requests" className="inline-flex items-center gap-2 text-sm font-bold text-[#1F3864] hover:text-[#E8272C]"><ArrowLeft className="size-4" />Back to Vendor Requests</Link>
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><p className="text-sm font-bold uppercase tracking-[0.16em] text-[#E8272C]">Vendor registration #{request.id}</p><h1 className="mt-1 text-3xl font-bold text-[#1F3864]">{request.vendorName}</h1></div><Badge className={`${badgeClasses[request.status]} px-4 py-2 text-sm`}>{request.status}</Badge></div>

    <Card><CardHeader><CardTitle>Submission Information</CardTitle></CardHeader><CardContent><dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Detail label="Request Number" value={`#${request.id}`} /><Detail label="Submission Date" value={displayDate(request.requestDate)} /><Detail label="Questionnaire Status" value={request.questionnaireStatus} /><Detail label="Questionnaire Submitted" value={displayDate(request.questionnaireSubmittedDate)} /></dl></CardContent></Card>

    <Card><CardHeader><CardTitle>Vendor Information</CardTitle></CardHeader><CardContent><dl className="grid gap-4 sm:grid-cols-2"><Detail label="Company Name" value={request.vendorName} /><Detail label="Contact Person" value={request.contactPerson} /><Detail label="Email Address" value={request.contactEmail} /><Detail label="Reason for Consideration" value={request.reasonLabel} /><div className="sm:col-span-2"><Detail label="Company Address" value={request.vendorAddress} /></div>{request.reasonOther && <div className="sm:col-span-2"><Detail label="Additional Reason Details" value={request.reasonOther} /></div>}</dl></CardContent></Card>

    <Card><CardHeader><CardTitle>Due-Diligence Questionnaire</CardTitle></CardHeader><CardContent className="space-y-4">{questions.map((question) => <div key={question.id} className="rounded-xl border border-slate-200 p-5"><p className="font-bold leading-6 text-[#1F3864]"><span className="mr-2 text-[#E8272C]">{question.id}</span>{question.label}</p><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">{request.answers[question.key] || 'No answer provided'}</p></div>)}</CardContent></Card>

    <Card><CardHeader><CardTitle>Supporting Documents</CardTitle></CardHeader><CardContent>{attachmentsQuery.isLoading ? <div className="space-y-3">{Array.from({ length: 2 }, (_, index) => <div key={index} className="h-14 animate-pulse rounded-xl bg-slate-100" />)}</div> : attachmentsQuery.isError ? <ApiErrorCard message="We could not load the supporting documents." /> : attachmentsQuery.data?.length ? <><ul className="space-y-3">{attachmentsQuery.data.map((attachment) => <li key={attachment.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-4"><FileText className="size-5 shrink-0 text-[#E8272C]" /><span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-700">{attachment.fileName}</span><button type="button" onClick={() => void downloadAttachment(attachment)} className="inline-flex items-center gap-2 rounded-lg bg-[#1F3864] px-3 py-2 text-sm font-bold text-white hover:bg-[#162A4D]"><Download className="size-4" />Download</button></li>)}</ul><button type="button" disabled={attachmentSyncMutation.isPending} onClick={() => attachmentSyncMutation.mutate()} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[#1F3864] px-4 py-2.5 text-sm font-bold text-[#1F3864] hover:bg-slate-50 disabled:opacity-60"><RefreshCw className={`size-4 ${attachmentSyncMutation.isPending ? 'animate-spin' : ''}`} />{attachmentSyncMutation.isPending ? 'Synchronizing…' : 'Sync attachments to NetSuite'}</button></> : <div className="py-8 text-center text-sm text-slate-500"><FileText className="mx-auto mb-3 size-8 text-slate-300" />No supporting documents were submitted.</div>}</CardContent></Card>

    {request.approverComments && <Card><CardHeader><CardTitle>Review History</CardTitle></CardHeader><CardContent><p className="whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-7 text-slate-700">{request.approverComments}</p></CardContent></Card>}

    <Card><CardHeader><CardTitle>Vendor Communication History</CardTitle></CardHeader><CardContent>{request.vendorComments ? <p className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm leading-7 text-slate-700">{request.vendorComments}</p> : <div className="py-8 text-center text-sm text-slate-500"><MessageSquareText className="mx-auto mb-3 size-8 text-slate-300" />No email replies have been received from this vendor.</div>}</CardContent></Card>

    <Card className="border-slate-300"><CardHeader><CardTitle>Reviewer Actions</CardTitle></CardHeader><CardContent>{request.status === 'Pending Approval' ? <div className="flex flex-col gap-3 sm:flex-row"><button type="button" disabled={decisionMutation.isPending} onClick={() => setDecisionToConfirm('approve')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white hover:bg-emerald-700 disabled:opacity-60"><CheckCircle2 className="size-5" />Approve</button><button type="button" disabled={decisionMutation.isPending} onClick={() => { setRejectionComments(''); setRejectionCommentsError(''); setDecisionToConfirm('reject') }} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#E8272C] px-5 py-3 font-bold text-white hover:bg-[#C31D22] disabled:opacity-60"><XCircle className="size-5" />Reject</button><button type="button" onClick={() => setShowFurtherDetails(true)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#1F3864] px-5 py-3 font-bold text-[#1F3864] hover:bg-slate-50"><MessageSquareText className="size-5" />Request Further Details</button></div> : <p className="text-sm text-slate-600">This request is currently <strong>{request.status}</strong>{request.approvalDate ? ` as of ${displayDate(request.approvalDate)}` : ''}.</p>}</CardContent></Card>

    {decisionToConfirm && <div role="dialog" aria-modal="true" aria-labelledby="decision-confirmation-title" className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-5"><Card className="w-full max-w-lg"><CardHeader><CardTitle id="decision-confirmation-title">Confirm {decisionToConfirm === 'approve' ? 'Approval' : 'Rejection'}</CardTitle></CardHeader><CardContent className="space-y-5"><p className="text-sm leading-7 text-slate-700">{decisionToConfirm === 'approve' ? `Approve ${request.vendorName}? This will create the Vendor and Contact records in NetSuite.` : `Reject ${request.vendorName}? The reason entered below will be included in the email sent to the vendor.`}</p>{decisionToConfirm === 'reject' && <label className="block text-sm font-bold text-[#1F3864]">Reason for rejection <span className="text-[#E8272C]" aria-hidden="true">*</span><textarea value={rejectionComments} onChange={(event) => { setRejectionComments(event.target.value); setRejectionCommentsError('') }} rows={5} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal text-slate-700 outline-none focus:border-[#E8272C] focus:ring-4 focus:ring-red-50" /></label>}{rejectionCommentsError && <p role="alert" className="text-sm font-medium text-[#E8272C]">{rejectionCommentsError}</p>}<div className="flex justify-end gap-3"><button type="button" disabled={decisionMutation.isPending} onClick={() => { setDecisionToConfirm(null); setRejectionCommentsError('') }} className="rounded-xl border border-slate-300 px-5 py-2.5 font-bold text-slate-700 disabled:opacity-60">Cancel</button><button type="button" disabled={decisionMutation.isPending} onClick={confirmDecision} className={`rounded-xl px-5 py-2.5 font-bold text-white disabled:opacity-60 ${decisionToConfirm === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-[#E8272C] hover:bg-[#C31D22]'}`}>{decisionMutation.isPending ? 'Processing…' : `Confirm ${decisionToConfirm === 'approve' ? 'Approval' : 'Rejection'}`}</button></div></CardContent></Card></div>}

    {showFurtherDetails && <div role="dialog" aria-modal="true" aria-labelledby="further-details-title" className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-5"><Card className="w-full max-w-xl"><CardHeader><CardTitle id="further-details-title">Request Further Details</CardTitle></CardHeader><CardContent className="space-y-5"><label className="block text-sm font-bold text-[#1F3864]">Additional information required<textarea value={comments} onChange={(event) => { setComments(event.target.value); setCommentsError('') }} rows={6} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal text-slate-700 outline-none focus:border-[#E8272C] focus:ring-4 focus:ring-red-50" /></label>{commentsError && <p role="alert" className="text-sm font-medium text-[#E8272C]">{commentsError}</p>}<div className="flex justify-end gap-3"><button type="button" onClick={() => { setShowFurtherDetails(false); setCommentsError('') }} className="rounded-xl border border-slate-300 px-5 py-2.5 font-bold text-slate-700">Cancel</button><button type="button" onClick={sendFurtherDetails} disabled={furtherDetailsMutation.isPending} className="rounded-xl bg-[#E8272C] px-5 py-2.5 font-bold text-white disabled:opacity-60">{furtherDetailsMutation.isPending ? 'Sending…' : 'Send'}</button></div></CardContent></Card></div>}
  </main>
}
