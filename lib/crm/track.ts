"use client"

import type { LeadKind } from "./types"

interface TrackPayload {
  kind: LeadKind
  name?: string | null
  phone?: string | null
  email?: string | null
  cuit?: string | null
  message?: string | null
  quoteTitle?: string | null
  quoteTotal?: number | null
  quoteConfig?: Record<string, unknown> | null
  /** PDF del presupuesto, para poder compartirlo por enlace. */
  pdfBase64?: string
  /** Al enviar por WhatsApp: identifica el presupuesto sobre el que se actúa. */
  pdfToken?: string
  /** Quién abre WhatsApp: el vendedor ('interno') o el propio cliente. */
  origen?: "interno" | "cliente"
}

export interface LeadRegistrado {
  leadId?: string
  pdfUrl?: string | null
  pdfToken?: string | null
  token?: string | null
  cotizarUrl?: string | null
  /** Por qué el servidor no lo aceptó (datos mal o demasiados pedidos). */
  error?: string
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
 * Igual que trackLead pero esperando la respuesta, que trae el enlace al PDF
 * o el motivo del rechazo.
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
    // Lo que el servidor rechaza a propósito se le explica al visitante; un
    // fallo de la base, no: eso no es culpa suya.
    if (res.status === 400 || res.status === 429) {
      const { message } = await res.json().catch(() => ({ message: null }))
      return { error: message || "No pudimos registrar tu pedido. Revisá tus datos." }
    }
    if (!res.ok) return null
    return (await res.json()) as LeadRegistrado
  } catch {
    return null
  }
}
