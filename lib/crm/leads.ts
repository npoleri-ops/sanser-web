import { query } from "./db"
import {
  LEAD_STATUSES,
  type Cliente,
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
 * Mínimo para el alta manual desde el panel: Santi carga a veces un fijo o un
 * cliente que no dio correo, así que ahí no se aplica la validación estricta
 * del visitante (ver problemaDeContacto en ./contacto).
 */
export function faltaContacto(lead: NewLead) {
  if (lead.kind === "whatsapp") return false
  const hasName = Boolean(lead.name?.trim())
  const hasPhone = Boolean(lead.phone && lead.phone.replace(/\D/g, "").length >= 8)
  return !hasName || !hasPhone
}

export async function createLead(lead: NewLead, ctx: RequestContext): Promise<Lead> {
  const rows = await query<Lead>(
    `INSERT INTO leads (
       kind, name, phone, cuit, message,
       quote_title, quote_total, quote_config,
       source_path, referrer, user_agent, ip, city, region, country,
       status, notes, email
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,
               COALESCE($16, 'nuevo'), $17, $18)
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
      lead.email?.trim().toLowerCase() || null,
    ],
  )
  return rows[0]
}

/**
 * Regenerar el mismo presupuesto creaba una fila nueva cada vez (pasó con los
 * registros 8 y 9). Si en la última media hora ya hay uno igual de la misma
 * persona se actualiza en lugar de duplicar.
 */
const VENTANA_DUPLICADOS = "30 minutes"

/**
 * Condición SQL de «es la misma persona», sobre los parámetros $1 teléfono y
 * $2 correo.
 *
 * El teléfono solo no alcanzaba: Leonardo pidió tres veces en cinco minutos
 * corrigiendo el número cada vez, y cada corrección era un cliente nuevo. Para
 * el visitante también cuenta el correo. La IP no: detrás de un mismo wifi hay
 * familias y oficinas enteras, y fusionar por ella pisaba el correo de uno con
 * el de otro; la IP sólo sirve para el tope de pedidos. Para Santi tampoco
 * cuenta el correo: carga clientes a mano y no hay visitante que reconocer.
 */
const MISMA_PERSONA = `(
  phone_key = NULLIF(RIGHT(REGEXP_REPLACE(COALESCE($1, ''), '\\D', '', 'g'), 10), '')
  OR ($2::text IS NOT NULL AND lower(email) = $2)
)`

function identidad(lead: NewLead, porVisitante: boolean) {
  return [lead.phone ?? null, porVisitante ? lead.email?.trim().toLowerCase() || null : null]
}

/**
 * Si la misma persona ya dejó el mismo pedido hace un rato, lo actualiza con lo
 * último que escribió —el teléfono corregido gana al anterior— y lo devuelve.
 * Una consulta nueva del formulario se suma al mensaje en vez de pisarlo.
 */
export async function actualizarPedidoReciente(
  lead: NewLead,
  { porVisitante }: { porVisitante: boolean },
): Promise<Lead | null> {
  if (lead.kind === "whatsapp") return null
  if (lead.kind === "presupuesto" && !lead.quoteTitle) return null

  const rows = await query<Lead>(
    `UPDATE leads SET
       quote_total  = COALESCE($3, quote_total),
       quote_config = COALESCE($4, quote_config),
       name         = COALESCE($5, name),
       cuit         = COALESCE($6, cuit),
       phone        = COALESCE($1, phone),
       email        = COALESCE($2, email),
       message      = CASE
                        WHEN $7::text IS NULL OR message = $7 THEN message
                        WHEN message IS NULL THEN $7
                        ELSE message || E'\n---\n' || $7
                      END,
       updated_at   = now()
     WHERE id = (
       SELECT id FROM leads
       WHERE kind = $8 AND ${MISMA_PERSONA}
         AND ($9::text IS NULL OR quote_title = $9)
         AND quote_state = 'borrador'
         AND deleted_at IS NULL
         AND created_at > now() - INTERVAL '${VENTANA_DUPLICADOS}'
       ORDER BY created_at DESC
       LIMIT 1
     )
     RETURNING *`,
    [
      ...identidad(lead, porVisitante),
      lead.quoteTotal ?? null,
      lead.quoteConfig ? JSON.stringify(lead.quoteConfig) : null,
      lead.name ?? null,
      lead.cuit ?? null,
      lead.message ?? null,
      lead.kind,
      lead.kind === "presupuesto" ? lead.quoteTitle : null,
    ],
  )
  return rows[0] ?? null
}

/**
 * Tope de pedidos nuevos por persona. Un cliente que compara dos o tres
 * tamaños entra holgado; lo que lo supera es alguien probando el formulario o
 * un bot, y cada uno de esos llega a Santi como aviso por correo.
 *
 * Los pedidos repetidos no llegan hasta aquí: se fusionan antes con
 * actualizarPedidoReciente.
 */
const LIMITE_POR_EMAIL = { pedidos: 3, ventana: "24 hours" }
const LIMITE_POR_IP = { pedidos: 5, ventana: "1 hour" }

export async function superaLimiteDePedidos(
  email: string | null | undefined,
  ip: string | null,
): Promise<boolean> {
  const correo = email?.trim().toLowerCase() || null
  const rows = await query<{ por_email: number; por_ip: number }>(
    `SELECT
       COUNT(*) FILTER (
         WHERE $1::text IS NOT NULL AND lower(email) = $1
           AND created_at > now() - INTERVAL '${LIMITE_POR_EMAIL.ventana}'
       )::int AS por_email,
       COUNT(*) FILTER (
         WHERE $2::text IS NOT NULL AND ip = $2
           AND created_at > now() - INTERVAL '${LIMITE_POR_IP.ventana}'
       )::int AS por_ip
     FROM leads
     WHERE kind <> 'whatsapp'
       AND created_at > now() - INTERVAL '${LIMITE_POR_EMAIL.ventana}'
       AND ((($1::text IS NOT NULL) AND lower(email) = $1) OR ($2::text IS NOT NULL AND ip = $2))`,
    [correo, ip],
  )
  const fila = rows[0]
  return Boolean(
    fila && (fila.por_email >= LIMITE_POR_EMAIL.pedidos || fila.por_ip >= LIMITE_POR_IP.pedidos),
  )
}

/**
 * El clic a WhatsApp del cotizador público, cuando la misma persona acaba de
 * pedir el presupuesto: queda como nota de ese pedido en vez de ser un registro
 * más en la lista.
 */
export async function anotarWhatsAppEnPedidoReciente(
  lead: NewLead,
): Promise<Lead | null> {
  // Una sola nota por más clics que haga, pero el pedido sigue siendo suyo.
  const rows = await query<Lead>(
    `UPDATE leads SET
       notes = CASE
                 WHEN notes LIKE '%escribió por WhatsApp%' THEN notes
                 ELSE trim(both E'\n' from coalesce(notes, '') || E'\n' ||
                           'El cliente escribió por WhatsApp desde el cotizador.')
               END,
       updated_at = now()
     WHERE id = (
       SELECT id FROM leads
       WHERE kind = 'presupuesto' AND ${MISMA_PERSONA}
         AND deleted_at IS NULL
         AND created_at > now() - INTERVAL '${VENTANA_DUPLICADOS}'
       ORDER BY created_at DESC
       LIMIT 1
     )
     RETURNING *`,
    identidad(lead, true),
  )
  return rows[0] ?? null
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

/** Campos del presupuesto que Santi puede ajustar mientras es borrador. */
export interface DatosPresupuesto {
  name?: string | null
  phone?: string | null
  email?: string | null
  cuit?: string | null
  quoteTitle?: string | null
  quoteTotal?: number | null
  quoteConfig?: Record<string, unknown> | null
}

/**
 * Vuelca en el borrador lo que hay en pantalla. Un presupuesto ya confirmado no
 * se toca: es un documento entregado, y cambiarlo por detrás sería cambiarle el
 * precio a alguien que ya lo tiene.
 */
export async function actualizarBorrador(
  id: string,
  datos: DatosPresupuesto,
): Promise<Lead | null> {
  const rows = await query<Lead>(
    `UPDATE leads SET
       name         = COALESCE($2, name),
       phone        = COALESCE($3, phone),
       cuit         = COALESCE($4, cuit),
       quote_title  = COALESCE($5, quote_title),
       quote_total  = COALESCE($6, quote_total),
       quote_config = COALESCE($7, quote_config),
       email        = COALESCE($8, email),
       updated_at   = now()
     WHERE id = $1 AND kind = 'presupuesto' AND quote_state = 'borrador'
     RETURNING *`,
    [
      id,
      datos.name ?? null,
      datos.phone ?? null,
      datos.cuit ?? null,
      datos.quoteTitle ?? null,
      datos.quoteTotal ?? null,
      datos.quoteConfig ? JSON.stringify(datos.quoteConfig) : null,
      datos.email?.trim().toLowerCase() || null,
    ],
  )
  return rows[0] ?? null
}

/**
 * Confirma un presupuesto: le da número correlativo y lo congela como documento
 * entregado. Es idempotente — si ya estaba confirmado devuelve el mismo número,
 * para que un doble clic no consuma otro de la serie.
 */
export async function confirmarPresupuesto(id: string): Promise<Lead | null> {
  const rows = await query<Lead>(
    `UPDATE leads SET
       quote_state  = 'confirmado',
       quote_number = COALESCE(
         quote_number,
         'SP-' || to_char(now(), 'YY') || '-' || lpad(nextval('quote_number_seq')::text, 4, '0')
       ),
       confirmed_at = COALESCE(confirmed_at, now()),
       status       = CASE WHEN status = 'nuevo' THEN 'presupuestado' ELSE status END,
       updated_at   = now()
     WHERE id = $1 AND kind = 'presupuesto'
     RETURNING *`,
    [id],
  )
  return rows[0] ?? null
}

/** Datos que necesita el cotizador para reabrir un presupuesto y seguir editándolo. */
export async function getLead(id: string): Promise<Lead | null> {
  const rows = await query<Lead>(`SELECT * FROM leads WHERE id = $1`, [id])
  return rows[0] ?? null
}

export interface LeadFilters {
  kind?: LeadKind
  status?: LeadStatus
  search?: string
  /** Sólo los que llevan más de 48 h sin atender. */
  dormidos?: boolean
  /** La papelera: en vez de los vivos, muestra lo borrado. */
  borrados?: boolean
  /** Todos los registros de un mismo cliente, por su teléfono normalizado. */
  phoneKey?: string
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
      `(leads.name ILIKE $${params.length} OR leads.phone ILIKE $${params.length} OR leads.email ILIKE $${params.length} OR leads.message ILIKE $${params.length} OR leads.quote_title ILIKE $${params.length})`,
    )
  }
  if (filters.dormidos) {
    where.push(`(leads.status = 'nuevo' AND leads.created_at < now() - INTERVAL '48 hours')`)
  }
  if (filters.phoneKey) {
    params.push(filters.phoneKey)
    where.push(`leads.phone_key = $${params.length}`)
  }
  // Lo borrado no se ve salvo que se pida la papelera a propósito. Va al final
  // para que ningún filtro de arriba pueda saltárselo por olvido.
  where.push(filters.borrados ? `leads.deleted_at IS NOT NULL` : `leads.deleted_at IS NULL`)

  params.push(limit)
  const limitParam = params.length
  params.push(offset)

  // COUNT(*) OVER() devuelve el total sin filtrar por página en la misma
  // consulta: nos ahorra un segundo viaje a la base para el paginador.
  const rows = await query<Lead & { total_count: string }>(
    `SELECT leads.*,
            pdfs.token AS pdf_token,
            (SELECT count(*)::int FROM leads otros
              WHERE otros.phone_key IS NOT NULL
                AND otros.phone_key = leads.phone_key
                AND otros.deleted_at IS NULL) AS phone_count,
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
     FROM leads WHERE deleted_at IS NULL GROUP BY kind, status`,
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

/* ─────────────────────────────────────────── papelera y agrupado por cliente */

/**
 * Borrado lógico, en lote. Es lo que hace falta después de meses de pruebas
 * internas: marcar veinte registros de una y sacarlos de la vista.
 *
 * No se borra de verdad a propósito. Un lead borrado puede tener un PDF
 * entregado, gastos de obra imputados y el historial del cliente colgando de él;
 * un DELETE se llevaría el rastro de todo eso por delante.
 */
export async function borrarLeads(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0
  const rows = await query<{ id: string }>(
    `UPDATE leads SET deleted_at = now(), updated_at = now()
      WHERE id = ANY($1::bigint[]) AND deleted_at IS NULL
      RETURNING id`,
    [ids],
  )
  return rows.length
}

export async function restaurarLeads(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0
  const rows = await query<{ id: string }>(
    `UPDATE leads SET deleted_at = NULL, updated_at = now()
      WHERE id = ANY($1::bigint[]) AND deleted_at IS NOT NULL
      RETURNING id`,
    [ids],
  )
  return rows.length
}

/**
 * La misma persona vista una sola vez.
 *
 * Se agrupa por el teléfono normalizado, que es la única clave que tenemos: el
 * sitio nunca pide correo, y el CUIT sólo aparece en los presupuestos de
 * empresas. Quien no dejó teléfono no puede agruparse y queda fuera de esta
 * lista —se sigue viendo en la de registros—.
 */
export async function listClientes(
  { search }: { search?: string } = {},
  { limit = 50, offset = 0 }: { limit?: number; offset?: number } = {},
): Promise<{ clientes: Cliente[]; total: number }> {
  const params: unknown[] = []
  let filtro = ""
  if (search) {
    params.push(`%${search}%`)
    filtro = `AND (name ILIKE $${params.length} OR phone ILIKE $${params.length} OR cuit ILIKE $${params.length})`
  }

  params.push(limit)
  const limitParam = params.length
  params.push(offset)

  const rows = await query<Cliente & { total_count: string }>(
    `WITH vivos AS (
       SELECT * FROM leads WHERE deleted_at IS NULL AND phone_key IS NOT NULL ${filtro}
     )
     SELECT phone_key,
            -- El dato más reciente de cada campo, ignorando los vacíos: el
            -- primer contacto suele venir sin CUIT y el presupuesto sí lo trae.
            (ARRAY_AGG(name ORDER BY created_at DESC) FILTER (WHERE name IS NOT NULL))[1] AS name,
            (ARRAY_AGG(phone ORDER BY created_at DESC) FILTER (WHERE phone IS NOT NULL))[1] AS phone,
            (ARRAY_AGG(cuit ORDER BY created_at DESC) FILTER (WHERE cuit IS NOT NULL))[1] AS cuit,
            COUNT(*)::int AS registros,
            COUNT(*) FILTER (WHERE kind = 'presupuesto')::int AS presupuestos,
            SUM(quote_total) FILTER (WHERE quote_state = 'confirmado')::text AS total_presupuestado,
            MAX(created_at) AS ultima_actividad,
            -- El más avanzado al que llegó, no el del último registro: alguien
            -- que ya compró no vuelve a ser «nuevo» porque escriba otra consulta.
            (ARRAY_AGG(status ORDER BY CASE status
                WHEN 'ganado' THEN 1 WHEN 'presupuestado' THEN 2
                WHEN 'contactado' THEN 3 WHEN 'nuevo' THEN 4 ELSE 5 END))[1] AS estado,
            COUNT(*) OVER()::text AS total_count
       FROM vivos
      GROUP BY phone_key
      ORDER BY MAX(created_at) DESC
      LIMIT $${limitParam} OFFSET $${params.length}`,
    params,
  )

  return {
    clientes: rows.map(r => {
      const c = { ...r } as Partial<Cliente & { total_count?: string }>
      delete c.total_count
      return c as Cliente
    }),
    total: rows.length > 0 ? Number(rows[0].total_count) : 0,
  }
}

/** Cuántos registros no se pueden agrupar por no tener teléfono. */
export async function sinTelefono(): Promise<number> {
  const rows = await query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM leads WHERE deleted_at IS NULL AND phone_key IS NULL`,
  )
  return Number(rows[0]?.n ?? 0)
}

/** Cuántos hay en la papelera, para poder ofrecerla sólo si tiene algo. */
export async function contarBorrados(): Promise<number> {
  const rows = await query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM leads WHERE deleted_at IS NOT NULL`,
  )
  return Number(rows[0]?.n ?? 0)
}
