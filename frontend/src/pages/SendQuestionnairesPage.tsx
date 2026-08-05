import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Mail } from 'lucide-react'
import { ApiErrorCard } from '../components/ApiErrorCard'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { api } from '../lib/api'

type PendingQuestionnaire = {
  id: string
  vendorName: string
  contactPerson: string
  contactEmail: string
}

function PendingSkeleton() {
  return <Table><TableHeader><TableRow><TableHead>Vendor Name</TableHead><TableHead>Contact Person</TableHead><TableHead>Contact Email</TableHead><TableHead>Action</TableHead></TableRow></TableHeader><TableBody>{Array.from({ length: 3 }, (_, index) => <TableRow key={index}>{Array.from({ length: 4 }, (_, cellIndex) => <TableCell key={cellIndex}><div className="h-4 animate-pulse rounded bg-slate-200" /></TableCell>)}</TableRow>)}</TableBody></Table>
}

export function SendQuestionnairesPage() {
  const queryClient = useQueryClient()
  const { data: questionnaires = [], isLoading, isError } = useQuery({
    queryKey: ['pending-questionnaires'],
    queryFn: async () => (await api.get<PendingQuestionnaire[]>('/questionnaires/pending')).data,
  })
  const sendMutation = useMutation({
    mutationFn: async (id: string) => (await api.post<{ success: boolean; id: string; message: string }>(`/questionnaires/${id}/send`)).data,
    onSuccess: () => {
      toast.success('Questionnaire sent successfully')
      void queryClient.invalidateQueries({ queryKey: ['pending-questionnaires'] })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Unable to send questionnaire'),
  })

  return (
    <main className="mx-auto max-w-7xl p-6"><Card><CardHeader><CardTitle>Send Questionnaires</CardTitle></CardHeader><CardContent>
      {isLoading ? <PendingSkeleton /> : isError ? <ApiErrorCard /> : questionnaires.length === 0 ? <div className="flex flex-col items-center py-14 text-center text-slate-500"><Mail className="mb-3 size-9 text-slate-400" /><p>There are no vendors pending a questionnaire.</p></div> : <Table>
        <TableHeader><TableRow><TableHead>Vendor Name</TableHead><TableHead>Contact Person</TableHead><TableHead>Contact Email</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
        <TableBody>{questionnaires.map((questionnaire) => <TableRow key={questionnaire.id}><TableCell className="font-medium">{questionnaire.vendorName}</TableCell><TableCell>{questionnaire.contactPerson}</TableCell><TableCell>{questionnaire.contactEmail}</TableCell><TableCell><button type="button" onClick={() => sendMutation.mutate(questionnaire.id)} disabled={sendMutation.isPending} className="rounded bg-[#E8272C] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">Send Questionnaire</button></TableCell></TableRow>)}</TableBody>
      </Table>}
    </CardContent></Card></main>
  )
}
