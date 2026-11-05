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
  } catch (error) {
    throw new Error('Network error: Could not connect to the server.')
  }

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error((data as { detail?: string })?.detail ?? `Request failed: ${response.status}`)
  }

  return data as T
}

export const destinationApi = {
  list: () => request<Destination[]>('/destinations'),
  get: (id: number) => request<Destination>(`/destinations/${id}`),
  create: (payload: DestinationInput) => request<Destination>('/destinations', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  update: (id: number, payload: DestinationInput) => request<Destination>(`/destinations/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }),
  remove: (id: number) => request<null>(`/destinations/${id}`, { method: 'DELETE' }),
}