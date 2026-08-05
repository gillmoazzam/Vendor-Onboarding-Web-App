import { Link, useNavigate } from 'react-router-dom'
import folio3Logo from '../assets/folio3-logo.png'
import { useAuth } from '../contexts/AuthContext'

export function NavBar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const canReviewQuestionnaires = user?.role === 'Finance Manager' || user?.role === 'Administrator'

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-red-700 bg-[#E8272C] px-6 py-4 text-white shadow-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6">
        <Link to="/" className="flex items-center gap-3"><span className="flex h-9 w-16 items-center justify-center rounded-lg bg-white px-1 shadow-sm"><img src={folio3Logo} alt="Folio3" className="h-8 w-auto object-contain" /></span><span className="text-lg font-semibold tracking-tight">Vendor Onboarding</span></Link>
        <div className="flex items-center gap-5 text-sm">
          <div className="hidden items-center gap-4 xl:flex">
            <Link to="/" className="font-medium hover:text-red-100">Dashboard</Link>
            <Link to="/register" className="font-medium hover:text-red-100">New Request</Link>
            <Link to="/requests" className="font-medium hover:text-red-100">My Requests</Link>
            <Link to="/questionnaires/send" className="font-medium hover:text-red-100">Questionnaires</Link>
            {canReviewQuestionnaires && <Link to="/questionnaires/review" className="font-medium hover:text-red-100">Review Questionnaires</Link>}
          </div>
          <span className="hidden text-right text-xs leading-tight sm:block"><strong className="block text-sm">{user?.name}</strong>{user?.role}</span>
          <button type="button" onClick={handleLogout} className="rounded-lg border border-white/70 px-3 py-1.5 font-semibold hover:bg-white hover:text-[#E8272C]">Log Out</button>
        </div>
      </div>
    </nav>
  )
}
