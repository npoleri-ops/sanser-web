import { NextResponse } from "next/server"
import { isAuthenticated } from "@/lib/crm/auth"
import {
  actualizarBorrador,
  confirmarPresupuesto,
  createLead,
  faltaContacto,
  getStats,
  listLeads,
  updateLead,
} from "@/lib/crm/leads"
import {
  DEFAULT_PER_PAGE,
  LEAD_KINDS,
  LEAD_STATUSES,
  type LeadKind,
  type LeadStatus,
} from "@/lib/crm/types"

const MAX_PER_PAGE = 500

export async function GET(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  const params = new URL(req.url).searchParams
  const kind = params.get("kind")
  const status = params.get("status")
  const search = params.get("search")

  const page = Math.max(1, Number(params.get("page")) || 1)
  const perPage = Math.min(MAX_PER_PAGE, Math.max(1, Number(params.get("perPage")) || DEFAULT_PER_PAGE))

  // Las cifras de cabecera son del total, no de lo filtrado: si no, cambiarían
  // al buscar y dejarían de servir como foto del estado del negocio.
  const [{ leads, total }, stats] = await Promise.all([
    listLeads(
      {
        kind: LEAD_KINDS.includes(kind as LeadKind) ? (kind as LeadKind) : undefined,
        status: LEAD_STATUSES.includes(status as LeadStatus) ? (status as LeadStatus) : undefined,
        search: search || undefined,
        dormidos: params.get("dormidos") === "1",
      },
      { limit: perPage, offset: (page - 1) * perPage },
    ),
    getStats(),
  ])

  return NextResponse.json({ ok: true, leads, total, page, perPage, stats })
}

/** Alta manual desde el panel: la consulta que entró por teléfono o en persona. */
export async function POST(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  const body = await req.json()
  const kind = body?.kind as LeadKind

  if (!LEAD_KINDS.includes(kind)) {
    return NextResponse.json({ ok: false, message: "Tipo de lead no válido" }, { status: 400 })
  }
  if (body.status && !LEAD_STATUSES.includes(body.status as LeadStatus)) {
    return NextResponse.json({ ok: false, message: "Estado no válido" }, { status: 400 })
  }

  const total = Number(body.quoteTotal)

  const datos = {
    kind,
    name: body.name || null,
    phone: body.phone || null,
  }
  if (faltaContacto(datos)) {
    return NextResponse.json(
      { ok: false, message: "El nombre y el teléfono son obligatorios" },
      { status: 400 },
    )
  }

  const lead = await createLead(
    {
      kind,
      name: body.name || null,
      phone: body.phone || null,
      cuit: body.cuit || null,
      message: body.message || null,
      quoteTitle: body.quoteTitle || null,
      quoteTotal: Number.isFinite(total) && total > 0 ? total : null,
      status: (body.status as LeadStatus) || null,
      notes: body.notes || null,
      // Marca de dónde salió: no vino del sitio, lo cargó alguien a mano.
      sourcePath: "alta manual",
    },
    { referrer: null, userAgent: null, ip: null, city: null, region: null, country: null },
  )

  return NextResponse.json({ ok: true, lead })
}

/** Confirmar un presupuesto: sólo desde el panel, nunca desde el cotizador público. */
export async function PUT(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  const body = await req.json()
  if (!body?.id) return NextResponse.json({ ok: false }, { status: 400 })

  // Se confirma lo que Santi tiene en pantalla, no lo que se guardó al pedirlo.
  await actualizarBorrador(String(body.id), {
    name: body.name,
    phone: body.phone,
    cuit: body.cuit,
    quoteTitle: body.quoteTitle,
    quoteTotal: typeof body.quoteTotal === "number" ? body.quoteTotal : null,
    quoteConfig: body.quoteConfig ?? null,
  })

  const lead = await confirmarPresupuesto(String(body.id))
  if (!lead) {
    return NextResponse.json(
      { ok: false, message: "No se encontró el presupuesto" },
      { status: 404 },
    )
  }

  return NextResponse.json({ ok: true, lead })
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
