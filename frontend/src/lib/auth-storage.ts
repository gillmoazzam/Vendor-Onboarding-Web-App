const TOKEN_KEY = 'vendor-onboarding-token'
const USER_KEY = 'vendor-onboarding-user'

export type AuthUser = {
  userId: string
  name: string
  email: string
  role: string
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function getStoredUser(): AuthUser | null {
  const storedUser = localStorage.getItem(USER_KEY)
  return storedUser ? (JSON.parse(storedUser) as AuthUser) : null
}

export function storeSession(token: string, user: AuthUser): void {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}
