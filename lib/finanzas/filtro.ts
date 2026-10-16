import { MEDIOS_PAGO, PAGO, TIPOS, type EstadoPago, type FiltroMovimientos, type Tipo } from "./types"

const ES_FECHA = /^\d{4}-\d{2}-\d{2}$/

/**
 * Los filtros de la tabla, leídos de la URL. Compartido con «marcar pagados»:
 * marcar «todos los que estoy viendo» tiene que ver exactamente lo mismo.
 */
export function leerFiltro(p: URLSearchParams): FiltroMovimientos {
  const tipo = p.get("tipo")
  const desde = p.get("desde")
  const hasta = p.get("hasta")
  const pago = p.get("pago")
  const medio = p.get("medioPago")
  return {
    tipo: TIPOS.includes(tipo as Tipo) ? (tipo as Tipo) : undefined,
    desde: desde && ES_FECHA.test(desde) ? desde : undefined,
    hasta: hasta && ES_FECHA.test(hasta) ? hasta : undefined,
    search: p.get("search") || undefined,
    leadId: /^\d+$/.test(p.get("leadId") ?? "") ? p.get("leadId")! : undefined,
    sinComprobante: p.get("sinComprobante") === "1",
    pago: PAGO.includes(pago as EstadoPago) ? (pago as EstadoPago) : undefined,
    medioPago: (MEDIOS_PAGO as readonly string[]).includes(medio ?? "") ? medio! : undefined,
    sinObra: p.get("sinObra") === "1",
  }
}
