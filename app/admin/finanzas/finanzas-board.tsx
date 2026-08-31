"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Button, buttonVariants } from "@/components/ui/button"
import { Cargar } from "./cargar"
import {
  ArrowLeft,
  Download,
  Filter,
  Paperclip,
  Plus,
  RefreshCw,
  Repeat,
  Search,
  Trash2,
  X,
} from "lucide-react"
import {
  CATEGORIAS_SUGERIDAS,
  MEDIOS_PAGO,
  TIPOS,
  TIPO_LABEL,
  type Comprobante,
  type GastoFijo,
  type Movimiento,
  type Proyeccion,
  type RentabilidadObra,
  type Resumen,
  type SerieMes,
  type Tipo,
} from "@/lib/finanzas/types"

const money = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
})

/** Los porcentajes se muestran sin decimales: aquí nadie decide por un 0,3 %. */
function pct(v: number | null) {
  if (v === null || !Number.isFinite(v)) return "—"
  return `${(v * 100).toFixed(0)} %`
}

function fechaCorta(iso: string) {
  const [a, m, d] = iso.split("-")
  return `${d}/${m}/${a!.slice(2)}`
}

function hoyISO() {
  // En hora de Argentina: con la del servidor (UTC) el movimiento cargado a la
  // noche caería en el día siguiente.
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" })
}

const TIPO_ESTILO: Record<Tipo, string> = {
  ingreso: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  fijo: "bg-sky-500/10 text-sky-400 border-sky-500/30",
  variable: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  produccion: "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/30",
}

interface Props {
  initialMovimientos: Movimiento[]
  initialTotal: number
  initialResumen: Resumen
  initialSerie: SerieMes[]
  initialObrasRent: RentabilidadObra[]
  initialProyeccion: Proyeccion
  initialFijos: GastoFijo[]
  initialObras: { id: string; etiqueta: string }[]
  initialEspacio: { archivos: number; bytes: number }
  perPage: number
}

