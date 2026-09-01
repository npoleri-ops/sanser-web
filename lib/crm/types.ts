export const DEFAULT_PER_PAGE = 25

export const LEAD_KINDS = ["contacto", "presupuesto", "whatsapp"] as const
export type LeadKind = (typeof LEAD_KINDS)[number]

export const QUOTE_STATES = ["borrador", "confirmado"] as const
export type QuoteState = (typeof QUOTE_STATES)[number]

export const QUOTE_STATE_LABEL: Record<QuoteState, string> = {
  borrador: "Borrador",
  confirmado: "Confirmado",
}

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
  /** Borrador mientras Santi puede tocarlo; confirmado cuando ya es el documento. */
  quote_state: QuoteState
  /** Correlativo, asignado sólo al confirmar. */
  quote_number: string | null
  confirmed_at: string | null
  /** Token del PDF guardado, si el presupuesto se generó desde el cotizador. */
  pdf_token?: string | null
  /** Cuántos registros hay en total con este mismo teléfono. */
  phone_count?: number
}

export interface LeadStats {
  total: number
  nuevos: number
  /** Leads en 'nuevo' con más de 48 h: los que se están enfriando. */
  dormidos: number
  porTipo: Record<LeadKind, number>
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
  // Sólo se usan en el alta manual desde el panel: los leads que entran solos
  // nacen siempre como 'nuevo' y sin notas.
  status?: LeadStatus | null
  notes?: string | null
}

/** Una persona vista una sola vez, agrupando todos sus registros por teléfono. */
export interface Cliente {
  phone_key: string
  /** El nombre más reciente que dejó: la gente corrige cómo se llama. */
  name: string | null
  phone: string | null
  cuit: string | null
  registros: number
  presupuestos: number
  /** Suma de lo presupuestado en documentos confirmados. */
  total_presupuestado: string | null
  ultima_actividad: string
  /** El estado más avanzado al que llegó en cualquiera de sus registros. */
  estado: LeadStatus
}
