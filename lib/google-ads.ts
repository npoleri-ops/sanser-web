/**
 * Medición de la campaña de Google Ads (cuenta 683-457-2262). La etiqueta se
 * carga en el layout; acá sólo se reportan las conversiones.
 */
export const GOOGLE_ADS_ID = "AW-18532536050"

/** Acción de conversión "Solicitud de presupuesto" (objetivo principal de la campaña). */
const SOLICITUD_PRESUPUESTO = `${GOOGLE_ADS_ID}/eMZZCJHX56YdEPKdgIVF`

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

/**
 * Avisa a Google Ads de que un visitante pidió presupuesto. Best-effort: si la
 * etiqueta no cargó (bloqueador de anuncios, sin consentimiento) no pasa nada.
 * Nunca llamarla desde acciones del vendedor: inflaría las conversiones.
 */
export function reportarSolicitudPresupuesto() {
  try {
    window.gtag?.("event", "conversion", { send_to: SOLICITUD_PRESUPUESTO })
  } catch {
    // Nada que hacer: la medición no puede romper el pedido.
  }
}
