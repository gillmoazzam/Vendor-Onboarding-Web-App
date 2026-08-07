import { Link, useNavigate } from 'react-router-dom'
import folio3Logo from '../assets/folio3-logo.png'
import { useAuth } from '../contexts/AuthContext'

export function NavBar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const canReviewVendors = user?.role === 'Finance Manager' || user?.role === 'Administrator'

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#0B1C35]/95 px-5 py-3 text-white shadow-[0_12px_35px_rgba(8,20,37,0.22)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center gap-6">
        <div className="flex shrink-0 items-center gap-5">
          <Link to="/" className="flex items-center gap-3 whitespace-nowrap">
            <span className="relative h-12 w-24 overflow-hidden"><img src={folio3Logo} alt="Folio3" className="absolute left-0 top-1/2 h-24 w-24 -translate-y-1/2 object-contain" /></span>
            <span className="text-xl font-extrabold tracking-tight">Vendor Onboarding</span>
          </Link>
          <div className="hidden items-center gap-3 border-l border-white/30 pl-5 md:flex">
            <span className="grid size-10 place-items-center rounded-full bg-[#E8272C] font-bold text-white shadow-sm">{user?.name?.charAt(0)}</span>
            <span className="leading-tight"><strong className="block whitespace-nowrap text-sm">{user?.name}</strong><span className="mt-1 block w-fit rounded-full bg-white/15 px-2 py-0.5 text-xs font-semibold text-red-50">{user?.role}</span></span>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-5">
          <div className="hidden items-center gap-5 whitespace-nowrap text-sm lg:flex">
            <Link to="/" className="font-bold hover:text-red-100">Dashboard</Link>
            {canReviewVendors && <Link to="/requests" className="font-bold hover:text-red-100">Vendor Requests</Link>}
          </div>
          <button type="button" onClick={handleLogout} className="shrink-0 rounded-lg border border-[#E8272C]/70 bg-[#E8272C] px-4 py-2 text-sm font-bold shadow-lg shadow-red-950/20 hover:bg-[#C31D22]">Log Out</button>
        </div>
      </div>
    </nav>
  )
}
