"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  AlarmClock,
  ChevronLeft,
  ChevronRight,
  Download,
  FileDown,
  FilePen,
  FileText,
  Filter,
  LogOut,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Wallet,
} from "lucide-react"
import {
  KIND_LABEL,
  LEAD_KINDS,
  LEAD_STATUSES,
  QUOTE_STATE_LABEL,
  STATUS_LABEL,
  type Lead,
  type LeadKind,
  type LeadStats,
  type LeadStatus,
  type Cliente,
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

/**
 * Misma regla que la columna generada de Postgres: sólo dígitos y los últimos
 * diez. Si las dos se separan, el contador diría una cosa y el filtro otra.
 */
function clavePorTelefono(telefono: string) {
  return telefono.replace(/\D/g, "").slice(-10)
}

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

export function LeadsBoard({
  initialLeads,
  initialTotal,
  initialStats,
  perPage,
}: {
  initialLeads: Lead[]
  initialTotal: number
  initialStats: LeadStats
  perPage: number
}) {
  const [leads, setLeads] = useState(initialLeads)
  const [total, setTotal] = useState(initialTotal)
  const [page, setPage] = useState(1)
  const [kind, setKind] = useState<LeadKind | "">("")
  const [status, setStatus] = useState<LeadStatus | "">("")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Lead | null>(null)
  const [creating, setCreating] = useState(false)
  const [stats, setStats] = useState(initialStats)
  const [soloDormidos, setSoloDormidos] = useState(false)
  /** Ids marcados con la casilla, para borrar o restaurar en lote. */
  const [marcados, setMarcados] = useState<Set<string>>(new Set())
  const [papelera, setPapelera] = useState(false)
  const [enPapelera, setEnPapelera] = useState(0)
  /** Filtro por cliente: se activa al pinchar uno en la lista de clientes. */
  const [phoneKey, setPhoneKey] = useState<string | null>(null)
  const [vista, setVista] = useState<"registros" | "clientes">("registros")
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [sinTel, setSinTel] = useState(0)

  const filterParams = useCallback(() => {
    const params = new URLSearchParams()
    if (kind) params.set("kind", kind)
    if (status) params.set("status", status)
    if (search.trim()) params.set("search", search.trim())
    if (soloDormidos) params.set("dormidos", "1")
    if (papelera) params.set("borrados", "1")
    if (phoneKey) params.set("phoneKey", phoneKey)
    return params
  }, [kind, status, search, soloDormidos, papelera, phoneKey])

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const params = filterParams()
      params.set("page", String(page))
      params.set("perPage", String(perPage))

      const res = await fetch(`/api/admin/leads?${params}`)
      if (res.status === 401) {
        window.location.reload()
        return
      }
      const data = await res.json()
      setLeads(data.leads ?? [])
      setTotal(data.total ?? 0)
      if (data.stats) setStats(data.stats)
      if (typeof data.borrados === "number") setEnPapelera(data.borrados)
      // Lo marcado deja de tener sentido en cuanto cambia lo que se ve: si no,
      // se podría borrar algo que ya no está en pantalla.
      setMarcados(new Set())
    } finally {
      setLoading(false)
    }
  }, [filterParams, page, perPage])

  const cargarClientes = useCallback(async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams()
      if (search.trim()) p.set("search", search.trim())
      const res = await fetch(`/api/admin/clientes?${p}`)
      const data = await res.json()
      if (data.ok) {
        setClientes(data.clientes)
        setSinTel(data.sinTelefono ?? 0)
      }
    } finally {
      setLoading(false)
    }
  }, [search])

  /** Borrar o restaurar lo marcado. */
  const accionEnLote = useCallback(async (accion: "borrar" | "restaurar") => {
    const ids = [...marcados]
    if (ids.length === 0) return
    if (accion === "borrar" && !confirm(
      `¿Sacar ${ids.length} ${ids.length === 1 ? "registro" : "registros"} de la lista?\n\n` +
      "No se borran de verdad: quedan en la papelera y se pueden recuperar.",
    )) return

    const res = await fetch("/api/admin/leads/borrar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, accion }),
    })
    if (res.ok) await refresh()
  }, [marcados, refresh])

  function alternarMarca(id: string) {
    setMarcados(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }

  useEffect(() => {
    // El texto se busca con un respiro para no consultar en cada tecla.
    const id = setTimeout(refresh, search ? 350 : 0)
    return () => clearTimeout(id)
  }, [refresh, search])

  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const desde = total === 0 ? 0 : (page - 1) * perPage + 1
  const hasta = Math.min(page * perPage, total)

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

  async function exportCSV() {
    // Sin esto el CSV sólo llevaría la página en pantalla, que es justo lo que
    // nadie espera al pulsar "exportar".
    const params = filterParams()
    params.set("page", "1")
    params.set("perPage", "500")
    const res = await fetch(`/api/admin/leads?${params}`)
    const { leads: todos = [], total: encontrados = 0 } = await res.json()

    if (encontrados > todos.length) {
      alert(
        `Hay ${encontrados} registros y el CSV exporta los ${todos.length} más recientes.`,
      )
    }

    const headers = [
      "fecha", "tipo", "estado", "nombre", "telefono", "cuit",
      "mensaje", "presupuesto", "total", "ciudad", "provincia", "pais", "ip", "notas",
    ]
    const rows = (todos as Lead[]).map(l => [
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
          <Button size="lg" onClick={() => setCreating(true)}>
            <Plus /> Nuevo
          </Button>
          <Button variant="outline" size="lg" onClick={refresh} disabled={loading}>
            <RefreshCw className={loading ? "animate-spin" : ""} /> Actualizar
          </Button>
          <Button variant="outline" size="lg" onClick={exportCSV}>
            <Download /> CSV
          </Button>
          <Link href="/admin/finanzas" className={buttonVariants({ variant: "outline", size: "lg" })}>
            <Wallet /> Finanzas
          </Link>
          <Button variant="ghost" size="lg" onClick={logout}>
            <LogOut /> Salir
          </Button>
        </div>
      </header>

      {stats.dormidos > 0 && (
        <button
          onClick={() => {
            setSoloDormidos(v => !v)
            setPage(1)
          }}
          className={`mb-4 flex w-full items-center gap-2 rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
            soloDormidos
              ? "border-primary bg-primary/10 text-primary"
              : "border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/15"
          }`}
        >
          <AlarmClock className="size-4 shrink-0" />
          <span>
            <strong>{stats.dormidos}</strong>{" "}
            {stats.dormidos === 1 ? "registro lleva" : "registros llevan"} más de 48 h sin
            atender.
          </span>
          <span className="ml-auto text-xs opacity-80">
            {soloDormidos ? "Ver todos" : "Ver sólo esos"}
          </span>
        </button>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="Buscar por nombre, teléfono o mensaje"
            className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-1 text-muted-foreground">
          <Filter className="size-4" />
        </div>

        <select
          value={kind}
          onChange={e => {
            setKind(e.target.value as LeadKind | "")
            setPage(1)
          }}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        >
          <option value="">Todos los tipos</option>
          {LEAD_KINDS.map(k => (
            <option key={k} value={k}>{KIND_LABEL[k]}</option>
          ))}
        </select>

        <select
          value={status}
          onChange={e => {
            setStatus(e.target.value as LeadStatus | "")
            setPage(1)
          }}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        >
          <option value="">Todos los estados</option>
          {LEAD_STATUSES.map(s => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>

        <Button
          variant={papelera ? "default" : "outline"}
          size="sm"
          onClick={() => { setPapelera(v => !v); setPage(1) }}
          title="Lo borrado no se pierde: se guarda acá y se puede recuperar"
        >
          <Trash2 /> Papelera{enPapelera > 0 && ` (${enPapelera})`}
        </Button>
      </div>

      {/* Dos maneras de mirar lo mismo: cada registro suelto, o una fila por
          cliente. La segunda es la que evita ver diez veces a la misma persona. */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {([["registros", "Registros"], ["clientes", "Clientes"]] as const).map(([v, etiqueta]) => (
          <button
            key={v}
            onClick={() => {
              setVista(v)
              setPhoneKey(null)
              if (v === "clientes") void cargarClientes()
            }}
            className={`rounded-md border px-3 py-1.5 text-sm font-medium ${
              vista === v ? "border-primary bg-primary/15" : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {etiqueta}
          </button>
        ))}

        {phoneKey && (
          <button
            onClick={() => { setPhoneKey(null); setPage(1) }}
            className="rounded-md border border-primary/40 bg-primary/10 px-3 py-1.5 text-sm"
          >
            Viendo un solo cliente · quitar filtro ✕
          </button>
        )}
      </div>

      {marcados.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-sm">
          <span className="mr-auto">
            {marcados.size} {marcados.size === 1 ? "marcado" : "marcados"}
          </span>
          {papelera ? (
            <Button size="sm" onClick={() => void accionEnLote("restaurar")}>
              <RefreshCw /> Restaurar
            </Button>
          ) : (
            <Button variant="destructive" size="sm" onClick={() => void accionEnLote("borrar")}>
              <Trash2 /> Borrar de la lista
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => setMarcados(new Set())}>Quitar marcas</Button>
        </div>
      )}

      {vista === "clientes" ? (
        <ListaClientes
          clientes={clientes}
          sinTelefono={sinTel}
          onVerRegistros={key => { setPhoneKey(key); setVista("registros"); setPage(1) }}
        />
      ) : leads.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border py-16 text-center text-muted-foreground">
          {papelera ? "La papelera está vacía." : "No hay registros con estos filtros."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-3xl text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label="Marcar todos"
                    className="size-4 accent-primary"
                    checked={leads.length > 0 && marcados.size === leads.length}
                    onChange={e =>
                      setMarcados(e.target.checked ? new Set(leads.map(l => l.id)) : new Set())
                    }
                  />
                </th>
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
                    {/* El clic en la casilla no debe abrir la ficha del lead. */}
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        aria-label={`Marcar ${lead.name ?? "registro"}`}
                        className="size-4 accent-primary"
                        checked={marcados.has(lead.id)}
                        onChange={() => alternarMarca(lead.id)}
                      />
                    </td>
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
                          {lead.quote_state === "borrador" ? (
                            <span className="mr-2 rounded border border-border px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                              Borrador
                            </span>
                          ) : (
                            <span className="mr-2 font-mono text-xs text-emerald-400">
                              {lead.quote_number}
                            </span>
                          )}
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
      {total > perPage && (
        <div className="mt-4 flex items-center justify-between gap-4 text-sm">
          <p className="text-muted-foreground">
            {desde}–{hasta} de {total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="lg"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
            >
              <ChevronLeft /> Anterior
            </Button>
            <span className="text-muted-foreground">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="lg"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
            >
              Siguiente <ChevronRight />
            </Button>
          </div>
        </div>
      )}

      {creating && (
        <NewLeadForm
          onClose={() => setCreating(false)}
          onCreated={lead => {
            setCreating(false)
            refresh()
            setSelected(lead)
          }}
        />
      )}

      {selected && (
        <LeadDetail
          key={selected.id}
          lead={selected}
          onClose={() => setSelected(null)}
          onPatch={patchLead}
          onVerHistorial={telefono => {
            setSelected(null)
            setSoloDormidos(false)
            setKind("")
            setStatus("")
            setSearch("")
            // Por la clave y no por texto: el contador de al lado se calcula con
            // el teléfono normalizado, así que buscar la cadena tal cual daría un
            // número distinto al que se acaba de leer.
            setPhoneKey(clavePorTelefono(telefono))
            setPage(1)
          }}
        />
      )}
    </main>
  )
}

function LeadDetail({
  lead,
  onClose,
  onPatch,
  onVerHistorial,
}: {
  lead: Lead
  onClose: () => void
  onPatch: (id: string, changes: { status?: LeadStatus; notes?: string }) => Promise<void>
  onVerHistorial: (telefono: string) => void
}) {
  const [notes, setNotes] = useState(lead.notes ?? "")
  const [saving, setSaving] = useState(false)
  const [enlaceCopiado, setEnlaceCopiado] = useState(false)

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
              {/* Los presupuestos cargados a mano no traen configuración del 3D.
                  Va plegada: ocupa media pantalla y se consulta de vez en cuando. */}
              {lead.quote_config && (
                <details>
                  <summary className="cursor-pointer text-xs font-semibold uppercase text-muted-foreground hover:text-foreground">
                    Configuración del modelo
                  </summary>
                  <pre className="mt-2 max-h-64 overflow-auto rounded bg-muted/50 p-2 font-mono text-xs">
                    {JSON.stringify(lead.quote_config, null, 2)}
                  </pre>
                </details>
              )}
            </>
          )}
          {lead.kind === "presupuesto" && (
            <Field label="Documento">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-2 py-0.5 text-xs ${
                    lead.quote_state === "confirmado"
                      ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-400"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {QUOTE_STATE_LABEL[lead.quote_state]}
                  {lead.quote_number ? ` · ${lead.quote_number}` : ""}
                </span>
                <a
                  href={`/cotizar?lead=${lead.id}`}
                  className="inline-flex items-center gap-1.5 text-primary hover:underline"
                >
                  <FilePen className="size-4" />
                  {lead.quote_state === "confirmado" ? "Ver en el cotizador" : "Abrir y confirmar"}
                </a>
              </div>
            </Field>
          )}

          {lead.pdf_token && (
            <Field label="PDF del presupuesto">
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={`/api/presupuesto/${lead.pdf_token}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-primary hover:underline"
                >
                  <FileDown className="size-4" /> Abrir
                </a>
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(
                      `${window.location.origin}/api/presupuesto/${lead.pdf_token}`,
                    )
                    setEnlaceCopiado(true)
                  }}
                  className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-muted"
                >
                  {enlaceCopiado ? "Enlace copiado" : "Copiar enlace"}
                </button>
              </div>
            </Field>
          )}

          {lead.phone && (lead.phone_count ?? 0) > 1 && (
            <Field label="Historial">
              <button
                onClick={() => onVerHistorial(lead.phone!)}
                className="text-primary hover:underline"
              >
                Ver los {lead.phone_count} registros de este teléfono
              </button>
            </Field>
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

/**
 * Alta manual: la consulta que entró por teléfono, por Instagram o en el taller.
 * Por defecto es un presupuesto, que es el caso habitual.
 */
function NewLeadForm({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (lead: Lead) => void
}) {
  const [kind, setKind] = useState<LeadKind>("presupuesto")
  const [status, setStatus] = useState<LeadStatus>("nuevo")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [cuit, setCuit] = useState("")
  const [quoteTitle, setQuoteTitle] = useState("")
  const [quoteTotal, setQuoteTotal] = useState("")
  const [message, setMessage] = useState("")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const esPresupuesto = kind === "presupuesto"
  // Nombre y teléfono son la razón de ser del registro: sin ellos no hay a quién
  // volver a llamar.
  const puedeGuardar = Boolean(name.trim() && phone.trim())

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const res = await fetch("/api/admin/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind,
        status,
        name: name.trim() || null,
        phone: phone.trim() || null,
        cuit: cuit.trim() || null,
        message: message.trim() || null,
        notes: notes.trim() || null,
        quoteTitle: esPresupuesto ? quoteTitle.trim() || null : null,
        quoteTotal: esPresupuesto ? Number(quoteTotal.replace(",", ".")) : null,
      }),
    })

    if (!res.ok) {
      setError("No se pudo guardar. Revisá los datos e intentá de nuevo.")
      setSaving(false)
      return
    }

    const { lead } = await res.json()
    onCreated(lead)
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        onClick={e => e.stopPropagation()}
        className="h-full w-full max-w-md overflow-y-auto border-l border-border bg-card p-6"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-primary">Alta manual</p>
            <h2 className="text-xl font-bold">Nuevo registro</h2>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cerrar</Button>
        </div>

        <div className="space-y-4">
          <Campo label="Tipo">
            <select
              value={kind}
              onChange={e => setKind(e.target.value as LeadKind)}
              className={inputClass}
            >
              {LEAD_KINDS.map(k => (
                <option key={k} value={k}>{KIND_LABEL[k]}</option>
              ))}
            </select>
          </Campo>

          <Campo label="Nombre *">
            <input value={name} onChange={e => setName(e.target.value)} className={inputClass} autoFocus />
          </Campo>

          <Campo label="Teléfono *">
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="Ej: 5493743487728"
              className={inputClass}
            />
          </Campo>

          <Campo label="CUIT">
            <input value={cuit} onChange={e => setCuit(e.target.value)} className={inputClass} />
          </Campo>

          {esPresupuesto && (
            <>
              <Campo label="Presupuesto">
                <input
                  value={quoteTitle}
                  onChange={e => setQuoteTitle(e.target.value)}
                  placeholder="Ej: TINGLADO 12X25 A 2 AGUAS"
                  className={inputClass}
                />
              </Campo>

              <Campo label="Total">
                <input
                  value={quoteTotal}
                  onChange={e => setQuoteTotal(e.target.value)}
                  inputMode="decimal"
                  placeholder="Ej: 12007400"
                  className={`${inputClass} font-mono`}
                />
              </Campo>
            </>
          )}

          <Campo label={esPresupuesto ? "Detalle" : "Mensaje"}>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={3}
              className={inputClass}
            />
          </Campo>

          <Campo label="Estado">
            <div className="flex flex-wrap gap-2">
              {LEAD_STATUSES.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    status === s ? STATUS_STYLE[s] : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          </Campo>

          <Campo label="Notas">
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Cómo llegó, qué pidió…"
              className={inputClass}
            />
          </Campo>
        </div>

        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

        <div className="mt-6 flex gap-2">
          <Button type="submit" size="lg" disabled={saving || !puedeGuardar}>
            {saving ? "Guardando…" : "Guardar"}
          </Button>
          {!puedeGuardar && (
            <p className="self-center text-xs text-muted-foreground">
              El nombre y el teléfono son obligatorios.
            </p>
          )}
        </div>
      </form>
    </div>
  )
}

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold uppercase text-muted-foreground">{label}</label>
      {children}
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


/* ──────────────────────────────────────────────────────────────── clientes */

/**
 * Una fila por persona en vez de una por consulta.
 *
 * Se agrupa por el teléfono con los dígitos normalizados, así que el mismo
 * cliente que escribió una vez por el formulario, otra por WhatsApp y pidió dos
 * presupuestos aparece una sola vez, con las cuatro cosas contadas.
 */
function ListaClientes({
  clientes,
  sinTelefono,
  onVerRegistros,
}: {
  clientes: Cliente[]
  sinTelefono: number
  onVerRegistros: (phoneKey: string) => void
}) {
  if (clientes.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border py-16 text-center text-muted-foreground">
        Todavía no hay clientes con teléfono cargado.
      </p>
    )
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-semibold">Cliente</th>
              <th className="px-4 py-3 font-semibold">Teléfono</th>
              <th className="px-4 py-3 text-right font-semibold">Registros</th>
              <th className="px-4 py-3 text-right font-semibold">Presupuestos</th>
              <th className="px-4 py-3 text-right font-semibold">Confirmado</th>
              <th className="px-4 py-3 font-semibold">Estado</th>
              <th className="px-4 py-3 font-semibold">Última vez</th>
            </tr>
          </thead>
          <tbody>
            {clientes.map(c => (
              <tr
                key={c.phone_key}
                onClick={() => onVerRegistros(c.phone_key)}
                className="cursor-pointer border-t border-border transition-colors hover:bg-muted/40"
              >
                <td className="px-4 py-3">
                  <span className="font-medium">{c.name || "Sin nombre"}</span>
                  {c.cuit && <span className="block text-xs text-muted-foreground">CUIT {c.cuit}</span>}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  {c.phone ? (
                    <a
                      href={waLink(c.phone)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="text-primary hover:underline"
                    >
                      {c.phone}
                    </a>
                  ) : "—"}
                </td>
                <td className="px-4 py-3 text-right">{c.registros}</td>
                <td className="px-4 py-3 text-right">{c.presupuestos || "—"}</td>
                <td className="px-4 py-3 text-right font-mono text-primary">
                  {c.total_presupuestado ? money.format(Number(c.total_presupuestado)) : "—"}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded border px-2 py-0.5 text-xs ${STATUS_STYLE[c.estado]}`}>
                    {STATUS_LABEL[c.estado]}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                  {formatDate(c.ultima_actividad)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Pinchá un cliente para ver todos sus registros.
        {sinTelefono > 0 && ` · ${sinTelefono} registros no se pueden agrupar porque no dejaron teléfono.`}
      </p>
    </>
  )
}
