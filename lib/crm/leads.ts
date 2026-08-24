import { query } from "./db"
import {
  LEAD_STATUSES,
  type Lead,
  type LeadKind,
  type LeadStats,
  type LeadStatus,
  type NewLead,
} from "./types"

/** Contexto de la visita que sacamos de las cabeceras de la petición. */
export interface RequestContext {
  referrer: string | null
  userAgent: string | null
  ip: string | null
  city: string | null
  region: string | null
  country: string | null
}

/**
 * Vercel inyecta la geolocalización en cabeceras propias; en local no existen y
 * quedan a null. La IP viene del proxy, así que hay que leer x-forwarded-for.
 */
export function readRequestContext(req: Request): RequestContext {
  const h = req.headers
  const decode = (value: string | null) => {
    if (!value) return null
    try {
      return decodeURIComponent(value)
    } catch {
      return value
    }
  }

  return {
    referrer: h.get("referer"),
    userAgent: h.get("user-agent"),
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null,
    city: decode(h.get("x-vercel-ip-city")),
    region: decode(h.get("x-vercel-ip-country-region")),
    country: h.get("x-vercel-ip-country"),
  }
}

/**
 * Un clic a WhatsApp no trae datos —es sólo una señal de interés—, pero un
 * presupuesto o una consulta sin nombre y teléfono no sirven para vender.
 */
export function faltaContacto(lead: NewLead) {
  if (lead.kind === "whatsapp") return false
  return !lead.name?.trim() || !lead.phone?.trim()
}

export async function createLead(lead: NewLead, ctx: RequestContext): Promise<Lead> {
  const rows = await query<Lead>(
    `INSERT INTO leads (
       kind, name, phone, cuit, message,
       quote_title, quote_total, quote_config,
       source_path, referrer, user_agent, ip, city, region, country,
       status, notes
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,
               COALESCE($16, 'nuevo'), $17)
     RETURNING *`,
    [
      lead.kind,
      lead.name ?? null,
      lead.phone ?? null,
      lead.cuit ?? null,
      lead.message ?? null,
      lead.quoteTitle ?? null,
      lead.quoteTotal ?? null,
      lead.quoteConfig ? JSON.stringify(lead.quoteConfig) : null,
      lead.sourcePath ?? null,
      ctx.referrer,
      ctx.userAgent,
      ctx.ip,
      ctx.city,
      ctx.region,
      ctx.country,
      lead.status ?? null,
      lead.notes ?? null,
    ],
  )
  return rows[0]
}

/**
 * Regenerar el mismo presupuesto creaba una fila nueva cada vez (pasó con los
 * registros 8 y 9). Si en la última media hora ya hay uno igual —mismo teléfono
 * y mismo título— se actualiza en lugar de duplicar.
 */
const VENTANA_DUPLICADOS = "30 minutes"

export async function createOrUpdateLead(lead: NewLead, ctx: RequestContext): Promise<Lead> {
  if (lead.phone && lead.quoteTitle) {
    const rows = await query<Lead>(
      `UPDATE leads SET
         quote_total  = COALESCE($1, quote_total),
         quote_config = COALESCE($2, quote_config),
         name         = COALESCE($3, name),
         cuit         = COALESCE($4, cuit),
         updated_at   = now()
       WHERE id = (
         SELECT id FROM leads
         WHERE kind = $5 AND phone = $6 AND quote_title = $7
           AND created_at > now() - INTERVAL '${VENTANA_DUPLICADOS}'
         ORDER BY created_at DESC
         LIMIT 1
       )
       RETURNING *`,
      [
        lead.quoteTotal ?? null,
        lead.quoteConfig ? JSON.stringify(lead.quoteConfig) : null,
        lead.name ?? null,
        lead.cuit ?? null,
        lead.kind,
        lead.phone,
        lead.quoteTitle,
      ],
    )

    if (rows[0]) return rows[0]
  }

  return createLead(lead, ctx)
}

/**
 * Mandar el presupuesto por WhatsApp es contactar al cliente: en vez de crear un
 * registro suelto, avanza el que ya existe. Se identifica por el token del PDF,
 * que es un UUID: los ids son correlativos y se podrían adivinar desde fuera.
 */
export async function marcarPresupuestoEnviado(pdfToken: string): Promise<Lead | null> {
  const rows = await query<Lead>(
    `UPDATE leads SET status = 'contactado', updated_at = now()
     WHERE id = (SELECT lead_id FROM lead_pdfs WHERE token = $1)
       AND status = 'nuevo'
     RETURNING *`,
    [pdfToken],
  )
  return rows[0] ?? null
}

