import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, ClipboardCheck, ClipboardList, FileCheck2, ShieldCheck, XCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ApiErrorCard } from '../components/ApiErrorCard'
import { Card, CardContent } from '../components/ui/card'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'

type DashboardData = {
  vendorRequests: null | { total: number; pendingApproval: number; approved: number; rejected: number; processed: number }
}

function MetricCard({ label, value, icon: Icon, tone }: { label: string; value: number; icon: typeof ClipboardList; tone: string }) {
  return <Card><CardContent className="flex items-center justify-between p-6"><div><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-2 text-3xl font-semibold text-[#1F3864]">{value}</p></div><span className={`grid size-12 place-items-center rounded-xl ${tone}`}><Icon className="size-6" /></span></CardContent></Card>
}

function DashboardSkeleton() {
  return <div className="space-y-8"><div className="h-9 w-72 animate-pulse rounded bg-slate-200" /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-32 animate-pulse rounded-2xl bg-slate-100" />)}</div><div className="h-48 animate-pulse rounded-2xl bg-slate-100" /></div>
}

export function DashboardPage() {
  const { user } = useAuth()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => (await api.get<DashboardData>('/dashboard')).data,
  })

  if (isLoading) return <main className="mx-auto w-full max-w-7xl p-6"><DashboardSkeleton /></main>
  if (isError) return <main className="mx-auto w-full max-w-7xl p-6"><ApiErrorCard message="We could not load your dashboard. Please refresh and try again." /></main>

  const vendorRequests = data!.vendorRequests
  return (
    <main className="mx-auto w-full max-w-7xl p-6 sm:p-8">
      <section className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#E8272C]">Reviewer workspace</p><h1 className="text-3xl font-semibold text-[#1F3864]">Welcome back, {user?.name?.split(' ')[0]}</h1><p className="mt-2 text-slate-500">Review and manage vendor registrations submitted through the public portal.</p></div>{vendorRequests && <Link to="/requests" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#E8272C] px-4 py-3 font-semibold text-white shadow-lg shadow-red-100 hover:bg-[#C31D22]"><ClipboardCheck className="size-4" />Open Review Queue</Link>}</section>

      {vendorRequests ? <section><h2 className="mb-4 text-lg font-semibold text-[#1F3864]">Vendor Registration Overview</h2><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"><MetricCard label="Total Registrations" value={vendorRequests.total} icon={ClipboardList} tone="bg-slate-100 text-[#1F3864]" /><MetricCard label="Pending Review" value={vendorRequests.pendingApproval} icon={ClipboardCheck} tone="bg-amber-100 text-amber-700" /><MetricCard label="Approved" value={vendorRequests.approved} icon={CheckCircle2} tone="bg-green-100 text-green-700" /><MetricCard label="Rejected" value={vendorRequests.rejected} icon={XCircle} tone="bg-red-100 text-red-700" /><MetricCard label="Processed" value={vendorRequests.processed} icon={FileCheck2} tone="bg-blue-100 text-blue-700" /></div></section> : <Card><CardContent className="flex flex-col items-center py-14 text-center"><ShieldCheck className="mb-4 size-10 text-slate-400" /><h2 className="text-xl font-semibold text-[#1F3864]">Reviewer access required</h2><p className="mt-2 max-w-lg text-slate-500">Vendor registration review is available to Finance Managers and Administrators.</p></CardContent></Card>}

    </main>
  )
}
