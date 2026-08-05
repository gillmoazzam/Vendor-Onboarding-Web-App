import { useMutation, useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useParams, useSearchParams } from 'react-router-dom'
import { questions } from '../config/questions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { api } from '../lib/api'

type Answers = Record<(typeof questions)[number]['key'], string>
type Questionnaire = { vendorName: string; questionnaireStatus: 'Not Started' | 'Sent' | 'Submitted' | 'Approved' }

function QuestionnairePanel({ title, children }: { title: string; children: React.ReactNode }) {
  return <main className="grid min-h-screen place-items-center bg-slate-50 p-6"><Card className="w-full max-w-xl"><CardHeader><p className="text-2xl font-bold text-[#E8272C]">Folio3</p><CardTitle>{title}</CardTitle></CardHeader><CardContent><p>{children}</p></CardContent></Card></main>
}

export function QuestionnairePage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const { register, handleSubmit, formState: { errors } } = useForm<Answers>({ defaultValues: { q1: '', q2: '', q3: '', q4: '', q5: '' } })
  const questionnaireQuery = useQuery({
    queryKey: ['questionnaire', id, token],
    enabled: Boolean(id && token),
    queryFn: async () => (await api.get<Questionnaire>(`/questionnaires/${id}?token=${encodeURIComponent(token!)}`)).data,
  })
  const submitMutation = useMutation({
    mutationFn: async (answers: Answers) => (await api.post<{ success: boolean }>(`/questionnaires/${id}/submit`, { token, answers })).data,
  })

  if (!id || !token) return <QuestionnairePanel title="Invalid questionnaire link">This questionnaire link is incomplete.</QuestionnairePanel>
  if (questionnaireQuery.isLoading) return <QuestionnairePanel title="Loading questionnaire"><span className="block h-5 w-52 animate-pulse rounded bg-slate-100" /></QuestionnairePanel>
  if (questionnaireQuery.isError) return <QuestionnairePanel title="Invalid questionnaire link">This questionnaire link is invalid or has expired.</QuestionnairePanel>
  if (submitMutation.isSuccess || questionnaireQuery.data!.questionnaireStatus === 'Submitted' || questionnaireQuery.data!.questionnaireStatus === 'Approved') {
    return <QuestionnairePanel title="Thank you">Your questionnaire has been received.</QuestionnairePanel>
  }

  const questionnaire = questionnaireQuery.data!
  return (
    <main className="mx-auto max-w-3xl p-6"><Card><CardHeader><p className="text-2xl font-bold text-[#E8272C]">Folio3</p><CardTitle>Vendor Questionnaire</CardTitle><CardDescription>{questionnaire.vendorName}</CardDescription></CardHeader><CardContent>
      <form onSubmit={handleSubmit((answers) => submitMutation.mutate(answers))} className="space-y-6">
        {questions.map((question) => <label key={question.id} className="block text-sm font-medium"><span>{question.id}. {question.label}</span><textarea {...register(question.key, { required: 'This answer is required' })} rows={4} className="mt-2 w-full rounded border border-slate-300 px-3 py-2" />{errors[question.key] && <span className="text-sm text-[#E8272C]">{errors[question.key]?.message}</span>}</label>)}
        {submitMutation.isError && <p className="text-sm text-[#E8272C]">Unable to submit the questionnaire. Please try again.</p>}
        <button type="submit" disabled={submitMutation.isPending} className="rounded bg-[#E8272C] px-4 py-2 font-semibold text-white disabled:opacity-60">{submitMutation.isPending ? 'Submitting…' : 'Submit Questionnaire'}</button>
      </form>
    </CardContent></Card></main>
  )
}
