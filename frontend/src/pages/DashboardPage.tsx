import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, ClipboardCheck, ClipboardList, FileCheck2, Send, UserRoundPlus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ApiErrorCard } from '../components/ApiErrorCard'
import { Card, CardContent } from '../components/ui/card'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'

type DashboardData = {
  myRequests: { total: number; pendingApproval: number; approved: number; processed: number }
  operations: null | { pendingApprovals: number; approvedRequests: number; pendingQuestionnaires: number; submittedQuestionnaires: number }
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

  const operations = data!.operations
  return (
    <main className="mx-auto w-full max-w-7xl p-6 sm:p-8">
      <section className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#E8272C]">Workspace overview</p><h1 className="text-3xl font-semibold text-[#1F3864]">Welcome back, {user?.name?.split(' ')[0]}</h1><p className="mt-2 text-slate-500">Stay on top of your vendor onboarding workflow.</p></div><Link to="/register" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#E8272C] px-4 py-3 font-semibold text-white shadow-lg shadow-red-100 hover:bg-[#C31D22]"><UserRoundPlus className="size-4" />New Vendor Request</Link></section>

      <section><h2 className="mb-4 text-lg font-semibold text-[#1F3864]">My Requests</h2><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Total Requests" value={data!.myRequests.total} icon={ClipboardList} tone="bg-slate-100 text-[#1F3864]" /><MetricCard label="Pending Approval" value={data!.myRequests.pendingApproval} icon={ClipboardCheck} tone="bg-amber-100 text-amber-700" /><MetricCard label="Approved" value={data!.myRequests.approved} icon={CheckCircle2} tone="bg-green-100 text-green-700" /><MetricCard label="Processed" value={data!.myRequests.processed} icon={FileCheck2} tone="bg-blue-100 text-blue-700" /></div></section>

      {operations && <section className="mt-10"><h2 className="mb-4 text-lg font-semibold text-[#1F3864]">Operations Queue</h2><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><Link to="/requests"><MetricCard label="Pending Approvals" value={operations.pendingApprovals} icon={ClipboardCheck} tone="bg-amber-100 text-amber-700" /></Link><Link to="/requests"><MetricCard label="Approved - Go Live" value={operations.approvedRequests} icon={CheckCircle2} tone="bg-green-100 text-green-700" /></Link><Link to="/questionnaires/send"><MetricCard label="Questionnaires to Send" value={operations.pendingQuestionnaires} icon={Send} tone="bg-blue-100 text-blue-700" /></Link><Link to="/questionnaires/review"><MetricCard label="Ready for Review" value={operations.submittedQuestionnaires} icon={FileCheck2} tone="bg-violet-100 text-violet-700" /></Link></div></section>}

      <section className="mt-10"><Card className="bg-gradient-to-r from-[#1F3864] to-[#294b83] text-white"><CardContent className="flex flex-col justify-between gap-5 p-7 sm:flex-row sm:items-center"><div><h2 className="text-xl font-semibold text-white">Keep your workflow moving</h2><p className="mt-2 max-w-xl text-slate-200">View the current status of your vendor requests or start a new onboarding request.</p></div><Link to="/requests" className="rounded-xl bg-white px-4 py-3 text-center font-semibold text-[#1F3864] hover:bg-slate-100">View My Requests</Link></CardContent></Card></section>
    </main>
  )
}
