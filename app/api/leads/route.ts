import { NextResponse } from "next/server"
import { createLead, faltaContacto, readRequestContext } from "@/lib/crm/leads"
import { isDatabaseConfigured } from "@/lib/crm/db"
import { LEAD_KINDS, type LeadKind } from "@/lib/crm/types"

/**
 * Registra en el CRM los eventos que nacen en el cliente: un presupuesto
 * generado en el cotizador o un clic al WhatsApp. Nunca debe romper la
 * experiencia del usuario, así que ante cualquier fallo responde 200.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const kind = body?.kind as LeadKind

    if (!LEAD_KINDS.includes(kind)) {
      return NextResponse.json({ ok: false, message: "Tipo de lead desconocido" }, { status: 400 })
    }
    if (!isDatabaseConfigured()) {
      return NextResponse.json({ ok: true, stored: false })
    }

    const lead = {
      kind,
      name: body.name || null,
      phone: body.phone || null,
      cuit: body.cuit || null,
      message: body.message || null,
      quoteTitle: body.quoteTitle || null,
      quoteTotal: typeof body.quoteTotal === "number" ? body.quoteTotal : null,
      quoteConfig: body.quoteConfig ?? null,
      sourcePath: body.sourcePath || null,
    }

    if (faltaContacto(lead)) {
      return NextResponse.json(
        { ok: false, message: "Falta el nombre o el teléfono del cliente" },
        { status: 400 },
      )
    }

    await createLead(lead, readRequestContext(req))

    return NextResponse.json({ ok: true, stored: true })
  } catch (error) {
    console.error("No se pudo registrar el lead", error)
    return NextResponse.json({ ok: true, stored: false })
  }
}
