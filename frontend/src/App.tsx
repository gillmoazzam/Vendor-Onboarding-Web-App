import { BrowserRouter, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { NavBar } from './components/NavBar'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AuthProvider } from './contexts/AuthContext'
import { LoginPage } from './pages/LoginPage'
import { RequestsPage } from './pages/RequestsPage'
import { Toaster } from 'sonner'
import { DashboardPage } from './pages/DashboardPage'
import { PublicVendorPage } from './pages/PublicVendorPage'
import { RequestDetailsPage } from './pages/RequestDetailsPage'

function Dashboard() {
  return <InternalShell><DashboardPage /></InternalShell>
}

function InternalShell({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(232,39,44,0.10),transparent_30%),linear-gradient(to_bottom,#eaf0f7,#f8fafc_26rem)]"><NavBar />{children}</div>
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/vendor" element={<PublicVendorPage />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/requests" element={<ProtectedRoute><InternalShell><RequestsPage /></InternalShell></ProtectedRoute>} />
          <Route path="/requests/:id" element={<ProtectedRoute><InternalShell><RequestDetailsPage /></InternalShell></ProtectedRoute>} />
        </Routes>
        <Toaster richColors />
      </BrowserRouter>
    </AuthProvider>
  )
}
