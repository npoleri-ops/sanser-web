import { NextResponse } from "next/server"
import { isAuthenticated } from "@/lib/crm/auth"
import { generarMes } from "@/lib/finanzas/fijos"

/** Vuelca los fijos activos como movimientos del mes indicado (AAAA-MM). */
export async function POST(req: Request) {
  if (!(await isAuthenticated())) return NextResponse.json({ ok: false }, { status: 401 })

  const body = await req.json().catch(() => null)
  const periodo = body?.periodo
  if (typeof periodo !== "string" || !/^\d{4}-\d{2}$/.test(periodo)) {
    return NextResponse.json({ ok: false, error: "El período va como AAAA-MM" }, { status: 400 })
  }

  return NextResponse.json({ ok: true, ...(await generarMes(periodo)) })
}
