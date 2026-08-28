import { NextResponse } from "next/server"
import { isAuthenticated } from "@/lib/crm/auth"
import { crearFijo, listFijos } from "@/lib/finanzas/fijos"

export async function GET(req: Request) {
  if (!(await isAuthenticated())) return NextResponse.json({ ok: false }, { status: 401 })
  const incluirBajas = new URL(req.url).searchParams.get("todos") === "1"
  return NextResponse.json({ ok: true, fijos: await listFijos(incluirBajas) })
}

export async function POST(req: Request) {
  if (!(await isAuthenticated())) return NextResponse.json({ ok: false }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body || typeof body.concepto !== "string" || !body.concepto.trim()) {
    return NextResponse.json({ ok: false, error: "Falta el concepto" }, { status: 400 })
  }
  const monto = Number(body.monto)
  if (!Number.isFinite(monto) || monto <= 0) {
    return NextResponse.json({ ok: false, error: "El monto tiene que ser mayor que cero" }, { status: 400 })
  }
  const dia = Number(body.dia_pago)

  const fijo = await crearFijo({
    concepto: body.concepto,
    categoria: body.categoria ?? null,
    monto,
    proveedor: body.proveedor ?? null,
    dia_pago: Number.isInteger(dia) && dia >= 1 && dia <= 31 ? dia : null,
  })

  return NextResponse.json({ ok: true, fijo }, { status: 201 })
}