export function FinanzasBoard(props: Props) {
  const [movimientos, setMovimientos] = useState(props.initialMovimientos)
  const [total, setTotal] = useState(props.initialTotal)
  const [resumen, setResumen] = useState(props.initialResumen)
  const [serie, setSerie] = useState(props.initialSerie)
  const [obrasRent, setObrasRent] = useState(props.initialObrasRent)
  const [proyeccion, setProyeccion] = useState(props.initialProyeccion)
  const [fijos, setFijos] = useState(props.initialFijos)
  const [espacio, setEspacio] = useState(props.initialEspacio)
  const obras = props.initialObras

  const [desde, setDesde] = useState(props.initialResumen.desde)
  const [hasta, setHasta] = useState(props.initialResumen.hasta)
  const [tipo, setTipo] = useState<Tipo | "">("")
  const [search, setSearch] = useState("")
  const [sinComprobante, setSinComprobante] = useState(false)
  const [page, setPage] = useState(1)

  // Arranca en «Cargar» a propósito: lo que se hace veinte veces por semana es
  // anotar una factura desde el galpón, no mirar el tablero.
  const [vista, setVista] = useState<"cargar" | "numeros">("cargar")
  const [loading, setLoading] = useState(false)
  const [creando, setCreando] = useState(false)
  const [verFijos, setVerFijos] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  const cargarMovimientos = useCallback(async () => {
    setLoading(true)
    try {
      const q = new URLSearchParams({ page: String(page), perPage: String(props.perPage), desde, hasta })
      if (tipo) q.set("tipo", tipo)
      if (search) q.set("search", search)
      if (sinComprobante) q.set("sinComprobante", "1")

      const res = await fetch(`/api/admin/finanzas/movimientos?${q}`)
      const data = await res.json()
      if (data.ok) {
        setMovimientos(data.movimientos)
        setTotal(data.total)
      }
    } finally {
      setLoading(false)
    }
  }, [page, props.perPage, desde, hasta, tipo, search, sinComprobante])

  // Recibe el período por parámetro en vez de leerlo del estado: se llama justo
  // después de un setState y con el valor de fuera todavía sería el viejo.
  const cargarResumen = useCallback(async (d: string, h: string) => {
    const res = await fetch(`/api/admin/finanzas/resumen?desde=${d}&hasta=${h}`)
    const data = await res.json()
    if (!data.ok) return
    setResumen(data.resumen)
    setSerie(data.serie)
    setObrasRent(data.obras)
    setProyeccion(data.proyeccion)
    setEspacio(data.espacio)
  }, [])

  const refrescar = useCallback(async () => {
    await Promise.all([cargarMovimientos(), cargarResumen(desde, hasta)])
  }, [cargarMovimientos, cargarResumen, desde, hasta])

  /** Cambiar el período es un acto del usuario, no algo que haya que sincronizar:
   *  por eso recarga aquí y no en un efecto. Los datos iniciales ya vienen del
   *  servidor, así que al montar no hace falta pedir nada. */
  const cambiarPeriodo = useCallback((d: string, h: string) => {
    setDesde(d)
    setHasta(h)
    setPage(1)
    void cargarResumen(d, h)
  }, [cargarResumen])

  // La búsqueda espera a que se deje de escribir; sin esto sale una petición
  // por tecla y la tabla parpadea.
  useEffect(() => {
    const id = setTimeout(() => { void cargarMovimientos() }, 300)
    return () => clearTimeout(id)
  }, [cargarMovimientos])

  function exportarCSV() {
    const filas = [
      ["Fecha", "Tipo", "Concepto", "Categoría", "Monto", "Medio", "Proveedor", "Obra", "Comprobantes", "Notas"],
      ...movimientos.map(m => [
        m.fecha,
        TIPO_LABEL[m.tipo],
        m.concepto,
        m.categoria ?? "",
        m.monto,
        m.medio_pago ?? "",
        m.proveedor ?? "",
        m.lead_numero ?? m.lead_titulo ?? "",
        String(m.comprobantes?.length ?? 0),
        m.notas ?? "",
      ]),
    ]
    const csv = filas
      .map(f => f.map(c => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n")
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }))
    const a = document.createElement("a")
    a.href = url
    a.download = `finanzas-sanser-${desde}_${hasta}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const paginas = Math.max(1, Math.ceil(total / props.perPage))

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <header className="mb-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <h1 className="font-heading text-2xl font-bold uppercase tracking-wide">Plata de SANSER</h1>
          <Link href="/admin" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            <ArrowLeft /> Ir al CRM
          </Link>
        </div>

        {/* Dos pestañas y no un menú: sólo hay dos cosas que hacer aquí, cargar
            y mirar. Grandes, porque se aprietan con el pulgar. */}
        <div className="grid grid-cols-2 gap-2">
          {([["cargar", "Cargar"], ["numeros", "Los números"]] as const).map(([v, etiqueta]) => (
            <button
              key={v}
              onClick={() => setVista(v)}
              className={`min-h-12 rounded-xl border text-base font-semibold transition-colors ${
                vista === v
                  ? "border-primary bg-primary/15 text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {etiqueta}
            </button>
          ))}
        </div>
      </header>

      {aviso && (
        <div className="mb-4 flex items-center justify-between gap-4 rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-sm">
          <span>{aviso}</span>
          <button onClick={() => setAviso(null)} className="text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
        </div>
      )}

      {vista === "cargar" ? (
        <Cargar obras={obras} ultimos={movimientos} onGuardado={refrescar} />
      ) : (
      <>
      <div className="mb-4 flex flex-wrap gap-2">
        <Button size="sm" onClick={() => setCreando(true)}><Plus /> Carga detallada</Button>
        <Button variant="outline" size="sm" onClick={() => setVerFijos(true)}><Repeat /> Gastos de todos los meses</Button>
        <Button variant="outline" size="sm" onClick={() => void refrescar()} disabled={loading}>
          <RefreshCw className={loading ? "animate-spin" : ""} /> Actualizar
        </Button>
        <Button variant="outline" size="sm" onClick={exportarCSV}><Download /> CSV</Button>
      </div>

      <p className="mb-4 text-sm text-muted-foreground">
        {resumen.movimientos} anotaciones entre {fechaCorta(resumen.desde)} y {fechaCorta(resumen.hasta)}
        {resumen.sinComprobante > 0 && ` · ${resumen.sinComprobante} sin foto de comprobante`}
      </p>

      {/* Período: manda sobre todo lo de abajo, así que va primero. */}
      <section className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
        <Campo label="Desde">
          <input type="date" value={desde} onChange={e => cambiarPeriodo(e.target.value, hasta)} className={inputCls} />
        </Campo>
        <Campo label="Hasta">
          <input type="date" value={hasta} onChange={e => cambiarPeriodo(desde, e.target.value)} className={inputCls} />
        </Campo>
        <div className="flex gap-1">
          {atajos().map(a => (
            <Button key={a.label} variant="outline" size="sm"
              onClick={() => cambiarPeriodo(a.desde, a.hasta)}>
              {a.label}
            </Button>
          ))}
        </div>
      </section>

      <Indicadores resumen={resumen} />
      <Proyecciones proyeccion={proyeccion} />
      <Tendencia serie={serie} />
      <Obras obras={obrasRent} />

      {/* ───────────────────────────────────────────────── movimientos */}
      <section className="mt-8">
        <div className="mb-3 flex flex-wrap items-end gap-3">
          <h2 className="mr-auto font-heading text-lg font-bold uppercase tracking-wide">Movimientos</h2>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Concepto, proveedor, categoría…"
              className={`${inputCls} pl-8`}
            />
          </div>
          <select value={tipo} onChange={e => { setTipo(e.target.value as Tipo | ""); setPage(1) }} className={inputCls}>
            <option value="">Todos los tipos</option>
            {TIPOS.map(t => <option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
          </select>
          <Button
            variant={sinComprobante ? "default" : "outline"}
            size="sm"
            onClick={() => { setSinComprobante(v => !v); setPage(1) }}
          >
            <Filter /> Sin comprobante
          </Button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Fecha</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Concepto</th>
                <th className="px-3 py-2">Obra</th>
                <th className="px-3 py-2 text-right">Monto</th>
                <th className="px-3 py-2">Comprobante</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {movimientos.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                  No hay movimientos con esos filtros.
                </td></tr>
              )}
              {movimientos.map(m => (
                <Fila key={m.id} m={m} onCambio={refrescar} onAviso={setAviso} />
              ))}
            </tbody>
          </table>
        </div>

        {paginas > 1 && (
          <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
            <span>{total} movimientos · página {page} de {paginas}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
              <Button variant="outline" size="sm" disabled={page >= paginas} onClick={() => setPage(p => p + 1)}>Siguiente</Button>
            </div>
          </div>
        )}

        <p className="mt-3 text-xs text-muted-foreground">
          Comprobantes guardados: {espacio.archivos} · {(espacio.bytes / 1024 / 1024).toFixed(1)} MB.
          El plan gratuito de la base da 0,5 GB en total, presupuestos incluidos.
        </p>
      </section>

      </>
      )}

      {creando && (
        <ModalMovimiento
          obras={obras}
          onCerrar={() => setCreando(false)}
          onCreado={async msg => { setAviso(msg); await refrescar() }}
        />
      )}
      {verFijos && (
        <ModalFijos
          fijos={fijos}
          onCerrar={() => setVerFijos(false)}
          onCambio={setFijos}
          onGenerado={async msg => { setAviso(msg); await refrescar() }}
        />
      )}
    </main>
  )
}

