import axios, { type InternalAxiosRequestConfig } from 'axios'
import type { Destination, DestinationInput, AdminUser, AuditLog, GroupRole, UserGroup } from './types'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? (
  import.meta.env.PROD
    ? 'https://bd-tourist-guide-backend.vercel.app/api'
    : 'http://localhost:8000/api'
)
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    _retry?: boolean
  }
}

export const api = axios.create({ baseURL: API_BASE_URL, withCredentials: true })

let refreshPromise: Promise<string> | null = null

// Read the latest token at request time so every protected request automatically
// carries Authorization: Bearer <JWT>, including after login or logout.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  else delete config.headers.Authorization
  return config
})

api.interceptors.response.use((response) => response, async (error: unknown) => {
  if (!axios.isAxiosError(error)) throw error
  const originalRequest = error.config as InternalAxiosRequestConfig | undefined
  const url = originalRequest?.url ?? ''
  const isAuthFlow = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'].some((path) => url.includes(path))
  if (error.response?.status !== 401 || !originalRequest || originalRequest._retry || isAuthFlow) throw error

  originalRequest._retry = true
  try {
    if (!refreshPromise) {
      refreshPromise = api.post<{ access_token: string }>('/auth/refresh')
        .then(({ data }) => {
          localStorage.setItem('access_token', data.access_token)
          window.dispatchEvent(new CustomEvent('auth:token-refreshed', { detail: data.access_token }))
          return data.access_token
        })
        .finally(() => { refreshPromise = null })
    }
    const accessToken = await refreshPromise
    originalRequest.headers.Authorization = `Bearer ${accessToken}`
    return await api(originalRequest)
  } catch (refreshError) {
    localStorage.removeItem('access_token')
    localStorage.removeItem('auth_user')
    window.dispatchEvent(new Event('auth:session-expired'))
    throw refreshError
  }
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

export const groupApi = {
  list: async () => (await api.get<UserGroup[]>('/groups')).data,
  create: async (name: string) => (await api.post<UserGroup>('/groups', { name })).data,
  addMember: async (groupId: number, email: string, role: GroupRole) =>
    (await api.post<UserGroup>(`/groups/${groupId}/members`, { email, role })).data,
  removeMember: async (groupId: number, userId: number) =>
    (await api.delete<UserGroup>(`/groups/${groupId}/members/${userId}`)).data,
  remove: async (groupId: number) => { await api.delete(`/groups/${groupId}`) },
}

export function apiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.detail ?? error.message ?? 'The request failed.'
  }
  return error instanceof Error ? error.message : 'The request failed.'
}
