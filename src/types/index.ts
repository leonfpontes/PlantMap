export interface UserProfile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  is_admin: boolean
  created_at: string
}

export type PlantCondition = 'healthy' | 'fair' | 'poor' | 'dead'
export type PlantStage = 'seedling' | 'juvenile' | 'adult' | 'unknown'
export type SpeciesOrigin = 'native' | 'exotic' | 'naturalized'

export interface Species {
  id: string
  scientific_name: string
  common_name: string
  family: string | null
  origin: SpeciesOrigin
  description: string | null
  image_url: string | null
}

export interface PlantOccurrence {
  id: string
  user_id: string
  species_id: string
  species?: Species
  latitude: number
  longitude: number
  condition: PlantCondition
  stage: PlantStage
  notes: string | null
  photo_url: string | null
  verified: boolean
  created_at: string
  updated_at: string
}

export interface OccurrenceWithDistance extends PlantOccurrence {
  distance_m: number
}

export interface Favorite {
  user_id: string
  occurrence_id: string
  created_at: string
  occurrence?: PlantOccurrence
}
