import { NextResponse } from "next/server"
import { isAuthenticated } from "@/lib/crm/auth"
import { actualizarMovimiento, borrarMovimiento, getMovimiento } from "@/lib/finanzas/movimientos"

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  if (!(await isAuthenticated())) return NextResponse.json({ ok: false }, { status: 401 })
  const { id } = await params
  if (!/^\d+$/.test(id)) return NextResponse.json({ ok: false }, { status: 400 })

  const movimiento = await getMovimiento(id)
  if (!movimiento) return NextResponse.json({ ok: false }, { status: 404 })
  return NextResponse.json({ ok: true, movimiento })
}

export async function PATCH(req: Request, { params }: Params) {
  if (!(await isAuthenticated())) return NextResponse.json({ ok: false }, { status: 401 })
  const { id } = await params
  if (!/^\d+$/.test(id)) return NextResponse.json({ ok: false }, { status: 400 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ ok: false }, { status: 400 })

  const movimiento = await actualizarMovimiento(id, body)
  if (!movimiento) return NextResponse.json({ ok: false }, { status: 404 })
  return NextResponse.json({ ok: true, movimiento })
}

export async function DELETE(_req: Request, { params }: Params) {
  if (!(await isAuthenticated())) return NextResponse.json({ ok: false }, { status: 401 })
  const { id } = await params
  if (!/^\d+$/.test(id)) return NextResponse.json({ ok: false }, { status: 400 })

  // Los comprobantes se van con él por el ON DELETE CASCADE de la tabla.
  const borrado = await borrarMovimiento(id)
  return NextResponse.json({ ok: borrado }, { status: borrado ? 200 : 404 })
}
