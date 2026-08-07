import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, FileText, Paperclip, X } from 'lucide-react'
import { isAxiosError } from 'axios'
import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { questions } from '../config/questions'
import { api } from '../lib/api'
import { ApiErrorCard } from './ApiErrorCard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'

type Reason = { id: string; label: string }
type Answers = Record<(typeof questions)[number]['key'], string>
type FormValues = {
  vendorName: string
  vendorAddress: string
  contactPerson: string
  contactEmail: string
  reasonId: string
  reasonOther: string
  answers: Answers
}
type CreateResponse = { success: boolean; id: string; attachmentCount?: number; message: string }
type CaptchaChallenge = { token: string; prompt: string; expiresAt: string }

type VendorRegistrationFormProps = {
  mode: 'internal' | 'public'
  requesterName?: string
}

const emptyAnswers: Answers = { q1: '', q2: '', q3: '', q4: '', q5: '' }
const allowedDocumentExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx']
const maximumDocumentSize = 10 * 1024 * 1024

export function VendorRegistrationForm({ mode, requesterName }: VendorRegistrationFormProps) {
  const isPublic = mode === 'public'
  const [reasons, setReasons] = useState<Reason[]>([])
  const [isLoadingReasons, setIsLoadingReasons] = useState(true)
  const [hasReasonsError, setHasReasonsError] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submittedId, setSubmittedId] = useState('')
  const [documents, setDocuments] = useState<File[]>([])
  const [attachmentError, setAttachmentError] = useState('')
  const [captcha, setCaptcha] = useState<CaptchaChallenge | null>(null)
  const [captchaAnswer, setCaptchaAnswer] = useState('')
  const [captchaVerificationToken, setCaptchaVerificationToken] = useState('')
  const [captchaError, setCaptchaError] = useState('')
  const [isCaptchaLoading, setIsCaptchaLoading] = useState(isPublic)
  const [isCaptchaVerifying, setIsCaptchaVerifying] = useState(false)
  const otherReasonId = reasons.find((reason) => reason.label.trim() === 'Other')?.id
  const schema = useMemo(() => z.object({
    vendorName: z.string().trim().min(1, 'Vendor legal name is required'),
    vendorAddress: z.string().trim().min(1, 'Vendor legal address is required'),
    contactPerson: z.string().trim().min(1, 'Contact person is required'),
    contactEmail: z.string().trim().min(1, 'Contact email is required').email('Enter a valid email address'),
    reasonId: z.string().min(1, 'Select a reason for consideration'),
    reasonOther: z.string(),
    answers: z.object({ q1: z.string(), q2: z.string(), q3: z.string(), q4: z.string(), q5: z.string() }),
  }).superRefine((values, context) => {
    if (values.reasonId === otherReasonId && !values.reasonOther.trim()) {
      context.addIssue({ code: 'custom', path: ['reasonOther'], message: 'Please explain the reason' })
    }
    if (isPublic) {
      for (const question of questions) {
        if (!values.answers[question.key].trim()) {
          context.addIssue({ code: 'custom', path: ['answers', question.key], message: 'This answer is required' })
        }
      }
    }
  }), [isPublic, otherReasonId])

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      vendorName: '',
      vendorAddress: '',
      contactPerson: '',
      contactEmail: '',
      reasonId: '',
      reasonOther: '',
      answers: emptyAnswers,
    },
  })
  const selectedReasonId = watch('reasonId')
  const isOther = selectedReasonId === otherReasonId

  function selectDocuments(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? [])
    event.target.value = ''
    const additions = selected.filter((selectedFile) => !documents.some(
      (existingFile) => existingFile.name === selectedFile.name
        && existingFile.size === selectedFile.size
        && existingFile.lastModified === selectedFile.lastModified,
    ))
    const combined = [...documents, ...additions]

    if (combined.length > 10) {
      setAttachmentError('Select no more than 10 documents')
      return
    }

    const invalidType = selected.find((file) => !allowedDocumentExtensions.some((extension) => file.name.toLowerCase().endsWith(extension)))
    if (invalidType) {
      setAttachmentError('Only PDF, Word, and Excel documents are allowed')
      return
    }

    const oversized = selected.find((file) => file.size > maximumDocumentSize)
    if (oversized) {
      setAttachmentError('Each document must be 10 MB or smaller')
      return
    }

    setAttachmentError('')
    setDocuments(combined)
  }

  function removeDocument(index: number) {
    setDocuments((current) => current.filter((_file, fileIndex) => fileIndex !== index))
  }

  useEffect(() => {
    async function loadReasons() {
      try {
        const endpoint = isPublic ? '/vendor/reasons' : '/lists/reasons'
        const { data } = await api.get<Reason[]>(endpoint)
        setReasons(data)
      } catch {
        setHasReasonsError(true)
      } finally {
        setIsLoadingReasons(false)
      }
    }

    void loadReasons()
  }, [isPublic])

  const loadCaptcha = useCallback(async () => {
    if (!isPublic) return
    setIsCaptchaLoading(true)
    setCaptchaError('')
    setCaptchaAnswer('')
    setCaptchaVerificationToken('')
    try {
      const { data } = await api.get<CaptchaChallenge>('/vendor/captcha')
      setCaptcha(data)
    } catch {
      setCaptcha(null)
      setCaptchaError('The security check is unavailable. Please refresh and try again.')
    } finally {
      setIsCaptchaLoading(false)
    }
  }, [isPublic])

  useEffect(() => {
    void loadCaptcha()
  }, [loadCaptcha])

  async function verifyCaptcha() {
    if (!captcha || !captchaAnswer.trim()) {
      setCaptchaError('Enter your answer before verifying.')
      return
    }
    setIsCaptchaVerifying(true)
    setCaptchaError('')
    try {
      const { data } = await api.post<{ verificationToken: string }>('/vendor/captcha/verify', { token: captcha.token, answer: captchaAnswer.trim() })
      setCaptchaVerificationToken(data.verificationToken)
    } catch (error) {
      const message = isAxiosError<{ message?: string }>(error) ? error.response?.data?.message : undefined
      await loadCaptcha()
      setCaptchaError(message ?? 'The security check could not be verified. Please try again.')
    } finally {
      setIsCaptchaVerifying(false)
    }
  }

  async function onSubmit(values: FormValues) {
    setSubmitError('')
    if (attachmentError) return
    if (isPublic && !captchaVerificationToken) {
      setCaptchaError('Complete the security check before submitting.')
      return
    }
    try {
      const endpoint = isPublic ? '/vendor/requests' : '/requests'
      const body = isPublic ? new FormData() : {
        vendorName: values.vendorName,
        vendorAddress: values.vendorAddress,
        contactPerson: values.contactPerson,
        contactEmail: values.contactEmail,
        reasonId: values.reasonId,
        reasonOther: values.reasonOther,
      }
      if (body instanceof FormData) {
        body.append('vendorName', values.vendorName)
        body.append('vendorAddress', values.vendorAddress)
        body.append('contactPerson', values.contactPerson)
        body.append('contactEmail', values.contactEmail)
        body.append('reasonId', values.reasonId)
        body.append('reasonOther', values.reasonOther)
        body.append('answers', JSON.stringify(values.answers))
        body.append('captchaVerificationToken', captchaVerificationToken)
        for (const document of documents) body.append('documents', document)
      }
      const { data } = await api.post<CreateResponse>(endpoint, body)
      if (isPublic) setSubmittedId(data.id)
      else toast.success(`Vendor request created (ID: ${data.id})`)
    } catch (error) {
      const message = isAxiosError<{ message?: string }>(error) ? error.response?.data?.message : undefined
      setSubmitError(message ?? 'Unable to submit the vendor registration. Please review the form and try again.')
      if (isPublic) await loadCaptcha()
    }
  }

  if (isLoadingReasons) return <Card><CardHeader><div className="h-7 w-52 animate-pulse rounded bg-slate-100" /><div className="h-4 w-72 animate-pulse rounded bg-slate-100" /></CardHeader><CardContent><div className="space-y-4">{Array.from({ length: isPublic ? 9 : 4 }, (_, index) => <div key={index} className="h-16 animate-pulse rounded-xl bg-slate-100" />)}</div></CardContent></Card>
  if (hasReasonsError) return <ApiErrorCard message="We could not load the vendor registration form. Please refresh and try again." />
  if (submittedId) return <Card className="border-emerald-200 shadow-[0_24px_70px_rgba(16,185,129,0.12)]"><CardContent className="py-14 text-center"><span className="mx-auto grid size-20 place-items-center rounded-full bg-emerald-50"><CheckCircle2 className="size-11 text-emerald-600" /></span><p className="mt-6 text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">Successfully submitted</p><h2 className="mt-2 text-3xl font-bold">Your registration has been received</h2><p className="mx-auto mt-4 max-w-xl text-base leading-7 text-slate-600">Thank you for your interest in becoming a Folio3 vendor. Our procurement and vendor management team will review your application and contact you if any additional information is required.</p><p className="mt-5 text-sm text-slate-500">Registration reference: <strong className="text-[#1F3864]">{submittedId}</strong></p></CardContent></Card>

  return (
    <Card className={isPublic ? 'border-white/80 shadow-[0_24px_70px_rgba(31,56,100,0.14)]' : undefined}>
      <CardHeader className="border-b border-slate-100">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#E8272C]">{isPublic ? 'Partner registration' : 'New request'}</p>
        <CardTitle>{isPublic ? 'Tell us about your organization' : 'Vendor Registration'}</CardTitle>
        <CardDescription>{isPublic ? 'Complete every field marked * below. Supporting documents are optional.' : 'Submit a vendor for consideration.'}</CardDescription>
      </CardHeader>
      <CardContent className="pt-7">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-7">
          {!isPublic && <p className="rounded-xl bg-slate-100 px-4 py-3 text-sm">Requester: <span className="font-semibold text-[#1F3864]">{requesterName}</span></p>}
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-[#1F3864] sm:col-span-2">Vendor Legal Name <span className="text-[#E8272C]" aria-hidden="true">*</span>
              <input {...register('vendorName')} required className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#E8272C] focus:ring-4 focus:ring-red-50" />
              {errors.vendorName && <span className="mt-1 block text-sm text-[#E8272C]">{errors.vendorName.message}</span>}
            </label>
            <label className="block text-sm font-semibold text-[#1F3864] sm:col-span-2">Vendor Legal Address <span className="text-[#E8272C]" aria-hidden="true">*</span>
              <textarea {...register('vendorAddress')} required rows={3} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#E8272C] focus:ring-4 focus:ring-red-50" />
              {errors.vendorAddress && <span className="mt-1 block text-sm text-[#E8272C]">{errors.vendorAddress.message}</span>}
            </label>
            <label className="block text-sm font-semibold text-[#1F3864]">Contact Person <span className="text-[#E8272C]" aria-hidden="true">*</span>
              <input {...register('contactPerson')} required className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#E8272C] focus:ring-4 focus:ring-red-50" />
              {errors.contactPerson && <span className="mt-1 block text-sm text-[#E8272C]">{errors.contactPerson.message}</span>}
            </label>
            <label className="block text-sm font-semibold text-[#1F3864]">Contact Email <span className="text-[#E8272C]" aria-hidden="true">*</span>
              <input {...register('contactEmail')} type="email" required className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#E8272C] focus:ring-4 focus:ring-red-50" />
              {errors.contactEmail && <span className="mt-1 block text-sm text-[#E8272C]">{errors.contactEmail.message}</span>}
            </label>
            <label className="block text-sm font-semibold text-[#1F3864] sm:col-span-2">Reason for Consideration <span className="text-[#E8272C]" aria-hidden="true">*</span>
              <select {...register('reasonId')} required className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-[#E8272C] focus:ring-4 focus:ring-red-50">
                <option value="">Select a reason</option>
                {reasons.map((reason) => <option key={reason.id} value={reason.id}>{reason.label.trim()}</option>)}
              </select>
              {errors.reasonId && <span className="mt-1 block text-sm text-[#E8272C]">{errors.reasonId.message}</span>}
            </label>
            {isOther && <label className="block text-sm font-semibold text-[#1F3864] sm:col-span-2">Please explain <span className="text-[#E8272C]" aria-hidden="true">*</span>
              <textarea {...register('reasonOther')} required rows={3} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#E8272C] focus:ring-4 focus:ring-red-50" />
              {errors.reasonOther && <span className="mt-1 block text-sm text-[#E8272C]">{errors.reasonOther.message}</span>}
            </label>}
          </div>

          {isPublic && <section className="border-t border-slate-200 pt-7"><h3 className="text-xl font-bold">Supporting documents <span className="text-sm font-medium text-slate-500">(Optional)</span></h3><p className="mt-2 text-sm text-slate-500">Attach up to 10 PDF, Word, or Excel documents. Each file can be up to 10 MB.</p><label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center hover:border-[#E8272C] hover:bg-red-50/40"><Paperclip className="size-8 text-[#E8272C]" /><span className="mt-3 font-bold text-[#1F3864]">Choose documents</span><span className="mt-1 text-sm text-slate-500">PDF, DOC, DOCX, XLS, XLSX</span><input type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx" onChange={selectDocuments} className="sr-only" /></label>{attachmentError && <p className="mt-2 text-sm font-medium text-[#E8272C]">{attachmentError}</p>}{documents.length > 0 && <ul className="mt-4 space-y-2">{documents.map((document, index) => <li key={`${document.name}-${document.lastModified}`} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"><FileText className="size-5 shrink-0 text-[#1F3864]" /><span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">{document.name}</span><span className="text-xs text-slate-400">{(document.size / 1024 / 1024).toFixed(1)} MB</span><button type="button" onClick={() => removeDocument(index)} aria-label={`Remove ${document.name}`} className="rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-[#E8272C]"><X className="size-4" /></button></li>)}</ul>}</section>}

          {isPublic && <section className="border-t border-slate-200 pt-7"><h3 className="text-xl font-bold">Vendor due-diligence questionnaire</h3><p className="mt-2 text-sm text-slate-500">Please provide complete answers so our team can evaluate your organization.</p><div className="mt-6 space-y-6">{questions.map((question) => <label key={question.id} className="block text-sm font-semibold leading-6 text-[#1F3864]"><span className="mr-2 inline-grid size-7 place-items-center rounded-full bg-red-50 text-xs text-[#E8272C]">{question.id}</span>{question.label} <span className="text-[#E8272C]" aria-hidden="true">*</span><textarea {...register(`answers.${question.key}`)} required rows={4} className="mt-3 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal text-slate-700 outline-none focus:border-[#E8272C] focus:ring-4 focus:ring-red-50" />{errors.answers?.[question.key] && <span className="mt-1 block text-sm font-normal text-[#E8272C]">{errors.answers[question.key]?.message}</span>}</label>)}</div></section>}

          {isPublic && <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#1F3864]">Security check</p>
            <p className="mt-1 text-sm text-slate-500">Please answer and verify this short question to confirm you are a person.</p>
            {isCaptchaLoading ? <div className="mt-4 h-12 animate-pulse rounded-xl bg-slate-200" /> : captcha ? <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="flex-1 text-sm font-semibold text-[#1F3864]">{captcha.prompt} <span className="text-[#E8272C]" aria-hidden="true">*</span><input value={captchaAnswer} required disabled={Boolean(captchaVerificationToken)} onChange={(event) => { setCaptchaAnswer(event.target.value); setCaptchaError('') }} inputMode="numeric" autoComplete="off" className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-[#E8272C] focus:ring-4 focus:ring-red-50 disabled:bg-emerald-50" /></label>
              {captchaVerificationToken ? <span className="rounded-xl bg-emerald-100 px-4 py-3 text-center text-sm font-bold text-emerald-700">Verified</span> : <button type="button" disabled={isCaptchaVerifying || !captchaAnswer.trim()} onClick={() => void verifyCaptcha()} className="rounded-xl bg-[#1F3864] px-4 py-3 text-sm font-bold text-white hover:bg-[#162A4D] disabled:cursor-not-allowed disabled:opacity-50">{isCaptchaVerifying ? 'Verifying…' : 'Verify answer'}</button>}
              <button type="button" onClick={() => void loadCaptcha()} className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-[#1F3864] hover:border-[#E8272C] hover:text-[#E8272C]">New question</button>
            </div> : <button type="button" onClick={() => void loadCaptcha()} className="mt-4 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-[#1F3864]">Try security check again</button>}
            {captchaError && <p role="alert" className="mt-2 text-sm font-medium text-[#E8272C]">{captchaError}</p>}
          </section>}

          {submitError && <p role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-[#C31D22]">{submitError}</p>}
          <button type="submit" disabled={isSubmitting || (isPublic && !captchaVerificationToken)} className="w-full rounded-xl bg-[#E8272C] px-5 py-3.5 font-bold text-white shadow-lg shadow-red-200 hover:bg-[#C31D22] disabled:cursor-not-allowed disabled:opacity-60">{isSubmitting ? 'Submitting…' : isPublic ? 'Submit Vendor Registration' : 'Submit Request'}</button>
        </form>
      </CardContent>
    </Card>
  )
}
