import { NextResponse } from "next/server"
import { isAuthenticated } from "@/lib/crm/auth"
import { listClientes, sinTelefono } from "@/lib/crm/leads"

export async function GET(req: Request) {
  if (!(await isAuthenticated())) return NextResponse.json({ ok: false }, { status: 401 })

  const p = new URL(req.url).searchParams
  const page = Math.max(1, Number(p.get("page")) || 1)
  const perPage = Math.min(200, Math.max(1, Number(p.get("perPage")) || 50))

  const [{ clientes, total }, huerfanos] = await Promise.all([
    listClientes({ search: p.get("search") || undefined }, { limit: perPage, offset: (page - 1) * perPage }),
    sinTelefono(),
  ])

  return NextResponse.json({ ok: true, clientes, total, page, perPage, sinTelefono: huerfanos })
}
