export type ThemePreference = 'light' | 'dark' | 'system'
export type FontScale = 'normal' | 'large' | 'xlarge'

export interface UserProfile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  is_admin: boolean
  can_register_occurrences: boolean
  theme_preference: ThemePreference
  font_scale: FontScale
  points: number
  created_at: string
}

export type PlantCondition = 'healthy' | 'fair' | 'poor' | 'dead'
export type PlantStage = 'seedling' | 'juvenile' | 'adult' | 'unknown'
export type SpeciesOrigin = 'native' | 'exotic' | 'naturalized'
export type SpeciesStatus = 'pending' | 'approved' | 'rejected'

export interface Species {
  id: string
  scientific_name: string | null
  common_name: string
  family: string | null
  origin: SpeciesOrigin
  description: string | null
  image_url: string | null
  status: SpeciesStatus
  submitted_by: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  rejection_reason: string | null
  created_at: string
}

/**
 * Dados públicos de quem registrou uma ocorrência, para creditar a autoria na
 * tela de detalhe. Só o que `profiles` já expõe publicamente (policy de select
 * `using (true)`, migration 001) — nada de e-mail. `tier` vem dos pontos, como
 * no ranking, para escolher a moldura do avatar.
 */
export interface OccurrenceRegistrant {
  id: string
  full_name: string | null
  avatar_url: string | null
  points: number
  tier: BadgeTier
  /** Conta excluída e anonimizada (migration 019): nome e foto vêm nulos de propósito. */
  deleted: boolean
}

export interface PlantOccurrence {
  id: string
  user_id: string
  species_id: string
  species?: Species
  registrant?: OccurrenceRegistrant
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

export type NotificationType =
  | 'species_approved'
  | 'species_rejected'
  | 'species_pending_review'
  | 'occurrence_verified'
  | 'occurrence_modified_by_admin'
  | 'occurrence_deleted_by_admin'
  | 'support_message'
  | 'support_message_resolved'
  | 'registration_requested'
  | 'registration_approved'
  | 'registration_rejected'

export interface AppNotification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string | null
  link: string | null
  species_id: string | null
  occurrence_id: string | null
  support_message_id: string | null
  permission_request_id: string | null
  read_at: string | null
  created_at: string
}

export type SupportMessageStatus = 'open' | 'resolved'

export interface SupportMessage {
  id: string
  user_id: string
  subject: string
  message: string
  status: SupportMessageStatus
  admin_reply: string | null
  resolved_by: string | null
  resolved_at: string | null
  created_at: string
}

export type PermissionRequestStatus = 'pending' | 'approved' | 'rejected'

export interface PermissionRequest {
  id: string
  user_id: string
  message: string | null
  status: PermissionRequestStatus
  reviewed_by: string | null
  reviewed_at: string | null
  rejection_reason: string | null
  created_at: string
}

/** Linha da tela /admin/users: perfil + o pedido de permissão mais recente dele, se houver. */
export interface AdminUserRow {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  is_admin: boolean
  can_register_occurrences: boolean
  created_at: string
  latest_request: PermissionRequest | null
}

export type PointsReason = 'register' | 'maintain'

export interface PointsLogEntry {
  id: string
  user_id: string
  occurrence_id: string | null
  reason: PointsReason
  points: number
  created_at: string
}

export type BadgeTier = 'sementeira' | 'broto' | 'raiz' | 'guardiao' | 'ancestral'

/** Linha da tela /profile/ranking: dados públicos do perfil + posição calculada. */
export interface LeaderboardEntry {
  id: string
  full_name: string | null
  avatar_url: string | null
  points: number
  tier: BadgeTier
  rank: number
}
