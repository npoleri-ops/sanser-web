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
