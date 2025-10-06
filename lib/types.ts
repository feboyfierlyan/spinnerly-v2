export interface NameMaterialPair {
  name: string
  material: string
}

export interface Room {
  id: string
  room_code: string
  room_name: string | null // Added room_name field
  names: string[]
  materials: string[]
  current_material_index: number // Added to track which material we're assigning
  creator_session_id: string | null // Added to track room creator
  created_at: string
  updated_at: string
}

export interface SpinHistory {
  id: string
  room_id: string
  selected_name: string
  assigned_material: string // Added assigned_material field
  spun_at: string
}
