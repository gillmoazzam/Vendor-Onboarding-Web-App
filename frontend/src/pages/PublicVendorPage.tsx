import { ArrowRight, Building2, CheckCircle2, ShieldCheck } from 'lucide-react'
import folio3Logo from '../assets/folio3-logo.png'
import loginHero from '../assets/vendor-onboarding-login-hero.png'
import { VendorRegistrationForm } from '../components/VendorRegistrationForm'

export function PublicVendorPage() {
  function startRegistration() {
    document.getElementById('vendor-registration')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <main className="vendor-portal min-h-screen overflow-hidden bg-slate-50">
      <section className="relative isolate flex min-h-screen items-center overflow-hidden bg-[#0B1C35] text-white">
        <img src={loginHero} alt="Business professionals collaborating on vendor onboarding" className="absolute inset-0 -z-20 size-full object-cover opacity-45" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#071426] via-[#10274a]/95 to-[#1F3864]/65" />
        <div className="vendor-orb vendor-orb-one" />
        <div className="vendor-orb vendor-orb-two" />
        <div className="absolute inset-x-0 top-0 border-b border-white/10 bg-slate-950/15 backdrop-blur-sm">
          <div className="mx-auto flex max-w-7xl items-center gap-5 px-6 py-5 lg:px-10"><span className="relative h-20 w-40 shrink-0 overflow-hidden"><img src={folio3Logo} alt="Folio3" className="absolute left-0 top-1/2 h-40 w-40 -translate-y-1/2 object-contain" /></span><span className="text-xl font-extrabold leading-tight tracking-tight sm:text-3xl">Vendor Onboarding Portal</span></div>
        </div>
        <div className="mx-auto grid w-full max-w-7xl items-center gap-12 px-6 pb-16 pt-32 lg:grid-cols-[1.15fr_0.85fr] lg:px-10">
          <div className="max-w-3xl">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur"><ShieldCheck className="size-4 text-red-300" />Trusted partnerships begin here</p>
            <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-7xl">Grow with Folio3 as a trusted vendor partner.</h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-200">Introduce your organization, share your capabilities, and help our procurement team understand how we can build a reliable, long-term partnership.</p>
            <button type="button" onClick={startRegistration} className="mt-9 inline-flex items-center gap-3 rounded-xl bg-[#E8272C] px-6 py-4 text-base font-bold text-white shadow-xl shadow-red-950/30 hover:bg-[#C31D22]">Start Registration <ArrowRight className="size-5" /></button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-6 backdrop-blur-md"><Building2 className="size-7 text-red-300" /><h2 className="mt-4 text-xl font-bold text-white">Showcase your strengths</h2><p className="mt-2 leading-7 text-slate-200">Share your services, operating capacity, systems, quality practices, and compliance credentials.</p></div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-6 backdrop-blur-md"><CheckCircle2 className="size-7 text-red-300" /><h2 className="mt-4 text-xl font-bold text-white">One clear submission</h2><p className="mt-2 leading-7 text-slate-200">Provide the information our team needs in a single, structured registration experience.</p></div>
          </div>
        </div>
      </section>

      <section id="vendor-registration" className="scroll-mt-6 px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
        <div className="mx-auto max-w-4xl"><div className="mx-auto mb-10 max-w-2xl text-center"><p className="text-sm font-bold uppercase tracking-[0.2em] text-[#E8272C]">Become a vendor</p><h2 className="mt-3 text-3xl font-bold sm:text-4xl">Start your partnership journey</h2><p className="mt-4 leading-7 text-slate-600">Complete every section below. Your information will be securely submitted to our vendor-management team for review.</p></div><VendorRegistrationForm mode="public" /></div>
      </section>
    </main>
  )
}
