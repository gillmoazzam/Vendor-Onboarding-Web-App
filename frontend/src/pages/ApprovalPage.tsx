import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { api } from '../lib/api'

type ApprovalAction = 'approve' | 'reject'
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
}
type AlreadyDecided = { alreadyDecided: true; status: string }
type DecisionResponse = { success: boolean; status: string }

function isAlreadyDecided(value: VendorRequest | AlreadyDecided): value is AlreadyDecided {
  return 'alreadyDecided' in value
}

export function ApprovalPage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const actionFromUrl = searchParams.get('action')
  const [action, setAction] = useState<ApprovalAction>(actionFromUrl === 'reject' ? 'reject' : 'approve')
  const [comments, setComments] = useState('')
  const [validationError, setValidationError] = useState('')

  const approvalQuery = useQuery({
    queryKey: ['approval', id, token],
    enabled: Boolean(id && token),
    queryFn: async () => (await api.get<VendorRequest | AlreadyDecided>(`/approvals/${id}?token=${encodeURIComponent(token!)}`)).data,
  })
  const decisionMutation = useMutation({
    mutationFn: async () => (await api.post<DecisionResponse>(`/approvals/${id}/decision`, { token, action, comments })).data,
  })

  function submitDecision() {
    setValidationError('')
    if (action === 'reject' && !comments.trim()) {
      setValidationError('A comment is required when rejecting a request.')
      return
    }
    decisionMutation.mutate()
  }

  if (!id || !token) return <ApprovalPanel title="Invalid approval link">This approval link is incomplete.</ApprovalPanel>
  if (approvalQuery.isLoading) return <ApprovalPanel title="Loading request"><span className="block h-5 w-52 animate-pulse rounded bg-slate-100" /></ApprovalPanel>
  if (approvalQuery.isError) return <ApprovalPanel title="Invalid approval link">This approval link is invalid or has expired.</ApprovalPanel>
  if (decisionMutation.isSuccess) return <ApprovalPanel title="Decision recorded">This request has been {decisionMutation.data.status}.</ApprovalPanel>

  const request = approvalQuery.data!
  if (isAlreadyDecided(request)) return <ApprovalPanel title="Request already decided">This request has already been {request.status}.</ApprovalPanel>

  const details: Array<[string, string]> = [
    ['Vendor Legal Name', request.vendorName],
    ['Vendor Legal Address', request.vendorAddress],
    ['Contact Person', request.contactPerson],
    ['Contact Email', request.contactEmail],
    ['Reason for Consideration', request.reasonLabel],
    ['Please explain', request.reasonOther || 'Not provided'],
    ['Requester Name', request.requesterName],
    ['Requester Email', request.requesterEmail],
    ['Request Date', new Date(request.requestDate).toLocaleString()],
  ]

  return (
    <main className="mx-auto max-w-3xl p-6">
      <Card>
        <CardHeader><p className="text-2xl font-bold text-[#E8272C]">Folio3</p><CardTitle>Vendor Request Decision</CardTitle><CardDescription>Review the submitted request and record your decision.</CardDescription></CardHeader>
        <CardContent className="space-y-6">
          <dl className="divide-y rounded border border-slate-200">{details.map(([label, value]) => <div key={label} className="grid grid-cols-1 gap-1 p-3 sm:grid-cols-3"><dt className="font-medium text-slate-600">{label}</dt><dd className="sm:col-span-2">{value}</dd></div>)}</dl>
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">Decision</legend>
            <div className="flex gap-4"><label><input type="radio" checked={action === 'approve'} onChange={() => setAction('approve')} /> Approve</label><label><input type="radio" checked={action === 'reject'} onChange={() => setAction('reject')} /> Reject</label></div>
          </fieldset>
          <label className="block text-sm font-medium">Approver Comments {action === 'reject' && <span className="text-[#E8272C]">(required)</span>}
            <textarea value={comments} onChange={(event) => setComments(event.target.value)} rows={4} className="mt-1 w-full rounded border border-slate-300 px-3 py-2" />
          </label>
          {validationError && <p className="text-sm text-[#E8272C]">{validationError}</p>}
          {decisionMutation.isError && <p className="text-sm text-[#E8272C]">Unable to record the decision. Please try again.</p>}
          <button type="button" onClick={submitDecision} disabled={decisionMutation.isPending} className="rounded bg-[#E8272C] px-4 py-2 font-semibold text-white disabled:opacity-60">
            {decisionMutation.isPending ? 'Submitting…' : action === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
          </button>
        </CardContent>
      </Card>
    </main>
  )
}

function ApprovalPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return <main className="grid min-h-screen place-items-center bg-slate-50 p-6"><Card className="w-full max-w-lg"><CardHeader><p className="text-2xl font-bold text-[#E8272C]">Folio3</p><CardTitle>{title}</CardTitle></CardHeader><CardContent><p>{children}</p></CardContent></Card></main>
}