const inputCls =
  "h-9 rounded-lg border border-border bg-background px-2 text-sm outline-none focus:border-primary"

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

/** Atajos de período: el mes en curso, el anterior y el año. */
function atajos() {
  const hoy = new Date()
  const y = hoy.getFullYear()
  const m = hoy.getMonth()
  const iso = (d: Date) => d.toLocaleDateString("en-CA")
  return [
    { label: "Este mes", desde: iso(new Date(y, m, 1)), hasta: iso(new Date(y, m + 1, 0)) },
    { label: "Mes pasado", desde: iso(new Date(y, m - 1, 1)), hasta: iso(new Date(y, m, 0)) },
    { label: "Año", desde: `${y}-01-01`, hasta: iso(new Date(y, 11, 31)) },
  ]
}

/* ─────────────────────────────────────────────────────────── indicadores */

function Indicadores({ resumen }: { resumen: Resumen }) {
  const positivo = resumen.resultado >= 0
  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Tarjeta titulo="Ingresos" valor={money.format(resumen.ingresos)} tono="text-emerald-400" />
      <Tarjeta
        titulo="Gastos"
        valor={money.format(resumen.gastos)}
        detalle={`Fijos ${money.format(resumen.fijos)} · Variables ${money.format(resumen.variables)} · Producción ${money.format(resumen.produccion)}`}
      />
      <Tarjeta
        titulo="Resultado"
        valor={money.format(resumen.resultado)}
        tono={positivo ? "text-emerald-400" : "text-destructive"}
        detalle={positivo ? "Ganancia del período" : "Pérdida del período"}
      />
      <Tarjeta
        titulo="Rentabilidad"
        valor={pct(resumen.margen)}
        detalle={`Margen sobre lo facturado · Retorno sobre lo gastado ${pct(resumen.retorno)}`}
      />
    </section>
  )
}

