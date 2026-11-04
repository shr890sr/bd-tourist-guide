export interface Destination {
  id: number
  name: string
  description: string
  location: string
  image_url: string | null
}

export type DestinationInput = Omit<Destination, 'id'>
