import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { ApiErrorCard } from '../components/ApiErrorCard'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'

type Reason = { id: string; label: string }
type FormValues = {
  vendorName: string
  vendorAddress: string
  contactPerson: string
  contactEmail: string
  reasonId: string
  reasonOther: string
}

type CreateResponse = { success: boolean; id: string; message: string }

export function RegisterVendorPage() {
  const { user } = useAuth()
  const [reasons, setReasons] = useState<Reason[]>([])
  const [isLoadingReasons, setIsLoadingReasons] = useState(true)
  const [hasReasonsError, setHasReasonsError] = useState(false)
  const otherReasonId = reasons.find((reason) => reason.label === 'Other')?.id
  const schema = useMemo(() => z.object({
    vendorName: z.string().trim().min(1, 'Vendor legal name is required'),
    vendorAddress: z.string().trim().min(1, 'Vendor legal address is required'),
    contactPerson: z.string().trim().min(1, 'Contact person is required'),
    contactEmail: z.string().trim().email('Enter a valid email address'),
    reasonId: z.string().min(1, 'Select a reason for consideration'),
    reasonOther: z.string(),
  }).superRefine((values, context) => {
    if (values.reasonId === otherReasonId && !values.reasonOther.trim()) {
      context.addIssue({ code: 'custom', path: ['reasonOther'], message: 'Please explain the reason' })
    }
  }), [otherReasonId])

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { vendorName: '', vendorAddress: '', contactPerson: '', contactEmail: '', reasonId: '', reasonOther: '' },
  })
  const selectedReasonId = watch('reasonId')
  const isOther = selectedReasonId === otherReasonId

  useEffect(() => {
    async function loadReasons() {
      try {
        const { data } = await api.get<Reason[]>('/lists/reasons')
        setReasons(data)
      } catch {
        setHasReasonsError(true)
      } finally {
        setIsLoadingReasons(false)
      }
    }

    void loadReasons()
  }, [])

  if (isLoadingReasons) return <main className="mx-auto max-w-2xl p-6"><Card><CardHeader><div className="h-7 w-52 animate-pulse rounded bg-slate-100" /><div className="h-4 w-72 animate-pulse rounded bg-slate-100" /></CardHeader><CardContent><div className="space-y-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-16 animate-pulse rounded-xl bg-slate-100" />)}</div></CardContent></Card></main>
  if (hasReasonsError) return <main className="mx-auto max-w-2xl p-6"><ApiErrorCard message="We could not load the vendor request form. Please refresh and try again." /></main>

  async function onSubmit(values: FormValues) {
    const { data } = await api.post<CreateResponse>('/requests', values)
    toast.success(`Vendor request created (ID: ${data.id})`)
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <Card>
        <CardHeader>
          <CardTitle>Vendor Registration</CardTitle>
          <CardDescription>Submit a vendor for consideration.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <p className="rounded bg-slate-100 px-3 py-2 text-sm">Requester: <span className="font-medium">{user?.name}</span></p>
            <label className="block text-sm font-medium">Vendor Legal Name
              <input {...register('vendorName')} className="mt-1 w-full rounded border border-slate-300 px-3 py-2" />
              {errors.vendorName && <span className="text-sm text-[#E8272C]">{errors.vendorName.message}</span>}
            </label>
            <label className="block text-sm font-medium">Vendor Legal Address
              <textarea {...register('vendorAddress')} rows={3} className="mt-1 w-full rounded border border-slate-300 px-3 py-2" />
              {errors.vendorAddress && <span className="text-sm text-[#E8272C]">{errors.vendorAddress.message}</span>}
            </label>
            <label className="block text-sm font-medium">Contact Person
              <input {...register('contactPerson')} className="mt-1 w-full rounded border border-slate-300 px-3 py-2" />
              {errors.contactPerson && <span className="text-sm text-[#E8272C]">{errors.contactPerson.message}</span>}
            </label>
            <label className="block text-sm font-medium">Contact Email
              <input {...register('contactEmail')} type="email" className="mt-1 w-full rounded border border-slate-300 px-3 py-2" />
              {errors.contactEmail && <span className="text-sm text-[#E8272C]">{errors.contactEmail.message}</span>}
            </label>
            <label className="block text-sm font-medium">Reason for Consideration
              <select {...register('reasonId')} disabled={isLoadingReasons} className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2">
                <option value="">{isLoadingReasons ? 'Loading reasons…' : 'Select a reason'}</option>
                {reasons.map((reason) => <option key={reason.id} value={reason.id}>{reason.label}</option>)}
              </select>
              {errors.reasonId && <span className="text-sm text-[#E8272C]">{errors.reasonId.message}</span>}
            </label>
            {isOther && <label className="block text-sm font-medium">Please explain
              <textarea {...register('reasonOther')} rows={3} className="mt-1 w-full rounded border border-slate-300 px-3 py-2" />
              {errors.reasonOther && <span className="text-sm text-[#E8272C]">{errors.reasonOther.message}</span>}
            </label>}
            <button type="submit" disabled={isSubmitting || isLoadingReasons} className="rounded bg-[#E8272C] px-4 py-2 font-semibold text-white disabled:opacity-60">
              {isSubmitting ? 'Submitting…' : 'Submit Request'}
            </button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
