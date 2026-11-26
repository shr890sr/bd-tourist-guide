import axios from 'axios'
import type { Destination, DestinationInput, AdminUser, AuditLog } from './types'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? (
  import.meta.env.PROD
    ? 'https://bd-tourist-guide-backend.vercel.app/api'
    : 'http://localhost:8000/api'
)
export const api = axios.create({ baseURL: API_BASE_URL })

// Read the latest token at request time so every protected request automatically
// carries Authorization: Bearer <JWT>, including after login or logout.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  else delete config.headers.Authorization
  return config
})

export const destinationApi = {
  list: async () => (await api.get<Destination[]>('/destinations')).data,
  get: async (id: number) => (await api.get<Destination>(`/destinations/${id}`)).data,
  create: async (payload: DestinationInput) => (await api.post<Destination>('/destinations', payload)).data,
  update: async (id: number, payload: DestinationInput) => (await api.put<Destination>(`/destinations/${id}`, payload)).data,
  remove: async (id: number) => { await api.delete(`/destinations/${id}`) },
}

export const authApi = {
  updateProfile: async (email: string) => (await api.put<{ id: number; email: string; role: string }>('/auth/profile', { email })).data,
  changePassword: async (current_password: string, new_password: string) => {
    await api.put('/auth/change-password', { current_password, new_password })
  },
}

export const adminApi = {
  users: async () => (await api.get<AdminUser[]>('/admin/users')).data,
  toggleBan: async (id: number) => (await api.put<AdminUser>(`/admin/users/${id}/ban`)).data,
  auditLogs: async () => (await api.get<AuditLog[]>('/admin/audit-logs')).data,
}

export function apiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.detail ?? error.message ?? 'The request failed.'
  }
  return error instanceof Error ? error.message : 'The request failed.'
}
