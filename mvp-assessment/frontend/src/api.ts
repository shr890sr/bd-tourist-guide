import type { Destination, DestinationInput } from './types'

const API_BASE = '/api'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    })
  } catch {
    throw new Error('Cannot reach the API. Start the FastAPI backend and try again.')
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null) as { detail?: string | { msg?: string }[] } | null
    const detail = Array.isArray(body?.detail)
      ? body.detail.map((item) => item.msg).filter(Boolean).join(' ')
      : body?.detail
    throw new Error(detail ?? `Request failed (${response.status}).`)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export const destinationApi = {
  list: () => request<Destination[]>('/destinations'),
  get: (id: number) => request<Destination>(`/destinations/${id}`),
  create: (input: DestinationInput) => request<Destination>('/destinations', {
    method: 'POST', body: JSON.stringify(input),
  }),
  update: (id: number, input: DestinationInput) => request<Destination>(`/destinations/${id}`, {
    method: 'PUT', body: JSON.stringify(input),
  }),
  remove: (id: number) => request<void>(`/destinations/${id}`, { method: 'DELETE' }),
}
