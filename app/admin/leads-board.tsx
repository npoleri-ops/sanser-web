"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Download,
  FileText,
  Filter,
  LogOut,
  MapPin,
  MessageCircle,
  Phone,
  RefreshCw,
  Search,
} from "lucide-react"
import {
  KIND_LABEL,
  LEAD_KINDS,
  LEAD_STATUSES,
  STATUS_LABEL,
  type Lead,
  type LeadKind,
  type LeadStatus,
} from "@/lib/crm/types"

const KIND_ICON: Record<LeadKind, typeof FileText> = {
  contacto: MessageCircle,
  presupuesto: FileText,
  whatsapp: Phone,
}

const STATUS_STYLE: Record<LeadStatus, string> = {
  nuevo: "bg-primary/15 text-primary border-primary/30",
  contactado: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  presupuestado: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  ganado: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  perdido: "bg-muted text-muted-foreground border-border",
}

const money = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" })

// La zona horaria se fija a Argentina: el servidor corre en UTC y, sin esto, la
// hora del render inicial no coincide con la del navegador.
function formatDate(value: string) {
  return new Date(value).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
  })
}

function waLink(phone: string) {
  const digits = phone.replace(/\D/g, "")
  return `https://wa.me/${digits.startsWith("54") ? digits : `54${digits}`}`
}

export function LeadsBoard({ initialLeads }: { initialLeads: Lead[] }) {
  const [leads, setLeads] = useState(initialLeads)
  const [kind, setKind] = useState<LeadKind | "">("")
  const [status, setStatus] = useState<LeadStatus | "">("")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Lead | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (kind) params.set("kind", kind)
      if (status) params.set("status", status)
      if (search.trim()) params.set("search", search.trim())

      const res = await fetch(`/api/admin/leads?${params}`)
      if (res.status === 401) {
        window.location.reload()
        return
      }
      const data = await res.json()
      setLeads(data.leads ?? [])
    } finally {
      setLoading(false)
    }
  }, [kind, status, search])

  useEffect(() => {
    // El texto se busca con un respiro para no consultar en cada tecla.
    const id = setTimeout(refresh, search ? 350 : 0)
    return () => clearTimeout(id)
  }, [refresh, search])

  async function patchLead(id: string, changes: { status?: LeadStatus; notes?: string }) {
    const res = await fetch("/api/admin/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...changes }),
    })
    if (!res.ok) return
    const { lead } = await res.json()
    setLeads(prev => prev.map(l => (l.id === lead.id ? lead : l)))
    setSelected(prev => (prev && prev.id === lead.id ? lead : prev))
  }

  const stats = useMemo(() => {
    const porTipo = { contacto: 0, presupuesto: 0, whatsapp: 0 } as Record<LeadKind, number>
    let nuevos = 0
    for (const lead of leads) {
      porTipo[lead.kind]++
      if (lead.status === "nuevo") nuevos++
    }
    return { porTipo, nuevos, total: leads.length }
  }, [leads])

  function exportCSV() {
    const headers = [
      "fecha", "tipo", "estado", "nombre", "telefono", "cuit",
      "mensaje", "presupuesto", "total", "ciudad", "provincia", "pais", "ip", "notas",
    ]
    const rows = leads.map(l => [
      formatDate(l.created_at), KIND_LABEL[l.kind], STATUS_LABEL[l.status], l.name, l.phone, l.cuit,
      l.message, l.quote_title, l.quote_total, l.city, l.region, l.country, l.ip, l.notes,
    ])
    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n")

    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }))
    const a = document.createElement("a")
    a.href = url
    a.download = `crm-sanser-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function logout() {
    await fetch("/api/admin/session", { method: "DELETE" })
    window.location.reload()
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold uppercase tracking-wide">CRM SANSER</h1>
          <p className="text-sm text-muted-foreground">
            {stats.total} registros · {stats.nuevos} sin atender · {stats.porTipo.presupuesto}{" "}
            presupuestos · {stats.porTipo.contacto} consultas · {stats.porTipo.whatsapp} WhatsApp
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="lg" onClick={refresh} disabled={loading}>
            <RefreshCw className={loading ? "animate-spin" : ""} /> Actualizar
          </Button>
          <Button variant="outline" size="lg" onClick={exportCSV}>
            <Download /> CSV
          </Button>
          <Button variant="ghost" size="lg" onClick={logout}>
            <LogOut /> Salir
          </Button>
        </div>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, teléfono o mensaje"
            className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-1 text-muted-foreground">
          <Filter className="size-4" />
        </div>

        <select
          value={kind}
          onChange={e => setKind(e.target.value as LeadKind | "")}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        >
          <option value="">Todos los tipos</option>
          {LEAD_KINDS.map(k => (
            <option key={k} value={k}>{KIND_LABEL[k]}</option>
          ))}
        </select>

        <select
          value={status}
          onChange={e => setStatus(e.target.value as LeadStatus | "")}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        >
          <option value="">Todos los estados</option>
          {LEAD_STATUSES.map(s => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
      </div>

      {leads.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border py-16 text-center text-muted-foreground">
          No hay registros con estos filtros.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-3xl text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">Fecha</th>
                <th className="px-4 py-3 font-semibold">Tipo</th>
                <th className="px-4 py-3 font-semibold">Contacto</th>
                <th className="px-4 py-3 font-semibold">Detalle</th>
                <th className="px-4 py-3 font-semibold">Origen</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody>
              {leads.map(lead => {
                const Icon = KIND_ICON[lead.kind]
                return (
                  <tr
                    key={lead.id}
                    onClick={() => setSelected(lead)}
                    className="cursor-pointer border-t border-border transition-colors hover:bg-muted/40"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {formatDate(lead.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5">
                        <Icon className="size-3.5 text-primary" />
                        {KIND_LABEL[lead.kind]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{lead.name || "—"}</div>
                      {lead.phone && (
                        <a
                          href={waLink(lead.phone)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="text-xs text-primary hover:underline"
                        >
                          {lead.phone}
                        </a>
                      )}
                    </td>
                    <td className="max-w-md px-4 py-3">
                      {lead.kind === "presupuesto" ? (
                        <span>
                          {lead.quote_title}
                          {lead.quote_total && (
                            <span className="ml-2 font-mono text-primary">
                              {money.format(Number(lead.quote_total))}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="line-clamp-2 text-muted-foreground">
                          {lead.message || "—"}
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                      {lead.city || lead.country ? (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="size-3" />
                          {[lead.city, lead.region, lead.country].filter(Boolean).join(", ")}
                        </span>
                      ) : (
                        lead.ip || "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full border px-2 py-0.5 text-xs ${STATUS_STYLE[lead.status]}`}
                      >
                        {STATUS_LABEL[lead.status]}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* La `key` remonta el panel al cambiar de lead: así las notas del formulario
          arrancan siempre con las del lead abierto, sin sincronizar por efecto. */}
      {selected && (
        <LeadDetail
          key={selected.id}
          lead={selected}
          onClose={() => setSelected(null)}
          onPatch={patchLead}
        />
      )}
    </main>
  )
}

