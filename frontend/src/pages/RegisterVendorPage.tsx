import { VendorRegistrationForm } from '../components/VendorRegistrationForm'
import { useAuth } from '../contexts/AuthContext'

export function RegisterVendorPage() {
  const { user } = useAuth()

  return <main className="mx-auto max-w-2xl p-6"><VendorRegistrationForm mode="internal" requesterName={user?.name} /></main>
}
