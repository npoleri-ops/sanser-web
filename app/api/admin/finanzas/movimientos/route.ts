import { NextResponse } from "next/server"
import { isAuthenticated } from "@/lib/crm/auth"
import { crearMovimiento, listMovimientos, obrasImputables } from "@/lib/finanzas/movimientos"
import { DEFAULT_PER_PAGE_FIN, TIPOS, type Tipo } from "@/lib/finanzas/types"
import { leerFiltro } from "@/lib/finanzas/filtro"

const MAX_PER_PAGE = 500
const ES_FECHA = /^\d{4}-\d{2}-\d{2}$/

export async function GET(req: Request) {
  if (!(await isAuthenticated())) return NextResponse.json({ ok: false }, { status: 401 })

  const p = new URL(req.url).searchParams
  const page = Math.max(1, Number(p.get("page")) || 1)
  const perPage = Math.min(MAX_PER_PAGE, Math.max(1, Number(p.get("perPage")) || DEFAULT_PER_PAGE_FIN))

  const { movimientos, total } = await listMovimientos(
    leerFiltro(p),
    { limit: perPage, offset: (page - 1) * perPage },
  )

  // Las obras van en la misma respuesta: el formulario de alta las necesita y
  // pedirlas aparte sería un viaje más para una lista que casi no cambia.
  return NextResponse.json({ ok: true, movimientos, total, page, perPage, obras: await obrasImputables() })
}

export async function POST(req: Request) {
  if (!(await isAuthenticated())) return NextResponse.json({ ok: false }, { status: 401 })

  const body = await req.json().catch(() => null)
  const error = validar(body)
  if (error) return NextResponse.json({ ok: false, error }, { status: 400 })

  const movimiento = await crearMovimiento({
    fecha: body.fecha,
    tipo: body.tipo,
    concepto: String(body.concepto),
    categoria: body.categoria ?? null,
    monto: Number(body.monto),
    medio_pago: body.medio_pago ?? null,
    proveedor: body.proveedor ?? null,
    notas: body.notas ?? null,
    leadId: body.leadId ?? null,
    pagado: typeof body.pagado === "boolean" ? body.pagado : undefined,
    cuotas: body.cuotas ? Number(body.cuotas) : null,
  })

  return NextResponse.json({ ok: true, movimiento }, { status: 201 })
}

/** Un movimiento sin fecha, tipo, concepto o monto no es un movimiento. */
function validar(body: Record<string, unknown> | null): string | null {
  if (!body) return "Cuerpo inválido"
  if (typeof body.fecha !== "string" || !ES_FECHA.test(body.fecha)) return "La fecha va como AAAA-MM-DD"
  if (!TIPOS.includes(body.tipo as Tipo)) return "Tipo desconocido"
  if (typeof body.concepto !== "string" || !body.concepto.trim()) return "Falta el concepto"
  const monto = Number(body.monto)
  if (!Number.isFinite(monto) || monto <= 0) return "El monto tiene que ser mayor que cero"
  return null
}

