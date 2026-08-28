import { NextResponse } from "next/server"
import { isAuthenticated } from "@/lib/crm/auth"
import { espacioUsado } from "@/lib/finanzas/comprobantes"
import { proyeccion, rentabilidadObras, resumen, seriePorMes } from "@/lib/finanzas/resumen"

const ES_FECHA = /^\d{4}-\d{2}-\d{2}$/

/**
 * Todo el tablero en una sola llamada. Va aparte de la lista de movimientos a
 * propósito: paginar la tabla no tiene por qué recalcular la proyección.
 */
export async function GET(req: Request) {
  if (!(await isAuthenticated())) return NextResponse.json({ ok: false }, { status: 401 })

  const p = new URL(req.url).searchParams
  const hoy = new Date()
  const desde = p.get("desde") && ES_FECHA.test(p.get("desde")!)
    ? p.get("desde")!
    : `${hoy.getFullYear()}-01-01`
  const hasta = p.get("hasta") && ES_FECHA.test(p.get("hasta")!)
    ? p.get("hasta")!
    : new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).toISOString().slice(0, 10)

  const [datos, serie, obras, proy, espacio] = await Promise.all([
    resumen(desde, hasta),
    seriePorMes(12),
    rentabilidadObras(),
    proyeccion(),
    espacioUsado(),
  ])

  return NextResponse.json({ ok: true, resumen: datos, serie, obras, proyeccion: proy, espacio })
}
