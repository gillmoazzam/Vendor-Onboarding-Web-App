import { ArrowRight, LockKeyhole, Mail, ShieldCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import folio3Logo from '../assets/folio3-logo.png'
import loginHero from '../assets/vendor-onboarding-login-hero.png'
import { useAuth } from '../contexts/AuthContext'

export function LoginPage() {
  const { isAuthenticated, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const requestedPath = (location.state as { from?: { pathname?: string; search?: string } } | null)?.from
  const destination = requestedPath?.pathname?.startsWith('/') && !requestedPath.pathname.startsWith('//')
    ? `${requestedPath.pathname}${requestedPath.search ?? ''}`
    : '/'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (isAuthenticated) return <Navigate to={destination} replace />

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      await login(email, password)
      navigate(destination, { replace: true })
    } catch {
      setError('Invalid email or password')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f6fa] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-7xl overflow-hidden rounded-[2rem] bg-white shadow-[0_24px_70px_rgba(31,56,100,0.18)] lg:min-h-[calc(100vh-4rem)] lg:grid-cols-[1.15fr_0.85fr]">
        <section className="relative hidden min-h-full overflow-hidden lg:block">
          <img src={loginHero} alt="Vendor onboarding team reviewing supplier documentation" className="absolute inset-0 size-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#081425]/92 via-[#10213a]/65 to-transparent" />
          <div className="relative flex h-full flex-col justify-between p-10 text-white xl:p-14">
            <div className="flex items-center gap-3 text-sm font-medium"><span className="grid size-9 place-items-center rounded-xl bg-white/15 backdrop-blur"><ShieldCheck className="size-5" /></span>Secure vendor lifecycle management</div>
            <div className="max-w-md">
              <p className="mb-5 text-sm font-semibold uppercase tracking-[0.2em] text-red-200">Vendor Onboarding Portal</p>
              <h1 className="text-4xl font-semibold leading-tight text-white xl:text-5xl">Build trusted vendor relationships from day one.</h1>
              <p className="mt-6 text-lg leading-8 text-slate-200">Submit, approve, and manage vendor onboarding through one clear, secure workflow.</p>
            </div>
            <p className="text-sm text-slate-300">Folio3 Vendor Onboarding</p>
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-10 sm:px-12 lg:px-14 xl:px-20">
          <div className="w-full max-w-md">
            <div className="mb-10 flex items-center gap-4">
              <div className="flex h-16 w-28 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200"><img src={folio3Logo} alt="Folio3" className="h-14 w-auto object-contain" /></div>
              <div><p className="text-sm font-medium text-slate-500">Vendor Onboarding</p><p className="font-semibold text-[#1F3864]">Secure staff access</p></div>
            </div>

            <div className="mb-8"><p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#E8272C]">Welcome back</p><h2 className="text-3xl font-semibold tracking-tight text-[#1F3864]">Sign in to your workspace</h2><p className="mt-3 leading-6 text-slate-500">Use your Folio3 account to access vendor onboarding requests and approvals.</p></div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <label className="block text-sm font-semibold text-[#1F3864]">Email address
                <span className="mt-2 flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 shadow-sm transition focus-within:border-[#E8272C] focus-within:bg-white focus-within:ring-4 focus-within:ring-red-50"><Mail className="mr-3 size-4 text-slate-400" /><input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required autoComplete="email" placeholder="name@company.com" className="h-12 w-full bg-transparent text-slate-800 outline-none placeholder:text-slate-400" /></span>
              </label>
              <label className="block text-sm font-semibold text-[#1F3864]">Password
                <span className="mt-2 flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 shadow-sm transition focus-within:border-[#E8272C] focus-within:bg-white focus-within:ring-4 focus-within:ring-red-50"><LockKeyhole className="mr-3 size-4 text-slate-400" /><input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required autoComplete="current-password" placeholder="Enter your password" className="h-12 w-full bg-transparent text-slate-800 outline-none placeholder:text-slate-400" /></span>
              </label>
              {error && <p role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-[#C31D22]">{error}</p>}
              <button type="submit" disabled={isSubmitting} className="flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-[#E8272C] px-4 py-3 font-semibold text-white shadow-lg shadow-red-200 transition hover:bg-[#C31D22] hover:shadow-red-300 disabled:cursor-not-allowed disabled:opacity-60">
                {isSubmitting ? 'Signing in...' : <>Sign In <ArrowRight className="size-4" /></>}
              </button>
            </form>

            <div className="mt-8 flex items-center gap-3 border-t border-slate-100 pt-6 text-sm text-slate-500"><ShieldCheck className="size-4 shrink-0 text-[#E8272C]" />Your session is protected with secure authentication.</div>
          </div>
        </section>
      </div>
    </main>
  )
}
