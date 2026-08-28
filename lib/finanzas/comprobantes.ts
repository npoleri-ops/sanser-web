import { query } from "@/lib/crm/db"
import type { Comprobante } from "./types"

/**
 * Comprobantes: la foto de la factura, el remito o la transferencia.
 *
 * Van en la base como los PDF de presupuesto, por coherencia y porque hoy no
 * hay nada más montado. Con una diferencia importante: el PDF de un presupuesto
 * viaja por WhatsApp y su token es toda la protección; éstos son papeles
 * internos y su descarga exige sesión del panel.
 *
 * Aviso de capacidad, el mismo del README: el plan gratuito de Neon da 0,5 GB.
 * Una foto de factura ronda 300 KB, así que entran unos 1.500 comprobantes
 * contando lo que ya ocupan los presupuestos. Cuando se acerque, lo natural es
 * mover el binario a Vercel Blob y dejar aquí sólo el enlace: la tabla ya está
 * separada justamente para que ese cambio no toque el resto.
 */

// Cuatro megas y no más: Vercel corta el cuerpo de una petición en 4,5 MB, así
// que un límite mayor no fallaría aquí sino antes de llegar, con un error que no
// podríamos explicar. Una foto de factura sacada con el móvil no llega ni cerca.
export const MAX_COMPROBANTE_BYTES = 4 * 1024 * 1024

/** Lo que se acepta subir. Nada ejecutable, y nada que el navegador no sepa abrir. */
export const MIMES_ACEPTADOS = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
] as const

export function mimeAceptado(mime: string) {
  return (MIMES_ACEPTADOS as readonly string[]).includes(mime)
}

export async function guardarComprobante(
  movimientoId: string,
  file: { filename: string; mime: string; content: Buffer },
): Promise<Comprobante | null> {
  if (file.content.length === 0 || file.content.length > MAX_COMPROBANTE_BYTES) return null
  if (!mimeAceptado(file.mime)) return null

  const rows = await query<Comprobante>(
    `INSERT INTO fin_comprobantes (movimiento_id, filename, mime, content, size_bytes)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, token, filename, mime, size_bytes, created_at`,
    [movimientoId, file.filename.slice(0, 200), file.mime, file.content, file.content.length],
  )
  return rows[0] ?? null
}

export async function getComprobantePorToken(token: string) {
  const rows = await query<{ content: Buffer; mime: string; filename: string }>(
    `SELECT content, mime, filename FROM fin_comprobantes WHERE token = $1`,
    [token],
  )
  return rows[0] ?? null
}

export async function borrarComprobante(id: string): Promise<boolean> {
  const rows = await query<{ id: string }>(
    `DELETE FROM fin_comprobantes WHERE id = $1 RETURNING id`,
    [id],
  )
  return rows.length > 0
}

/** Cuánto ocupan ya los comprobantes, para poder avisar antes de llenar la base. */
export async function espacioUsado() {
  const rows = await query<{ archivos: string; bytes: string }>(
    `SELECT COUNT(*)::text AS archivos, COALESCE(SUM(size_bytes), 0)::text AS bytes
       FROM fin_comprobantes`,
  )
  return { archivos: Number(rows[0]?.archivos ?? 0), bytes: Number(rows[0]?.bytes ?? 0) }
}
