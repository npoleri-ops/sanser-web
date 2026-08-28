import { NextResponse } from "next/server"
import { isAuthenticated } from "@/lib/crm/auth"
import { actualizarFijo } from "@/lib/finanzas/fijos"

/**
 * Sólo PATCH: un fijo no se borra nunca, se da de baja con `activo = false`.
 * Borrarlo dejaría huérfanos los movimientos de los meses ya generados y
 * permitiría volver a generar el mes duplicando el gasto.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) return NextResponse.json({ ok: false }, { status: 401 })
  const { id } = await params
  if (!/^\d+$/.test(id)) return NextResponse.json({ ok: false }, { status: 400 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ ok: false }, { status: 400 })

  const fijo = await actualizarFijo(id, body)
  if (!fijo) return NextResponse.json({ ok: false }, { status: 404 })
  return NextResponse.json({ ok: true, fijo })
}
