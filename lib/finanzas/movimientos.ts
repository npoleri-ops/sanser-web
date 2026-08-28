import { query } from "@/lib/crm/db"
import { TIPOS, type FiltroMovimientos, type Movimiento, type NuevoMovimiento, type Tipo } from "./types"

/**
 * El libro de movimientos. Toda suma se hace en SQL y no en JavaScript: los
 * montos son NUMERIC y convertirlos a number para sumarlos reintroduce los
 * errores de coma flotante que NUMERIC existe para evitar.
 */

const CAMPOS = `
  m.id, m.created_at, m.updated_at,
  -- Como texto y no como DATE: node-postgres convertiría el DATE a un Date de
  -- JavaScript en la zona del servidor, y al serializarlo a JSON el 1 de mes se
  -- volvería el 31 del anterior.
  to_char(m.fecha, 'YYYY-MM-DD') AS fecha,
  m.tipo, m.concepto, m.categoria,
  m.monto, m.medio_pago, m.proveedor, m.notas, m.lead_id, m.fijo_id, m.periodo,
  l.quote_title AS lead_titulo,
  l.quote_number AS lead_numero,
  l.name AS lead_cliente,
  COALESCE(
    (SELECT json_agg(json_build_object(
        'id', c.id, 'token', c.token, 'filename', c.filename,
        'mime', c.mime, 'size_bytes', c.size_bytes, 'created_at', c.created_at
      ) ORDER BY c.created_at)
     FROM fin_comprobantes c WHERE c.movimiento_id = m.id),
    '[]'::json
  ) AS comprobantes
`

/** Construye el WHERE una sola vez para la lista y para el contador. */
function condiciones(f: FiltroMovimientos) {
  const where: string[] = []
  const params: unknown[] = []

  if (f.tipo) {
    params.push(f.tipo)
    where.push(`m.tipo = $${params.length}`)
  }
  if (f.desde) {
    params.push(f.desde)
    where.push(`m.fecha >= $${params.length}`)
  }
  if (f.hasta) {
    params.push(f.hasta)
    where.push(`m.fecha <= $${params.length}`)
  }
  if (f.leadId) {
    params.push(f.leadId)
    where.push(`m.lead_id = $${params.length}`)
  }
  if (f.search) {
    params.push(`%${f.search}%`)
    const i = params.length
    where.push(`(m.concepto ILIKE $${i} OR m.proveedor ILIKE $${i} OR m.categoria ILIKE $${i} OR m.notas ILIKE $${i})`)
  }
  if (f.sinComprobante) {
    where.push(`NOT EXISTS (SELECT 1 FROM fin_comprobantes c WHERE c.movimiento_id = m.id)`)
  }

  return { clause: where.length ? `WHERE ${where.join(" AND ")}` : "", params }
}

export async function listMovimientos(
  filtro: FiltroMovimientos = {},
  page: { limit: number; offset: number },
): Promise<{ movimientos: Movimiento[]; total: number }> {
  const { clause, params } = condiciones(filtro)

  const movimientos = await query<Movimiento>(
    `SELECT ${CAMPOS}
       FROM fin_movimientos m
       LEFT JOIN leads l ON l.id = m.lead_id
       ${clause}
      ORDER BY m.fecha DESC, m.id DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, page.limit, page.offset],
  )

  const [{ total }] = await query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM fin_movimientos m ${clause}`,
    params,
  )

  return { movimientos, total: Number(total) }
}

export async function getMovimiento(id: string): Promise<Movimiento | null> {
  const rows = await query<Movimiento>(
    `SELECT ${CAMPOS}
       FROM fin_movimientos m
       LEFT JOIN leads l ON l.id = m.lead_id
      WHERE m.id = $1`,
    [id],
  )
  return rows[0] ?? null
}

export async function crearMovimiento(nuevo: NuevoMovimiento): Promise<Movimiento> {
  const rows = await query<{ id: string }>(
    `INSERT INTO fin_movimientos
       (fecha, tipo, concepto, categoria, monto, medio_pago, proveedor, notas, lead_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
    [
      nuevo.fecha,
      nuevo.tipo,
      nuevo.concepto.trim(),
      nuevo.categoria?.trim() || null,
      nuevo.monto,
      nuevo.medio_pago || null,
      nuevo.proveedor?.trim() || null,
      nuevo.notas?.trim() || null,
      // Sólo la producción y los ingresos se imputan a una obra; un fijo
      // imputado a un tinglado ensuciaría su rentabilidad con el alquiler.
      nuevo.tipo === "produccion" || nuevo.tipo === "ingreso" ? nuevo.leadId || null : null,
    ],
  )

  const creado = await getMovimiento(rows[0]!.id)
  if (!creado) throw new Error("El movimiento se creó pero no se pudo releer")
  return creado
}

const EDITABLES = [
  "fecha",
  "tipo",
  "concepto",
  "categoria",
  "monto",
  "medio_pago",
  "proveedor",
  "notas",
  "lead_id",
] as const

export async function actualizarMovimiento(
  id: string,
  campos: Partial<Record<(typeof EDITABLES)[number], unknown>>,
): Promise<Movimiento | null> {
  const sets: string[] = []
  const params: unknown[] = []

  for (const campo of EDITABLES) {
    if (!(campo in campos)) continue
    let valor = campos[campo]
    if (campo === "tipo" && !TIPOS.includes(valor as Tipo)) continue
    if (campo === "monto") {
      const n = Number(valor)
      if (!Number.isFinite(n) || n <= 0) continue
      valor = n
    }
    params.push(valor === "" ? null : valor)
    sets.push(`${campo} = $${params.length}`)
  }

  if (sets.length === 0) return getMovimiento(id)

  params.push(id)
  await query(
    `UPDATE fin_movimientos SET ${sets.join(", ")}, updated_at = now()
      WHERE id = $${params.length}`,
    params,
  )

  return getMovimiento(id)
}

export async function borrarMovimiento(id: string): Promise<boolean> {
  const rows = await query<{ id: string }>(
    `DELETE FROM fin_movimientos WHERE id = $1 RETURNING id`,
    [id],
  )
  return rows.length > 0
}

/** Las obras a las que se puede imputar: presupuestos con número o ganados. */
export async function obrasImputables() {
  return query<{ id: string; etiqueta: string }>(
    `SELECT l.id,
            COALESCE(l.quote_number || ' · ', '') ||
            COALESCE(NULLIF(l.quote_title, ''), 'Sin título') ||
            COALESCE(' · ' || NULLIF(l.name, ''), '') AS etiqueta
       FROM leads l
      WHERE l.kind = 'presupuesto'
        AND (l.quote_number IS NOT NULL OR l.status IN ('ganado', 'presupuestado'))
      ORDER BY l.created_at DESC
      LIMIT 300`,
  )
}
