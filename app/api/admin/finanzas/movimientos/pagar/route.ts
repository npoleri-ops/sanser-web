import { NextResponse } from "next/server"
import { isAuthenticated } from "@/lib/crm/auth"
import { idsFiltrados, marcarPagados } from "@/lib/finanzas/movimientos"
import { leerFiltro } from "@/lib/finanzas/filtro"

const ES_FECHA = /^\d{4}-\d{2}-\d{2}$/

/**
 * Marca gastos como pagados —o los vuelve a pendientes—, de a varios.
 *
 *   { ids: ["12", "15"], pagado: true, fecha: "2026-10-10" }
 *   { filtro: "pago=pendiente&medioPago=Tarjeta", pagado: true, fecha: "…" }
 *
 * El segundo es el del resumen de la tarjeta: se filtra lo pendiente con
 * tarjeta y se paga todo junto, con la fecha en que se pagó el resumen.
 */
export async function POST(req: Request) {
  if (!(await isAuthenticated())) return NextResponse.json({ ok: false }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body || typeof body.pagado !== "boolean") {
    return NextResponse.json({ ok: false, error: "Falta decir si se pagó o no" }, { status: 400 })
  }
  const fecha = typeof body.fecha === "string" && ES_FECHA.test(body.fecha) ? body.fecha : null
  if (body.pagado && !fecha) {
    return NextResponse.json({ ok: false, error: "Falta la fecha de pago (AAAA-MM-DD)" }, { status: 400 })
  }

  let ids: string[]
  if (Array.isArray(body.ids)) {
    ids = body.ids.map(String).filter((x: string) => /^\d+$/.test(x))
  } else if (typeof body.filtro === "string") {
    ids = await idsFiltrados(leerFiltro(new URLSearchParams(body.filtro)))
  } else {
    return NextResponse.json({ ok: false, error: "Faltan los ids o el filtro" }, { status: 400 })
  }

  const marcados = await marcarPagados(ids, body.pagado, fecha)
  return NextResponse.json({ ok: true, marcados })
}
