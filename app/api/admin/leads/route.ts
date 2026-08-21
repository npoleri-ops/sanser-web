import { NextResponse } from "next/server"
import { isAuthenticated } from "@/lib/crm/auth"
import { listLeads, updateLead } from "@/lib/crm/leads"
import { LEAD_KINDS, LEAD_STATUSES, type LeadKind, type LeadStatus } from "@/lib/crm/types"

export async function GET(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  const params = new URL(req.url).searchParams
  const kind = params.get("kind")
  const status = params.get("status")
  const search = params.get("search")

  const leads = await listLeads({
    kind: LEAD_KINDS.includes(kind as LeadKind) ? (kind as LeadKind) : undefined,
    status: LEAD_STATUSES.includes(status as LeadStatus) ? (status as LeadStatus) : undefined,
    search: search || undefined,
  })

  return NextResponse.json({ ok: true, leads })
}

export async function PATCH(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  const body = await req.json()
  if (!body?.id) return NextResponse.json({ ok: false }, { status: 400 })

  const lead = await updateLead(String(body.id), {
    status: body.status,
    notes: body.notes,
  })

  if (!lead) return NextResponse.json({ ok: false, message: "Cambio no válido" }, { status: 400 })
  return NextResponse.json({ ok: true, lead })
}
