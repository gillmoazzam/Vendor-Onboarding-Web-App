import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { NavBar } from './components/NavBar'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AuthProvider } from './contexts/AuthContext'
import { LoginPage } from './pages/LoginPage'
import { RegisterVendorPage } from './pages/RegisterVendorPage'
import { RequestsPage } from './pages/RequestsPage'
import { ApprovalPage } from './pages/ApprovalPage'
import { SendQuestionnairesPage } from './pages/SendQuestionnairesPage'
import { QuestionnairePage } from './pages/QuestionnairePage'
import { ReviewQuestionnairesPage } from './pages/ReviewQuestionnairesPage'
import { Toaster } from 'sonner'
import { DashboardPage } from './pages/DashboardPage'

function Dashboard() {
  return (
    <>
      <NavBar />
      <DashboardPage />
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/approve/:id" element={<ApprovalPage />} />
          <Route path="/questionnaire/:id" element={<QuestionnairePage />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/register" element={<ProtectedRoute><><NavBar /><RegisterVendorPage /></></ProtectedRoute>} />
          <Route path="/requests" element={<ProtectedRoute><><NavBar /><RequestsPage /></></ProtectedRoute>} />
          <Route path="/questionnaires/send" element={<ProtectedRoute><><NavBar /><SendQuestionnairesPage /></></ProtectedRoute>} />
          <Route path="/questionnaires/review" element={<ProtectedRoute><><NavBar /><ReviewQuestionnairesPage /></></ProtectedRoute>} />
        </Routes>
        <Toaster richColors />
      </BrowserRouter>
    </AuthProvider>
  )
}
