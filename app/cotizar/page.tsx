import { isAuthenticated } from "@/lib/crm/auth"
import { getLead } from "@/lib/crm/leads"
import { Cotizador } from "./cotizador"

/**
 * El cotizador es público, pero quien tenga sesión abierta en el CRM ve la
 * versión completa: precios e ítems editables para armar el presupuesto a mano.
 * Con ?lead=<id> reabre un borrador para seguir trabajándolo.
 */
export default async function CotizarPage({
  searchParams,
}: {
  searchParams: Promise<{ lead?: string }>
}) {
  const interno = await isAuthenticated()
  const { lead } = await searchParams

  // Sólo se reabre un presupuesto con sesión: si no, sería exponer los datos de
  // un cliente a quien pase por la URL.
  const leadInicial = interno && lead && /^\d+$/.test(lead) ? await getLead(lead) : null

  return <Cotizador interno={interno} leadInicial={leadInicial} />
}
