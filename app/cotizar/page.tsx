import { isAuthenticated } from "@/lib/crm/auth"
import { getLead } from "@/lib/crm/leads"
import { getPdfByToken } from "@/lib/crm/pdfs"
import { Cotizador } from "./cotizador"

/**
 * El cotizador es público, pero quien tenga sesión abierta en el CRM ve la
 * versión completa: precios e ítems editables para armar el presupuesto a mano.
 * Con ?lead=<id> (con sesión) reabre un borrador para seguir trabajándolo.
 * Con ?token=<uuid> (público) permite al cliente acceder de forma segura a su cotización
 * interactiva con el modelo 3D, manual de armado y video específico de su galpón.
 */
export default async function CotizarPage({
  searchParams,
}: {
  searchParams: Promise<{ lead?: string; token?: string }>
}) {
  const interno = await isAuthenticated()
  const { lead, token } = await searchParams

  let leadInicial = null

  if (interno && lead && /^\d+$/.test(lead)) {
    leadInicial = await getLead(lead)
  } else if (token && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) {
    const pdf = await getPdfByToken(token)
    if (pdf?.lead_id) {
      leadInicial = await getLead(pdf.lead_id)
    }
  }

  return <Cotizador interno={interno} leadInicial={leadInicial} tokenPublico={token ?? null} />
}