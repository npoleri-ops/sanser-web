"use client"

import type { LeadKind } from "./types"

interface TrackPayload {
  kind: LeadKind
  name?: string | null
  phone?: string | null
  cuit?: string | null
  message?: string | null
  quoteTitle?: string | null
  quoteTotal?: number | null
  quoteConfig?: Record<string, unknown> | null
  /** PDF del presupuesto, para poder compartirlo por enlace. */
  pdfBase64?: string
  /** Al enviar por WhatsApp: marca ese presupuesto como contactado. */
  pdfToken?: string
}

export interface LeadRegistrado {
  leadId?: string
  pdfUrl?: string | null
  pdfToken?: string | null
}

/**
 * Registra un lead sin bloquear ni romper nada: si el CRM no responde, el
 * usuario ni se entera.
 */
export function trackLead(payload: TrackPayload) {
  try {
    fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, sourcePath: window.location.pathname }),
      keepalive: true,
    }).catch(() => {})
  } catch {
    // Nada que hacer: el registro es best-effort.
  }
}

/**
 * Igual que trackLead pero esperando la respuesta, que trae el enlace al PDF.
 * Si algo falla devuelve null: el presupuesto ya está descargado en el disco del
 * vendedor y eso no puede depender del CRM.
 */
export async function registrarLead(payload: TrackPayload): Promise<LeadRegistrado | null> {
  try {
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, sourcePath: window.location.pathname }),
    })
    if (!res.ok) return null
    return (await res.json()) as LeadRegistrado
  } catch {
    return null
  }
}
