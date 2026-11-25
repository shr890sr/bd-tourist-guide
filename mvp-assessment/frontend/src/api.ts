import axios from 'axios'
import type { Destination, DestinationInput, AdminUser } from './types'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000'
const api = axios.create({ baseURL: `${API_URL}/api` })

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

export const adminApi = {
  users: async () => (await api.get<AdminUser[]>('/admin/users')).data,
  toggleBan: async (id: number) => (await api.put<AdminUser>(`/admin/users/${id}/ban`)).data,
}

export function apiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.detail ?? error.message ?? 'The request failed.'
  }
  return error instanceof Error ? error.message : 'The request failed.'
}