/**
 * Cuando el que escribe es el cliente desde el cotizador público, el estado NO
 * cambia: nadie de SANSER respondió todavía y ponerlo en 'contactado' lo sacaría
 * del aviso de leads dormidos. Sólo queda anotado, y una sola vez por más clics
 * que haga.
 */
export async function registrarConsultaDelCliente(pdfToken: string): Promise<Lead | null> {
  const rows = await query<Lead>(
    `UPDATE leads SET
       notes = trim(both E'\n' from coalesce(notes, '') || E'\n' ||
                    'El cliente escribió por WhatsApp desde el cotizador.'),
       updated_at = now()
     WHERE id = (SELECT lead_id FROM lead_pdfs WHERE token = $1)
       AND (notes IS NULL OR notes NOT LIKE '%escribió por WhatsApp%')
     RETURNING *`,
    [pdfToken],
  )
  return rows[0] ?? null
}

export interface LeadFilters {
  kind?: LeadKind
  status?: LeadStatus
  search?: string
  /** Sólo los que llevan más de 48 h sin atender. */
  dormidos?: boolean
}

export interface LeadPage {
  leads: Lead[]
  total: number
}

export async function listLeads(
  filters: LeadFilters = {},
  { limit = 25, offset = 0 }: { limit?: number; offset?: number } = {},
): Promise<LeadPage> {
  const where: string[] = []
  const params: unknown[] = []

  if (filters.kind) {
    params.push(filters.kind)
    where.push(`leads.kind = $${params.length}`)
  }
  if (filters.status) {
    params.push(filters.status)
    where.push(`leads.status = $${params.length}`)
  }
  if (filters.search) {
    params.push(`%${filters.search}%`)
    where.push(
      `(leads.name ILIKE $${params.length} OR leads.phone ILIKE $${params.length} OR leads.message ILIKE $${params.length} OR leads.quote_title ILIKE $${params.length})`,
    )
  }
  if (filters.dormidos) {
    where.push(`(leads.status = 'nuevo' AND leads.created_at < now() - INTERVAL '48 hours')`)
  }

  params.push(limit)
  const limitParam = params.length
  params.push(offset)

  // COUNT(*) OVER() devuelve el total sin filtrar por página en la misma
  // consulta: nos ahorra un segundo viaje a la base para el paginador.
  const rows = await query<Lead & { total_count: string }>(
    `SELECT leads.*,
            pdfs.token AS pdf_token,
            (SELECT count(*)::int FROM leads otros
              WHERE otros.phone IS NOT NULL AND otros.phone = leads.phone) AS phone_count,
            COUNT(*) OVER()::text AS total_count
     FROM leads
     LEFT JOIN lead_pdfs pdfs ON pdfs.lead_id = leads.id
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY leads.created_at DESC
     LIMIT $${limitParam} OFFSET $${params.length}`,
    params,
  )

  return {
    leads: rows.map(row => {
      const lead = { ...row } as Partial<Lead & { total_count?: string }>
      delete lead.total_count
      return lead as Lead
    }),
    total: rows.length > 0 ? Number(rows[0].total_count) : 0,
  }
}

export async function updateLead(
  id: string,
  changes: { status?: string; notes?: string },
): Promise<Lead | null> {
  const sets: string[] = ["updated_at = now()"]
  const params: unknown[] = []

  if (changes.status !== undefined) {
    if (!LEAD_STATUSES.includes(changes.status as LeadStatus)) return null
    params.push(changes.status)
    sets.push(`status = $${params.length}`)
  }
  if (changes.notes !== undefined) {
    params.push(changes.notes)
    sets.push(`notes = $${params.length}`)
  }

  params.push(id)
  const rows = await query<Lead>(
    `UPDATE leads SET ${sets.join(", ")} WHERE id = $${params.length} RETURNING *`,
    params,
  )
  return rows[0] ?? null
}

export async function getStats(): Promise<LeadStats> {
  const rows = await query<{
    kind: LeadKind
    status: LeadStatus
    total: string
    dormidos: string
  }>(
    `SELECT kind, status, COUNT(*)::text AS total,
            COUNT(*) FILTER (
              WHERE status = 'nuevo' AND created_at < now() - INTERVAL '48 hours'
            )::text AS dormidos
     FROM leads GROUP BY kind, status`,
  )

  const stats: LeadStats = {
    total: 0,
    nuevos: 0,
    dormidos: 0,
    porTipo: { contacto: 0, presupuesto: 0, whatsapp: 0 },
  }

  for (const row of rows) {
    const n = Number(row.total)
    stats.total += n
    if (row.status === "nuevo") stats.nuevos += n
    stats.dormidos += Number(row.dormidos)
    stats.porTipo[row.kind] = (stats.porTipo[row.kind] ?? 0) + n
  }

  return stats
}
