import { NextResponse } from "next/server"
import { isAuthenticated } from "@/lib/crm/auth"
import {
  MAX_COMPROBANTE_BYTES,
  guardarComprobante,
  mimeAceptado,
} from "@/lib/finanzas/comprobantes"
import { getMovimiento } from "@/lib/finanzas/movimientos"

/** Sube el comprobante de un movimiento. Multipart: viene del input de archivo. */
export async function POST(req: Request) {
  if (!(await isAuthenticated())) return NextResponse.json({ ok: false }, { status: 401 })

  const form = await req.formData().catch(() => null)
  if (!form) return NextResponse.json({ ok: false, error: "Envío inválido" }, { status: 400 })

  const movimientoId = String(form.get("movimientoId") ?? "")
  if (!/^\d+$/.test(movimientoId)) {
    return NextResponse.json({ ok: false, error: "Movimiento inválido" }, { status: 400 })
  }
  // Comprobar que existe antes de leer el archivo: si el movimiento no está, no
  // tiene sentido cargar cuatro megas en memoria para tirarlos.
  if (!(await getMovimiento(movimientoId))) {
    return NextResponse.json({ ok: false, error: "El movimiento no existe" }, { status: 404 })
  }

  const file = form.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "Falta el archivo" }, { status: 400 })
  }
  if (file.size > MAX_COMPROBANTE_BYTES) {
    return NextResponse.json({ ok: false, error: "El archivo pasa de 4 MB" }, { status: 413 })
  }
  if (!mimeAceptado(file.type)) {
    return NextResponse.json(
      { ok: false, error: "Sólo se aceptan imágenes o PDF" },
      { status: 415 },
    )
  }

  const comprobante = await guardarComprobante(movimientoId, {
    filename: file.name || "comprobante",
    mime: file.type,
    content: Buffer.from(await file.arrayBuffer()),
  })

  if (!comprobante) {
    return NextResponse.json({ ok: false, error: "No se pudo guardar" }, { status: 400 })
  }
  return NextResponse.json({ ok: true, comprobante }, { status: 201 })
}
