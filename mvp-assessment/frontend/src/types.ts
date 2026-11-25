export interface Destination {
  id: number
  name: string
  description: string
  location: string
  image_url: string | null
  owner_id: number | null
}

export type DestinationInput = Omit<Destination, 'id' | 'owner_id'>

export interface AdminUser {
  id: number
  email: string
  role: string
  is_banned: boolean
  created_at: string
}