function LeadDetail({
  lead,
  onClose,
  onPatch,
}: {
  lead: Lead
  onClose: () => void
  onPatch: (id: string, changes: { status?: LeadStatus; notes?: string }) => Promise<void>
}) {
  const [notes, setNotes] = useState(lead.notes ?? "")
  const [saving, setSaving] = useState(false)

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <aside
        onClick={e => e.stopPropagation()}
        className="h-full w-full max-w-md overflow-y-auto border-l border-border bg-card p-6"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-primary">{KIND_LABEL[lead.kind]}</p>
            <h2 className="text-xl font-bold">{lead.name || "Sin nombre"}</h2>
            <p className="text-sm text-muted-foreground">{formatDate(lead.created_at)}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>Cerrar</Button>
        </div>

        <dl className="space-y-3 text-sm">
          <Field label="Teléfono">
            {lead.phone ? (
              <a href={waLink(lead.phone)} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                {lead.phone}
              </a>
            ) : "—"}
          </Field>
          <Field label="CUIT">{lead.cuit || "—"}</Field>
          <Field label="Mensaje">{lead.message || "—"}</Field>
          {lead.kind === "presupuesto" && (
            <>
              <Field label="Presupuesto">{lead.quote_title || "—"}</Field>
              <Field label="Total">
                {lead.quote_total ? money.format(Number(lead.quote_total)) : "—"}
              </Field>
              <Field label="Configuración">
                <pre className="overflow-x-auto rounded bg-muted/50 p-2 font-mono text-xs">
                  {JSON.stringify(lead.quote_config, null, 2)}
                </pre>
              </Field>
            </>
          )}
          <Field label="Ubicación">
            {[lead.city, lead.region, lead.country].filter(Boolean).join(", ") || "—"}
          </Field>
          <Field label="IP">{lead.ip || "—"}</Field>
          <Field label="Página">{lead.source_path || "—"}</Field>
          <Field label="Llegó desde">{lead.referrer || "—"}</Field>
        </dl>

        <div className="mt-6 space-y-2">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Estado</p>
          <div className="flex flex-wrap gap-2">
            {LEAD_STATUSES.map(s => (
              <button
                key={s}
                onClick={() => onPatch(lead.id, { status: s })}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  lead.status === s ? STATUS_STYLE[s] : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Notas</p>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={5}
            placeholder="Qué se habló, qué quedó pendiente…"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <Button
            size="lg"
            disabled={saving || notes === (lead.notes ?? "")}
            onClick={async () => {
              setSaving(true)
              await onPatch(lead.id, { notes })
              setSaving(false)
            }}
          >
            {saving ? "Guardando…" : "Guardar notas"}
          </Button>
        </div>
      </aside>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words">{children}</dd>
    </div>
  )
}
