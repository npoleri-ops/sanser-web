export const LEAD_KINDS = ["contacto", "presupuesto", "whatsapp"] as const
export type LeadKind = (typeof LEAD_KINDS)[number]

export const LEAD_STATUSES = ["nuevo", "contactado", "presupuestado", "ganado", "perdido"] as const
export type LeadStatus = (typeof LEAD_STATUSES)[number]

export const KIND_LABEL: Record<LeadKind, string> = {
  contacto: "Formulario",
  presupuesto: "Presupuesto",
  whatsapp: "WhatsApp",
}

export const STATUS_LABEL: Record<LeadStatus, string> = {
  nuevo: "Nuevo",
  contactado: "Contactado",
  presupuestado: "Presupuestado",
  ganado: "Ganado",
  perdido: "Perdido",
}

export interface Lead {
  id: string
  created_at: string
  updated_at: string
  kind: LeadKind
  status: LeadStatus
  notes: string | null
  name: string | null
  phone: string | null
  cuit: string | null
  message: string | null
  quote_title: string | null
  quote_total: string | null
  quote_config: Record<string, unknown> | null
  source_path: string | null
  referrer: string | null
  user_agent: string | null
  ip: string | null
  city: string | null
  region: string | null
  country: string | null
}

export interface NewLead {
  kind: LeadKind
  name?: string | null
  phone?: string | null
  cuit?: string | null
  message?: string | null
  quoteTitle?: string | null
  quoteTotal?: number | null
  quoteConfig?: Record<string, unknown> | null
  sourcePath?: string | null
}
