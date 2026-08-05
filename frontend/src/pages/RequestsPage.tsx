import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { ClipboardList } from 'lucide-react'
import { ApiErrorCard } from '../components/ApiErrorCard'
import { Badge } from '../components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { api } from '../lib/api'

type RequestStatus = 'Pending Approval' | 'Approved' | 'Rejected' | 'Processed'
type VendorRequest = {
  id: string
  vendorName: string
  contactEmail: string
  requestDate: string
  status: RequestStatus
  createdVendorId: string | null
}

const badgeClasses: Record<RequestStatus, string> = {
  'Pending Approval': 'bg-amber-100 text-amber-800',
  Approved: 'bg-green-100 text-green-800',
  Rejected: 'bg-red-100 text-red-800',
  Processed: 'bg-blue-100 text-blue-800',
}

function RequestsSkeleton() {
  return (
    <Table>
      <TableHeader><TableRow>{['Vendor Name', 'Contact Email', 'Request Date', 'Status', 'Actions'].map((label) => <TableHead key={label}>{label}</TableHead>)}</TableRow></TableHeader>
      <TableBody>{Array.from({ length: 3 }, (_, index) => <TableRow key={index}>{Array.from({ length: 5 }, (_, cellIndex) => <TableCell key={cellIndex}><div className="h-4 animate-pulse rounded bg-slate-200" /></TableCell>)}</TableRow>)}</TableBody>
    </Table>
  )
}

export function RequestsPage() {
  const queryClient = useQueryClient()
  const [goLiveRequest, setGoLiveRequest] = useState<VendorRequest | null>(null)
  const { data: requests = [], isLoading, isError } = useQuery({
    queryKey: ['requests'],
    queryFn: async () => (await api.get<VendorRequest[]>('/requests')).data,
  })
  const goLiveMutation = useMutation({
    mutationFn: async (requestId: string) => (await api.post<{ success: boolean; vendorId: string; vendorName: string }>(`/requests/${requestId}/golive`)).data,
    onSuccess: (data) => {
      toast.success(`${data.vendorName} is live (Vendor ID: ${data.vendorId})`)
      setGoLiveRequest(null)
      void queryClient.invalidateQueries({ queryKey: ['requests'] })
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Unable to take this vendor live'
      toast.error(message)
    },
  })

  return (
    <main className="mx-auto max-w-7xl p-6">
      <Card>
        <CardHeader><CardTitle>My Requests</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <RequestsSkeleton /> : isError ? <ApiErrorCard /> : requests.length === 0 ? (
            <div className="flex flex-col items-center py-14 text-center text-slate-500"><ClipboardList className="mb-3 size-9 text-slate-400" /><p>You have not submitted any vendor requests yet.</p></div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Vendor Name</TableHead><TableHead>Contact Email</TableHead><TableHead>Request Date</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {requests.map((request) => <TableRow key={request.id}>
                  <TableCell className="font-medium">{request.vendorName}</TableCell>
                  <TableCell>{request.contactEmail}</TableCell>
                  <TableCell>{new Date(request.requestDate).toLocaleDateString()}</TableCell>
                  <TableCell><Badge className={badgeClasses[request.status]}>{request.status}</Badge></TableCell>
                  <TableCell>
                    {request.status === 'Approved' && <button type="button" onClick={() => setGoLiveRequest(request)} className="rounded bg-[#E8272C] px-3 py-1.5 text-xs font-semibold text-white">Vendor Go Live</button>}
                    {request.status === 'Rejected' && <button type="button" className="rounded border border-slate-300 px-3 py-1.5 text-xs font-semibold">Edit &amp; Resubmit</button>}
                    {request.status === 'Processed' && <span className="text-sm text-slate-600">Vendor ID: {request.createdVendorId}</span>}
                  </TableCell>
                </TableRow>)}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      {goLiveRequest && <div role="dialog" aria-modal="true" aria-labelledby="go-live-title" className="fixed inset-0 grid place-items-center bg-black/40 p-6">
        <Card className="w-full max-w-md">
          <CardHeader><CardTitle id="go-live-title">Confirm Vendor Go Live</CardTitle></CardHeader>
          <CardContent className="space-y-5"><p>Take <strong>{goLiveRequest.vendorName}</strong> live as a vendor?</p><div className="flex justify-end gap-3"><button type="button" onClick={() => setGoLiveRequest(null)} className="rounded border border-slate-300 px-4 py-2 font-semibold">Cancel</button><button type="button" onClick={() => goLiveMutation.mutate(goLiveRequest.id)} disabled={goLiveMutation.isPending} className="rounded bg-[#E8272C] px-4 py-2 font-semibold text-white disabled:opacity-60">{goLiveMutation.isPending ? 'Taking Live…' : 'Confirm Go Live'}</button></div></CardContent>
        </Card>
      </div>}
    </main>
  )
}
