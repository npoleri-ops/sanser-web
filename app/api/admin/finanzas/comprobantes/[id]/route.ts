import { NextResponse } from "next/server"
import { isAuthenticated } from "@/lib/crm/auth"
import { borrarComprobante } from "@/lib/finanzas/comprobantes"

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) return NextResponse.json({ ok: false }, { status: 401 })
  const { id } = await params
  if (!/^\d+$/.test(id)) return NextResponse.json({ ok: false }, { status: 400 })

  const borrado = await borrarComprobante(id)
  return NextResponse.json({ ok: borrado }, { status: borrado ? 200 : 404 })
}
