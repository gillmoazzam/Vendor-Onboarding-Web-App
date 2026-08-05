import axios from 'axios'
import { clearSession, getToken } from './auth-storage'

export const api = axios.create({ baseURL: 'http://localhost:3001/api' })

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && error.config?.url !== '/auth/login') {
      clearSession()
      window.location.assign('/login')
    }
    return Promise.reject(error)
  },
)
