import { isAuthenticated } from "@/lib/crm/auth"
import { Cotizador } from "./cotizador"

/**
 * El cotizador es público, pero quien tenga sesión abierta en el CRM ve la
 * versión completa: precios e ítems editables para armar el presupuesto a mano.
 * Leer la cookie obliga a renderizar en cada petición; es el precio de no tener
 * dos páginas casi iguales.
 */
export default async function CotizarPage() {
  return <Cotizador interno={await isAuthenticated()} />
}
