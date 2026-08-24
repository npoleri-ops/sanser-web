import type { Lead } from "./types"

// Reutilizamos el Formspree que ya avisa de las consultas del formulario: no
// hace falta dar de alta ningún servicio nuevo ni gestionar otra clave. Si algún
// día el volumen supera su plan, se cambia esta constante por Resend y listo.
const NOTIFY_ENDPOINT = process.env.LEAD_NOTIFY_ENDPOINT || "https://formspree.io/f/xyegjjdz"

const money = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" })

/**
 * Avisa por correo de un lead recién entrado. Es best-effort a propósito: que
 * falle el aviso no puede tumbar el registro del lead, que es lo importante.
 */
export async function notifyLead(lead: Lead, pdfUrl?: string | null) {
  if (process.env.NODE_ENV !== "production" && process.env.FORMSPREE_ENABLED !== "true") {
    console.log(`[crm] Aviso omitido fuera de producción (lead ${lead.id}, ${lead.kind})`)
    return
  }

  const titulo =
    lead.kind === "presupuesto"
      ? `Nuevo presupuesto: ${lead.quote_title ?? "sin título"}`
      : "Nueva consulta desde la web"

  const lineas = [
    `Cliente: ${lead.name || "—"}`,
    `Teléfono: ${lead.phone || "—"}`,
    lead.cuit ? `CUIT: ${lead.cuit}` : null,
    lead.quote_total ? `Total: ${money.format(Number(lead.quote_total))}` : null,
    lead.message ? `Mensaje: ${lead.message}` : null,
    [lead.city, lead.region, lead.country].filter(Boolean).length
      ? `Desde: ${[lead.city, lead.region, lead.country].filter(Boolean).join(", ")}`
      : null,
    pdfUrl ? `PDF: ${pdfUrl}` : null,
    "",
    "Ver en el CRM: https://www.sansermetalurgica.com.ar/admin",
  ].filter(Boolean)

  try {
    const form = new FormData()
    form.append("_subject", `[SANSER] ${titulo}`)
    form.append("name", lead.name || "Cliente")
    form.append("phone", lead.phone || "")
    form.append("message", lineas.join("\n"))

    await fetch(NOTIFY_ENDPOINT, {
      method: "POST",
      body: form,
      headers: { Accept: "application/json" },
    })
  } catch (error) {
    console.error("No se pudo enviar el aviso del lead", error)
  }
}
