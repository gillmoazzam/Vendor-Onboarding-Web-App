import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { ClipboardCheck } from 'lucide-react'
import { ApiErrorCard } from '../components/ApiErrorCard'
import { questions } from '../config/questions'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { api } from '../lib/api'

type SubmittedQuestionnaire = {
  id: string
  vendorName: string
  contactEmail: string
  questionnaireSubmittedDate: string
  answers: Record<(typeof questions)[number]['key'], string>
}

export function ReviewQuestionnairesPage() {
  const queryClient = useQueryClient()
  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState<SubmittedQuestionnaire | null>(null)
  const { data: questionnaires = [], isLoading, isError } = useQuery({
    queryKey: ['submitted-questionnaires'],
    queryFn: async () => (await api.get<SubmittedQuestionnaire[]>('/questionnaires/review')).data,
  })
  const approveMutation = useMutation({
    mutationFn: async (id: string) => (await api.post<{ success: boolean; message: string }>(`/questionnaires/${id}/approve`)).data,
    onSuccess: () => {
      toast.success('Questionnaire approved successfully')
      setSelectedQuestionnaire(null)
      void queryClient.invalidateQueries({ queryKey: ['submitted-questionnaires'] })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Unable to approve questionnaire'),
  })

  async function downloadPdf(questionnaire: SubmittedQuestionnaire) {
    const response = await api.get(`/questionnaires/${questionnaire.id}/pdf`, { responseType: 'blob' })
    const url = URL.createObjectURL(response.data as Blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `vendor-questionnaire-${questionnaire.id}.pdf`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (selectedQuestionnaire) {
    return <main className="mx-auto max-w-3xl p-6"><Card><CardHeader><CardTitle>{selectedQuestionnaire.vendorName}</CardTitle></CardHeader><CardContent className="space-y-6">
      <p className="text-sm text-slate-600">Submitted {new Date(selectedQuestionnaire.questionnaireSubmittedDate).toLocaleString()}</p>
      {questions.map((question) => <section key={question.id} className="rounded border border-slate-200 p-4"><h2 className="font-semibold">{question.id}. {question.label}</h2><p className="mt-3 whitespace-pre-wrap text-slate-700">{selectedQuestionnaire.answers[question.key]}</p></section>)}
      <div className="flex flex-wrap gap-3"><button type="button" onClick={() => approveMutation.mutate(selectedQuestionnaire.id)} disabled={approveMutation.isPending} className="rounded bg-[#E8272C] px-4 py-2 font-semibold text-white disabled:opacity-60">{approveMutation.isPending ? 'Approving…' : 'Approve Questionnaire'}</button><button type="button" onClick={() => void downloadPdf(selectedQuestionnaire)} className="rounded border border-slate-300 px-4 py-2 font-semibold">Download PDF</button><button type="button" onClick={() => setSelectedQuestionnaire(null)} className="px-4 py-2 font-semibold text-slate-600">Back to List</button></div>
    </CardContent></Card></main>
  }

  return <main className="mx-auto max-w-7xl p-6"><Card><CardHeader><CardTitle>Review Questionnaires</CardTitle></CardHeader><CardContent>
    {isLoading ? <div className="space-y-3">{Array.from({ length: 3 }, (_, index) => <div key={index} className="h-14 animate-pulse rounded-xl bg-slate-100" />)}</div> : isError ? <ApiErrorCard /> : questionnaires.length === 0 ? <div className="flex flex-col items-center py-14 text-center text-slate-500"><ClipboardCheck className="mb-3 size-9 text-slate-400" /><p>There are no submitted questionnaires to review.</p></div> : <Table><TableHeader><TableRow><TableHead>Vendor Name</TableHead><TableHead>Contact Email</TableHead><TableHead>Submission Date</TableHead></TableRow></TableHeader><TableBody>{questionnaires.map((questionnaire) => <TableRow key={questionnaire.id} onClick={() => setSelectedQuestionnaire(questionnaire)} className="cursor-pointer"><TableCell className="font-medium">{questionnaire.vendorName}</TableCell><TableCell>{questionnaire.contactEmail}</TableCell><TableCell>{new Date(questionnaire.questionnaireSubmittedDate).toLocaleString()}</TableCell></TableRow>)}</TableBody></Table>}
  </CardContent></Card></main>
}
