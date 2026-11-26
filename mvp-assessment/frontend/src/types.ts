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

export interface AuditLog {
  id: number
  user_id: number | null
  user_email: string | null
  action: string
  details: string
  timestamp: string
  ip_address: string | null
}

export type GroupRole = 'admin' | 'member'

export interface GroupMember {
  user_id: number
  email: string
  role: GroupRole
}

export interface UserGroup {
  id: number
  name: string
  owner_id: number
  members: GroupMember[]
}
