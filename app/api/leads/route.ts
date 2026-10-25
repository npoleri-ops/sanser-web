import { NextResponse } from "next/server"
import {
  actualizarPedidoReciente,
  anotarWhatsAppEnPedidoReciente,
  createLead,
  marcarPresupuestoEnviado,
  readRequestContext,
  registrarConsultaDelCliente,
  superaLimiteDePedidos,
} from "@/lib/crm/leads"
import { isAuthenticated } from "@/lib/crm/auth"
import { normalizarTelefono, problemaDeContacto } from "@/lib/crm/contacto"
import { notifyLead } from "@/lib/crm/notify"
import { savePdf } from "@/lib/crm/pdfs"
import { isDatabaseConfigured } from "@/lib/crm/db"
import { LEAD_KINDS, type LeadKind } from "@/lib/crm/types"

/**
 * Registra en el CRM los eventos que nacen en el cliente: un presupuesto
 * generado en el cotizador o un clic al WhatsApp. Nunca debe romper la
 * experiencia del usuario, así que ante cualquier fallo responde 200.
 */
function publicOrigin(req: Request) {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host")
  if (!host) return new URL(req.url).origin
  const proto = req.headers.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https")
  return `${proto}://${host}`
}

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

    // Envío del presupuesto por WhatsApp: avanza el lead existente en vez de
    // duplicarlo. El token del PDF dice de cuál se trata.
    if (kind === "whatsapp" && typeof body.pdfToken === "string") {
      const lead =
        body.origen === "cliente"
          ? await registrarConsultaDelCliente(body.pdfToken)
          : await marcarPresupuestoEnviado(body.pdfToken)
      return NextResponse.json({ ok: true, stored: false, actualizado: Boolean(lead) })
    }

    // Con sesión abierta es Santi armando un presupuesto; si no, un visitante.
    const interno = await isAuthenticated()
    const ctx = readRequestContext(req)
    const quoteConfig = body.quoteConfig ?? null
    // Los formularios viejos que sigan abiertos mandan el correo dentro de la
    // configuración.
    const email = body.email || quoteConfig?.email || null

    if (kind !== "whatsapp") {
      const problema = problemaDeContacto({
        name: body.name,
        phone: body.phone,
        email,
        exigirEmail: !interno,
      })
      if (problema) {
        return NextResponse.json({ ok: false, message: problema }, { status: 400 })
      }
    }

    const telefono = normalizarTelefono(body.phone)
    const lead = {
      kind,
      name: body.name?.trim() || null,
      // Guardado listo para wa.me: «2216701307» sin el 549 no abre ningún chat.
      phone: telefono.ok ? telefono.digitos : body.phone || null,
      email: email ? String(email).trim().toLowerCase() : null,
      cuit: body.cuit || null,
      message: body.message || null,
      quoteTitle: body.quoteTitle || null,
      quoteTotal: typeof body.quoteTotal === "number" ? body.quoteTotal : null,
      quoteConfig,
      sourcePath: body.sourcePath || null,
    }

    // El clic a WhatsApp de quien acaba de pedir presupuesto es parte de ese
    // pedido, no un registro más.
    if (kind === "whatsapp" && !interno) {
      const anotado = await anotarWhatsAppEnPedidoReciente(lead)
      if (anotado) return NextResponse.json({ ok: true, stored: false, actualizado: true })
    }

    const repetido = await actualizarPedidoReciente(lead, { porVisitante: !interno })
    if (!repetido && !interno && kind !== "whatsapp" && (await superaLimiteDePedidos(lead.email, ctx.ip))) {
      return NextResponse.json(
        {
          ok: false,
          limitado: true,
          message:
            "Ya recibimos tus pedidos y te vamos a contactar. Si querés sumar algo, escribinos por WhatsApp.",
        },
        { status: 429 },
      )
    }
    const guardado = repetido ?? (await createLead(lead, ctx))

    // El PDF llega en base64 junto al presupuesto: así el vendedor puede mandar
    // un enlace por WhatsApp en vez de adjuntar el archivo a mano.
    let pdfUrl: string | null = null
    let pdfToken: string | null = null
    if (typeof body.pdfBase64 === "string" && body.pdfBase64.length > 0) {
      const pdf = await savePdf(guardado.id, body.pdfBase64)
      // El enlace se manda al cliente, así que tiene que llevar el dominio real:
      // req.url trae el host interno con el que arrancó el servidor.
      if (pdf) {
        pdfUrl = `${publicOrigin(req)}/api/presupuesto/${pdf.token}`
        pdfToken = pdf.token
      }
    }

    // El aviso no bloquea la respuesta: el cotizador no tiene por qué esperar a
    // que Formspree conteste. Un pedido repetido ya se avisó la primera vez.
    if (kind !== "whatsapp" && !repetido) {
      void notifyLead(guardado, pdfUrl)
    }

    return NextResponse.json({ ok: true, stored: true, leadId: guardado.id, pdfUrl, pdfToken })
  } catch (error) {
    console.error("No se pudo registrar el lead", error)
    return NextResponse.json({ ok: true, stored: false })
  }
}
