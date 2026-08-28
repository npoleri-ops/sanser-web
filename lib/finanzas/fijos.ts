import { query } from "@/lib/crm/db"
import type { GastoFijo } from "./types"

/**
 * Los gastos fijos se guardan dos veces a propósito: aquí la plantilla —lo que
 * se paga todos los meses— y en el libro el movimiento real de cada mes.
 *
 * Podría calcularse el mes al vuelo desde la plantilla y ahorrarse las filas,
 * pero entonces el libro diría lo que *debería* pagarse en vez de lo que se
 * pagó, y en cuanto un mes el alquiler suba o el seguro se pague tarde las
 * cuentas dejarían de cuadrar con el banco.
 */

export async function listFijos(incluirBajas = false): Promise<GastoFijo[]> {
  return query<GastoFijo>(
    `SELECT id, concepto, categoria, monto, proveedor, activo, dia_pago
       FROM fin_gastos_fijos
      ${incluirBajas ? "" : "WHERE activo"}
      ORDER BY activo DESC, dia_pago NULLS LAST, concepto`,
  )
}

export async function crearFijo(f: {
  concepto: string
  categoria?: string | null
  monto: number
  proveedor?: string | null
  dia_pago?: number | null
}): Promise<GastoFijo> {
  const rows = await query<GastoFijo>(
    `INSERT INTO fin_gastos_fijos (concepto, categoria, monto, proveedor, dia_pago)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, concepto, categoria, monto, proveedor, activo, dia_pago`,
    [
      f.concepto.trim(),
      f.categoria?.trim() || null,
      f.monto,
      f.proveedor?.trim() || null,
      f.dia_pago ?? null,
    ],
  )
  return rows[0]!
}

export async function actualizarFijo(
  id: string,
  campos: Partial<{ concepto: string; categoria: string; monto: number; proveedor: string; dia_pago: number; activo: boolean }>,
): Promise<GastoFijo | null> {
  const permitidos = ["concepto", "categoria", "monto", "proveedor", "dia_pago", "activo"] as const
  const sets: string[] = []
  const params: unknown[] = []

  for (const campo of permitidos) {
    if (!(campo in campos)) continue
    params.push((campos as Record<string, unknown>)[campo] === "" ? null : (campos as Record<string, unknown>)[campo])
    sets.push(`${campo} = $${params.length}`)
  }
  if (sets.length === 0) return null

  params.push(id)
  const rows = await query<GastoFijo>(
    `UPDATE fin_gastos_fijos SET ${sets.join(", ")}
      WHERE id = $${params.length}
      RETURNING id, concepto, categoria, monto, proveedor, activo, dia_pago`,
    params,
  )
  return rows[0] ?? null
}

/**
 * Vuelca los fijos activos como movimientos de un mes. Se puede apretar dos
 * veces sin miedo: el índice único (fijo_id, periodo) descarta lo ya generado,
 * así que un fijo dado de alta a mitad de mes se agrega sin duplicar el resto.
 *
 * Devuelve cuántos entraron y cuántos ya estaban.
 */
export async function generarMes(periodo: string): Promise<{ creados: number; existentes: number }> {
  if (!/^\d{4}-\d{2}$/.test(periodo)) throw new Error("El período va como AAAA-MM")

  const activos = await listFijos()
  if (activos.length === 0) return { creados: 0, existentes: 0 }

  let creados = 0
  for (const f of activos) {
    // El día de pago se recorta al último día del mes: un fijo del 31 en
    // febrero caería fuera y Postgres lo rechazaría.
    const dia = Math.min(f.dia_pago ?? 1, ultimoDia(periodo))
    const fecha = `${periodo}-${String(dia).padStart(2, "0")}`

    const rows = await query<{ id: string }>(
      `INSERT INTO fin_movimientos
         (fecha, tipo, concepto, categoria, monto, proveedor, fijo_id, periodo)
       VALUES ($1, 'fijo', $2, $3, $4, $5, $6, $7)
       -- El predicado del índice va repetido aquí: para inferir un índice
       -- PARCIAL, Postgres exige que el ON CONFLICT declare la misma condición.
       -- Sin esto tira «no unique or exclusion constraint matching».
       ON CONFLICT (fijo_id, periodo) WHERE fijo_id IS NOT NULL AND periodo IS NOT NULL
       DO NOTHING
       RETURNING id`,
      [fecha, f.concepto, f.categoria, f.monto, f.proveedor, f.id, periodo],
    )
    if (rows.length > 0) creados++
  }

  return { creados, existentes: activos.length - creados }
}

function ultimoDia(periodo: string) {
  const [anio, mes] = periodo.split("-").map(Number)
  return new Date(anio!, mes!, 0).getDate()
}
