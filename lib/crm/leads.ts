import { query } from "./db"
import { LEAD_STATUSES, type Lead, type LeadKind, type LeadStatus, type NewLead } from "./types"

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

export async function createLead(lead: NewLead, ctx: RequestContext): Promise<Lead> {
  const rows = await query<Lead>(
    `INSERT INTO leads (
       kind, name, phone, cuit, message,
       quote_title, quote_total, quote_config,
       source_path, referrer, user_agent, ip, city, region, country
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
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
    ],
  )
  return rows[0]
}

export interface LeadFilters {
  kind?: LeadKind
  status?: LeadStatus
  search?: string
}

export async function listLeads(filters: LeadFilters = {}, limit = 200): Promise<Lead[]> {
  const where: string[] = []
  const params: unknown[] = []

  if (filters.kind) {
    params.push(filters.kind)
    where.push(`kind = $${params.length}`)
  }
  if (filters.status) {
    params.push(filters.status)
    where.push(`status = $${params.length}`)
  }
  if (filters.search) {
    params.push(`%${filters.search}%`)
    where.push(
      `(name ILIKE $${params.length} OR phone ILIKE $${params.length} OR message ILIKE $${params.length} OR quote_title ILIKE $${params.length})`,
    )
  }

  params.push(limit)

  return query<Lead>(
    `SELECT * FROM leads
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY created_at DESC
     LIMIT $${params.length}`,
    params,
  )
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

export interface LeadStats {
  total: number
  nuevos: number
  porTipo: Record<LeadKind, number>
}

export async function getStats(): Promise<LeadStats> {
  const rows = await query<{ kind: LeadKind; status: LeadStatus; total: string }>(
    `SELECT kind, status, COUNT(*)::text AS total FROM leads GROUP BY kind, status`,
  )

  const stats: LeadStats = {
    total: 0,
    nuevos: 0,
    porTipo: { contacto: 0, presupuesto: 0, whatsapp: 0 },
  }

  for (const row of rows) {
    const n = Number(row.total)
    stats.total += n
    if (row.status === "nuevo") stats.nuevos += n
    stats.porTipo[row.kind] = (stats.porTipo[row.kind] ?? 0) + n
  }

  return stats
}
