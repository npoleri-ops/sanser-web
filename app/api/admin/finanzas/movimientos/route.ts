import { NextResponse } from "next/server"
import { isAuthenticated } from "@/lib/crm/auth"
import { crearMovimiento, listMovimientos, obrasImputables } from "@/lib/finanzas/movimientos"
import { DEFAULT_PER_PAGE_FIN, TIPOS, type Tipo } from "@/lib/finanzas/types"

const MAX_PER_PAGE = 500
const ES_FECHA = /^\d{4}-\d{2}-\d{2}$/

export async function GET(req: Request) {
  if (!(await isAuthenticated())) return NextResponse.json({ ok: false }, { status: 401 })

  const p = new URL(req.url).searchParams
  const tipo = p.get("tipo")
  const desde = p.get("desde")
  const hasta = p.get("hasta")

  const page = Math.max(1, Number(p.get("page")) || 1)
  const perPage = Math.min(MAX_PER_PAGE, Math.max(1, Number(p.get("perPage")) || DEFAULT_PER_PAGE_FIN))

  const { movimientos, total } = await listMovimientos(
    {
      tipo: TIPOS.includes(tipo as Tipo) ? (tipo as Tipo) : undefined,
      desde: desde && ES_FECHA.test(desde) ? desde : undefined,
      hasta: hasta && ES_FECHA.test(hasta) ? hasta : undefined,
      search: p.get("search") || undefined,
      leadId: /^\d+$/.test(p.get("leadId") ?? "") ? p.get("leadId")! : undefined,
      sinComprobante: p.get("sinComprobante") === "1",
    },
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