function Tarjeta({ titulo, valor, detalle, tono }: { titulo: string; valor: string; detalle?: string; tono?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{titulo}</p>
      <p className={`mt-1 text-2xl font-bold ${tono ?? ""}`}>{valor}</p>
      {detalle && <p className="mt-1 text-xs text-muted-foreground">{detalle}</p>}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────── proyección */

function Proyecciones({ proyeccion: p }: { proyeccion: Proyeccion }) {
  const pocoDato = p.mesesConDatos < 3
  return (
    <section className="mt-6 rounded-xl border border-border bg-card p-4">
      <h2 className="font-heading text-lg font-bold uppercase tracking-wide">Proyección</h2>
      <p className="mb-3 text-xs text-muted-foreground">
        Calculada sobre {p.mesesConDatos} {p.mesesConDatos === 1 ? "mes cerrado" : "meses cerrados"}.
        El mes en curso no entra: está a medias y tiraría la media hacia abajo.
      </p>

      {pocoDato && (
        <p className="mb-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          Con menos de tres meses cargados esto es una cuenta, no una previsión. Cargá el histórico
          y las cifras empiezan a significar algo.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Dato titulo="Gastos fijos al mes" valor={money.format(p.fijoMensual)} />
        <Dato titulo="Margen bruto" valor={pct(p.margenBruto)}
          nota="Lo que deja la actividad antes de los fijos" />
        <Dato
          titulo="Hay que facturar"
          valor={p.puntoEquilibrio === null ? "—" : money.format(p.puntoEquilibrio)}
          nota="Por mes, para no perder plata"
        />
        <Dato
          titulo="Esperado de lo abierto"
          valor={p.esperado === null ? "—" : money.format(p.esperado)}
          nota={`${money.format(p.pipeline)} presupuestado × ${pct(p.tasaCierre)} de cierre`}
        />
      </div>
    </section>
  )
}

function Dato({ titulo, valor, nota }: { titulo: string; valor: string; nota?: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/40 p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{titulo}</p>
      <p className="mt-1 text-xl font-bold">{valor}</p>
      {nota && <p className="mt-1 text-xs text-muted-foreground">{nota}</p>}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────── tendencia */

function Tendencia({ serie }: { serie: SerieMes[] }) {
  if (serie.length === 0) return null
  // Escala común para ingresos y gastos: con dos escalas distintas, un mes malo
  // parecería bueno.
  const tope = Math.max(...serie.map(s => Math.max(s.ingresos, s.fijos + s.variables + s.produccion)), 1)

  return (
    <section className="mt-6 rounded-xl border border-border bg-card p-4">
      <h2 className="mb-3 font-heading text-lg font-bold uppercase tracking-wide">Mes a mes</h2>
      <div className="space-y-2">
        {serie.map(s => {
          const gastos = s.fijos + s.variables + s.produccion
          return (
            <div key={s.periodo} className="grid grid-cols-[4rem_1fr_7rem] items-center gap-3 text-xs">
              <span className="text-muted-foreground">{s.periodo}</span>
              <div className="space-y-1">
                <div className="h-2 rounded bg-emerald-500" style={{ width: `${(s.ingresos / tope) * 100}%` }} title={`Ingresos ${money.format(s.ingresos)}`} />
                <div className="h-2 rounded bg-destructive/80" style={{ width: `${(gastos / tope) * 100}%` }} title={`Gastos ${money.format(gastos)}`} />
              </div>
              <span className={`text-right font-semibold ${s.resultado >= 0 ? "text-emerald-400" : "text-destructive"}`}>
                {money.format(s.resultado)}
              </span>
            </div>
          )
        })}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Barra verde: ingresos. Barra roja: todos los gastos. La cifra de la derecha es el resultado.
      </p>
    </section>
  )
}

/* ─────────────────────────────────────────────────────── obras */

function Obras({ obras }: { obras: RentabilidadObra[] }) {
  if (obras.length === 0) return null
  return (
    <section className="mt-6 rounded-xl border border-border bg-card p-4">
      <h2 className="font-heading text-lg font-bold uppercase tracking-wide">Rentabilidad por obra</h2>
      <p className="mb-3 text-xs text-muted-foreground">
        Sólo las obras con algo imputado. El ROI es sobre lo que costó hacerla: por cada peso de
        material y mano de obra, cuánto volvió.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="py-2 pr-3">Obra</th>
              <th className="py-2 pr-3 text-right">Presupuestado</th>
              <th className="py-2 pr-3 text-right">Cobrado</th>
              <th className="py-2 pr-3 text-right">Costo</th>
              <th className="py-2 pr-3 text-right">Resultado</th>
              <th className="py-2 text-right">ROI</th>
            </tr>
          </thead>
          <tbody>
            {obras.map(o => (
              <tr key={o.lead_id} className="border-t border-border/60">
                <td className="py-2 pr-3">
                  <span className="font-medium">{o.quote_number ?? "s/n"}</span>{" "}
                  <span className="text-muted-foreground">{o.quote_title ?? "Sin título"}</span>
                  {o.cliente && <span className="block text-xs text-muted-foreground">{o.cliente}</span>}
                </td>
                <td className="py-2 pr-3 text-right text-muted-foreground">
                  {o.presupuestado === null ? "—" : money.format(o.presupuestado)}
                </td>
                <td className="py-2 pr-3 text-right">{money.format(o.cobrado)}</td>
                <td className="py-2 pr-3 text-right">{money.format(o.costo)}</td>
                <td className={`py-2 pr-3 text-right font-semibold ${o.resultado >= 0 ? "text-emerald-400" : "text-destructive"}`}>
                  {money.format(o.resultado)}
                </td>
                <td className="py-2 text-right">{pct(o.roi)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────── fila y adjuntos */

function Fila({ m, onCambio, onAviso }: { m: Movimiento; onCambio: () => Promise<void>; onAviso: (s: string) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [subiendo, setSubiendo] = useState(false)

  async function subir(file: File) {
    setSubiendo(true)
    try {
      const fd = new FormData()
      fd.set("movimientoId", m.id)
      fd.set("file", file)
      const res = await fetch("/api/admin/finanzas/comprobantes", { method: "POST", body: fd })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) onAviso(data.error ?? "No se pudo subir el comprobante")
      else await onCambio()
    } finally {
      setSubiendo(false)
      if (input.current) input.current.value = ""
    }
  }

  async function borrar() {
    if (!confirm(`¿Borrar «${m.concepto}» de ${money.format(Number(m.monto))}?`)) return
    const res = await fetch(`/api/admin/finanzas/movimientos/${m.id}`, { method: "DELETE" })
    if (res.ok) await onCambio()
    else onAviso("No se pudo borrar")
  }

  return (
    <tr className="border-t border-border/60 hover:bg-muted/20">
      <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{fechaCorta(m.fecha)}</td>
      <td className="px-3 py-2">
        <span className={`rounded border px-1.5 py-0.5 text-xs ${TIPO_ESTILO[m.tipo]}`}>{TIPO_LABEL[m.tipo]}</span>
      </td>
      <td className="px-3 py-2">
        <span className="font-medium">{m.concepto}</span>
        {(m.categoria || m.proveedor) && (
          <span className="block text-xs text-muted-foreground">
            {[m.categoria, m.proveedor, m.medio_pago].filter(Boolean).join(" · ")}
          </span>
        )}
      </td>
      <td className="px-3 py-2 text-xs text-muted-foreground">
        {m.lead_numero ?? m.lead_titulo ?? "—"}
      </td>
      <td className={`whitespace-nowrap px-3 py-2 text-right font-semibold ${m.tipo === "ingreso" ? "text-emerald-400" : ""}`}>
        {m.tipo === "ingreso" ? "" : "−"}{money.format(Number(m.monto))}
      </td>
      <td className="px-3 py-2">
        <div className="flex flex-wrap items-center gap-1">
          {(m.comprobantes ?? []).map((c: Comprobante) => (
            <a
              key={c.id}
              href={`/api/admin/finanzas/comprobante/${c.token}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded border border-border px-1.5 py-0.5 text-xs text-primary hover:underline"
              title={`${c.filename} · ${(c.size_bytes / 1024).toFixed(0)} KB`}
            >
              Ver
            </a>
          ))}
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) void subir(f) }}
          />
          <Button variant="ghost" size="xs" onClick={() => input.current?.click()} disabled={subiendo}>
            <Paperclip /> {subiendo ? "Subiendo…" : "Adjuntar"}
          </Button>
        </div>
      </td>
      <td className="px-3 py-2 text-right">
        <Button variant="ghost" size="xs" onClick={() => void borrar()}><Trash2 /></Button>
      </td>
    </tr>
  )
}

/* ─────────────────────────────────────────────────────── alta */

function ModalMovimiento({
  obras,
  onCerrar,
  onCreado,
}: {
  obras: { id: string; etiqueta: string }[]
  onCerrar: () => void
  onCreado: (msg: string) => Promise<void>
}) {
  const [tipo, setTipo] = useState<Tipo>("produccion")
  const [fecha, setFecha] = useState(hoyISO())
  const [concepto, setConcepto] = useState("")
  const [categoria, setCategoria] = useState("")
  const [monto, setMonto] = useState("")
  const [medio, setMedio] = useState("")
  const [proveedor, setProveedor] = useState("")
  const [leadId, setLeadId] = useState("")
  const [notas, setNotas] = useState("")
  const [archivo, setArchivo] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  // Sólo la producción y los ingresos se imputan a una obra: un alquiler
  // imputado a un tinglado le arruinaría la rentabilidad.
  const imputable = tipo === "produccion" || tipo === "ingreso"

  async function guardar() {
    setError(null)
    setGuardando(true)
    try {
      const res = await fetch("/api/admin/finanzas/movimientos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fecha, tipo, concepto, categoria, monto: Number(monto),
          medio_pago: medio, proveedor, notas,
          leadId: imputable && leadId ? leadId : null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data.error ?? "No se pudo guardar"); return }

      let msg = "Movimiento cargado."
      if (archivo) {
        const fd = new FormData()
        fd.set("movimientoId", data.movimiento.id)
        fd.set("file", archivo)
        const up = await fetch("/api/admin/finanzas/comprobantes", { method: "POST", body: fd })
        // El movimiento ya está guardado: si falla el adjunto se avisa, pero no
        // se pierde la carga ni se deja a medias.
        msg += up.ok ? " Comprobante adjuntado." : " El comprobante no se pudo subir; adjuntalo desde la tabla."
      }
      await onCreado(msg)
      onCerrar()
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Overlay onCerrar={onCerrar} titulo="Nuevo movimiento">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {TIPOS.map(t => (
            <button
              key={t}
              onClick={() => setTipo(t)}
              className={`rounded-lg border px-3 py-2 text-sm ${t === tipo ? TIPO_ESTILO[t] : "border-border text-muted-foreground hover:text-foreground"}`}
            >
              {TIPO_LABEL[t]}
            </button>
          ))}
        </div>

        <Campo label="Fecha del gasto o cobro">
          <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className={inputCls} />
        </Campo>
        <Campo label="Concepto">
          <input value={concepto} onChange={e => setConcepto(e.target.value)} placeholder="Chapa C25, sueldo agosto…" className={inputCls} />
        </Campo>
        <Campo label="Monto">
          <input type="number" inputMode="decimal" min="0" step="0.01" value={monto} onChange={e => setMonto(e.target.value)} className={inputCls} />
        </Campo>
        <Campo label="Categoría">
          <>
            <input list="cats" value={categoria} onChange={e => setCategoria(e.target.value)} className={inputCls} />
            <datalist id="cats">
              {CATEGORIAS_SUGERIDAS[tipo].map(c => <option key={c} value={c} />)}
            </datalist>
          </>
        </Campo>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo label="Medio de pago">
            <select value={medio} onChange={e => setMedio(e.target.value)} className={inputCls}>
              <option value="">—</option>
              {MEDIOS_PAGO.map(mp => <option key={mp} value={mp}>{mp}</option>)}
            </select>
          </Campo>
          <Campo label="Proveedor o cliente">
            <input value={proveedor} onChange={e => setProveedor(e.target.value)} className={inputCls} />
          </Campo>
        </div>

        {imputable && (
          <Campo label="Obra a la que se imputa">
            <select value={leadId} onChange={e => setLeadId(e.target.value)} className={inputCls}>
              <option value="">Sin imputar</option>
              {obras.map(o => <option key={o.id} value={o.id}>{o.etiqueta}</option>)}
            </select>
          </Campo>
        )}

        <Campo label="Notas">
          <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2}
            className="rounded-lg border border-border bg-background p-2 text-sm outline-none focus:border-primary" />
        </Campo>

        <Campo label="Comprobante (opcional)">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
            onChange={e => setArchivo(e.target.files?.[0] ?? null)}
            className="text-sm file:mr-2 file:rounded file:border-0 file:bg-muted file:px-2 file:py-1 file:text-sm"
          />
        </Campo>

        {error && <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onCerrar}>Cancelar</Button>
          <Button onClick={() => void guardar()} disabled={guardando || !concepto.trim() || !Number(monto)}>
            {guardando ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </div>
    </Overlay>
  )
}

/* ─────────────────────────────────────────────────────── gastos fijos */

function ModalFijos({
  fijos,
  onCerrar,
  onCambio,
  onGenerado,
}: {
  fijos: GastoFijo[]
  onCerrar: () => void
  onCambio: (f: GastoFijo[]) => void
  onGenerado: (msg: string) => Promise<void>
}) {
  const [concepto, setConcepto] = useState("")
  const [monto, setMonto] = useState("")
  const [dia, setDia] = useState("")
  const [periodo, setPeriodo] = useState(hoyISO().slice(0, 7))
  const [ocupado, setOcupado] = useState(false)

  const totalMes = fijos.filter(f => f.activo).reduce((s, f) => s + Number(f.monto), 0)

  async function agregar() {
    setOcupado(true)
    try {
      const res = await fetch("/api/admin/finanzas/fijos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ concepto, monto: Number(monto), dia_pago: Number(dia) || null }),
      })
      const data = await res.json()
      if (data.ok) {
        onCambio([...fijos, data.fijo])
        setConcepto(""); setMonto(""); setDia("")
      }
    } finally { setOcupado(false) }
  }

  async function alternar(f: GastoFijo) {
    const res = await fetch(`/api/admin/finanzas/fijos/${f.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !f.activo }),
    })
    const data = await res.json()
    if (data.ok) onCambio(fijos.map(x => (x.id === f.id ? data.fijo : x)))
  }

  async function generar() {
    setOcupado(true)
    try {
      const res = await fetch("/api/admin/finanzas/fijos/generar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodo }),
      })
      const data = await res.json()
      if (data.ok) {
        await onGenerado(
          data.creados === 0
            ? `El mes ${periodo} ya estaba generado; no se duplicó nada.`
            : `${data.creados} gastos fijos cargados en ${periodo}.`,
        )
        onCerrar()
      }
    } finally { setOcupado(false) }
  }

  return (
    <Overlay onCerrar={onCerrar} titulo="Gastos fijos">
      <p className="mb-3 text-xs text-muted-foreground">
        Esta es la lista de lo que se paga todos los meses, para no tipearla cada vez. Los
        movimientos reales se crean al generar el mes: el libro dice lo que se pagó, no lo que
        tendría que pagarse.
      </p>

      <div className="mb-4 space-y-1">
        {fijos.length === 0 && <p className="text-sm text-muted-foreground">Todavía no hay ninguno.</p>}
        {fijos.map(f => (
          <div key={f.id} className={`flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm ${f.activo ? "" : "opacity-50"}`}>
            <span className="flex-1">
              {f.concepto}
              {f.dia_pago && <span className="text-xs text-muted-foreground"> · día {f.dia_pago}</span>}
            </span>
            <span className="font-semibold">{money.format(Number(f.monto))}</span>
            <Button variant="ghost" size="xs" onClick={() => void alternar(f)}>
              {f.activo ? "Dar de baja" : "Reactivar"}
            </Button>
          </div>
        ))}
        {fijos.some(f => f.activo) && (
          <p className="pt-1 text-right text-sm">
            Total mensual: <strong>{money.format(totalMes)}</strong>
          </p>
        )}
      </div>

      <div className="grid grid-cols-[1fr_7rem_5rem_auto] items-end gap-2">
        <Campo label="Concepto"><input value={concepto} onChange={e => setConcepto(e.target.value)} className={inputCls} /></Campo>
        <Campo label="Monto"><input type="number" min="0" value={monto} onChange={e => setMonto(e.target.value)} className={inputCls} /></Campo>
        <Campo label="Día"><input type="number" min="1" max="31" value={dia} onChange={e => setDia(e.target.value)} className={inputCls} /></Campo>
        <Button onClick={() => void agregar()} disabled={ocupado || !concepto.trim() || !Number(monto)}><Plus /></Button>
      </div>

      <div className="mt-6 flex items-end justify-between gap-2 border-t border-border pt-4">
        <Campo label="Generar el mes">
          <input type="month" value={periodo} onChange={e => setPeriodo(e.target.value)} className={inputCls} />
        </Campo>
        <Button onClick={() => void generar()} disabled={ocupado || totalMes === 0}>
          <Repeat /> Cargar {money.format(totalMes)}
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Se puede apretar dos veces sin miedo: lo ya generado no se duplica.
      </p>
    </Overlay>
  )
}

function Overlay({ titulo, onCerrar, children }: { titulo: string; onCerrar: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm" onClick={onCerrar}>
      <aside
        onClick={e => e.stopPropagation()}
        className="h-full w-full max-w-md overflow-y-auto border-l border-border bg-card p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">{titulo}</h2>
          <Button variant="ghost" size="sm" onClick={onCerrar}>Cerrar</Button>
        </div>
        {children}
      </aside>
    </div>
  )
}
