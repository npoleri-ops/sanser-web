"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Camera, Check, Clock, Trash2 } from "lucide-react"
import { COBRE, PAGUE, pideObra, type Concepto } from "@/lib/finanzas/conceptos"
import { NACE_PENDIENTE, type Movimiento } from "@/lib/finanzas/types"

/**
 * La pantalla con la que se carga desde el galpón, con el teléfono en la mano y
 * la factura en la otra.
 *
 * Está ordenada como se piensa, no como se contabiliza: primero si entró o
 * salió plata, después cuánto, después qué era. El tipo contable no se pregunta
 * nunca —lo decide el concepto elegido— y palabras como «imputar», «movimiento»
 * o «margen» no aparecen en ningún lado.
 */

const money = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
})

function hoyISO() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" })
}

interface Props {
  obras: { id: string; etiqueta: string }[]
  ultimos: Movimiento[]
  onGuardado: () => Promise<void>
}

export function Cargar({ obras, ultimos, onGuardado }: Props) {
  const [signo, setSigno] = useState<"pague" | "cobre" | null>(null)
  const [monto, setMonto] = useState("")
  const [concepto, setConcepto] = useState<Concepto | null>(null)
  const [obra, setObra] = useState("")
  const [detalle, setDetalle] = useState("")
  const [fecha, setFecha] = useState(hoyISO())
  const [otroDia, setOtroDia] = useState(false)
  const [foto, setFoto] = useState<File | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [listo, setListo] = useState<string | null>(null)
  // Cómo se pagó. Con tarjeta se compra hoy y se paga con el resumen, así que
  // por defecto queda pendiente; se puede decir que ya se pagó.
  const [medio, setMedio] = useState("")
  const [cuotas, setCuotas] = useState(1)
  const [tarjetaPagada, setTarjetaPagada] = useState(false)
  const camara = useRef<HTMLInputElement>(null)

  const grupos = signo === "cobre" ? COBRE : PAGUE
  const necesitaObra = concepto ? pideObra(concepto) : false
  const puedeGuardar = Boolean(concepto) && Number(monto) > 0 && !guardando

  function limpiar() {
    setSigno(null); setMonto(""); setConcepto(null); setObra("")
    setDetalle(""); setFoto(null); setFecha(hoyISO()); setOtroDia(false); setError(null)
    setMedio(""); setCuotas(1); setTarjetaPagada(false)
  }

  async function guardar() {
    if (!concepto) return
    setError(null)
    setGuardando(true)
    try {
      const res = await fetch("/api/admin/finanzas/movimientos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fecha,
          tipo: concepto.tipo,
          // El detalle escrito a mano manda sobre la etiqueta del botón: si Santi
          // aclara «chapa C25 x 12», eso es más útil que «Chapa» a secas.
          concepto: detalle.trim() || concepto.concepto,
          categoria: concepto.categoria,
          monto: Number(monto),
          leadId: necesitaObra && obra ? obra : null,
          medio_pago: signo === "pague" ? medio || null : null,
          cuotas: medio === "Tarjeta" ? cuotas : null,
          pagado: signo === "pague" && NACE_PENDIENTE(medio) ? tarjetaPagada : true,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data.error ?? "No se pudo guardar"); return }

      if (foto) {
        const fd = new FormData()
        fd.set("movimientoId", data.movimiento.id)
        fd.set("file", foto)
        const up = await fetch("/api/admin/finanzas/comprobantes", { method: "POST", body: fd })
        // Lo cargado ya está guardado: si falla la foto se avisa, pero no se
        // pierde el trabajo ni se deja el movimiento a medias.
        if (!up.ok) setError("Se guardó, pero la foto no se pudo subir. Adjuntala después.")
      }

      const pendiente = signo === "pague" && NACE_PENDIENTE(medio) && !tarjetaPagada
      setListo(`${signo === "cobre" ? "Cobro" : "Gasto"} de ${money.format(Number(monto))} guardado${pendiente ? ", pendiente de pagar con el resumen" : ""}.`)
      limpiar()
      await onGuardado()
      setTimeout(() => setListo(null), 4000)
    } finally {
      setGuardando(false)
    }
  }

  /* ── paso 1: entró o salió ───────────────────────────────────────────── */
  if (!signo) {
    return (
      <div className="space-y-6">
        {listo && <Aviso texto={listo} />}
        <div>
          <h2 className="text-center text-lg font-semibold">¿Qué pasó con la plata?</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <BotonGrande
              onClick={() => setSigno("pague")}
              className="border-destructive/40 bg-destructive/10 hover:bg-destructive/20"
            >
              <span className="text-3xl">−</span>
              <span>Pagué algo</span>
              <span className="text-sm font-normal opacity-70">Material, sueldos, combustible…</span>
            </BotonGrande>
            <BotonGrande
              onClick={() => setSigno("cobre")}
              className="border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20"
            >
              <span className="text-3xl">+</span>
              <span>Cobré algo</span>
              <span className="text-sm font-normal opacity-70">Seña, pago de obra, venta…</span>
            </BotonGrande>
          </div>
        </div>

        <Ultimos ultimos={ultimos} onCambio={onGuardado} />
      </div>
    )
  }

  /* ── paso 2: cuánto y qué ────────────────────────────────────────────── */
  return (
    <div className="space-y-6 pb-28">
      <button
        onClick={limpiar}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Volver
      </button>

      <div>
        <label className="block text-center text-lg font-semibold">
          ¿Cuánto {signo === "cobre" ? "cobraste" : "pagaste"}?
        </label>
        <div className="mt-2 flex items-center justify-center gap-2">
          <span className="text-3xl text-muted-foreground">$</span>
          <input
            autoFocus
            type="number"
            inputMode="decimal"
            min="0"
            step="1"
            value={monto}
            onChange={e => setMonto(e.target.value)}
            placeholder="0"
            className="w-full max-w-xs rounded-xl border-2 border-border bg-background px-4 py-3 text-center text-3xl font-bold outline-none focus:border-primary"
          />
        </div>
      </div>

      <div>
        <p className="mb-2 text-lg font-semibold">¿Qué fue?</p>
        <div className="space-y-4">
          {grupos.map(g => (
            <div key={g.titulo}>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g.titulo}</p>
              <p className="mb-2 text-xs text-muted-foreground/70">{g.ayuda}</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {g.conceptos.map(c => {
                  const elegido = concepto?.concepto === c.concepto
                  return (
                    <button
                      key={c.concepto}
                      onClick={() => { setConcepto(c); if (!pideObra(c)) setObra("") }}
                      className={`min-h-14 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                        elegido
                          ? "border-primary bg-primary/15 text-foreground"
                          : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                      }`}
                    >
                      {elegido && <Check className="mr-1 inline size-4 text-primary" />}
                      {c.etiqueta}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {necesitaObra && (
        <div>
          <p className="mb-2 text-lg font-semibold">¿De qué obra?</p>
          {obras.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Todavía no hay presupuestos cargados. Se puede guardar igual y asignarlo después.
            </p>
          ) : (
            <select
              value={obra}
              onChange={e => setObra(e.target.value)}
              className="min-h-14 w-full rounded-xl border border-border bg-background px-3 text-base outline-none focus:border-primary"
            >
              <option value="">Todavía no sé / no es de una obra</option>
              {obras.map(o => <option key={o.id} value={o.id}>{o.etiqueta}</option>)}
            </select>
          )}
        </div>
      )}

      {signo === "pague" && (
        <div>
          <p className="mb-2 text-lg font-semibold">¿Cómo pagaste?</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {["Efectivo", "Transferencia", "Tarjeta", "Mercado Pago"].map(mp => (
              <button
                key={mp}
                onClick={() => setMedio(medio === mp ? "" : mp)}
                className={`min-h-12 rounded-xl border px-3 text-sm font-medium transition-colors ${
                  medio === mp
                    ? "border-primary bg-primary/15 text-foreground"
                    : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                }`}
              >
                {medio === mp && <Check className="mr-1 inline size-4 text-primary" />}
                {mp}
              </button>
            ))}
          </div>
          {medio === "Tarjeta" && (
            <div className="mt-3 space-y-3 rounded-xl border border-border p-3">
              <label className="flex items-center justify-between gap-3 text-base">
                <span>¿En cuántas cuotas?</span>
                <select
                  value={cuotas}
                  onChange={e => setCuotas(Number(e.target.value))}
                  className="min-h-12 rounded-xl border border-border bg-background px-3 text-base outline-none focus:border-primary"
                >
                  {[1, 2, 3, 6, 9, 12, 18].map(n => <option key={n} value={n}>{n === 1 ? "Un pago" : `${n} cuotas`}</option>)}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setTarjetaPagada(false)}
                  className={`min-h-12 rounded-xl border px-3 text-sm ${!tarjetaPagada ? "border-amber-500/60 bg-amber-500/10 text-amber-200" : "border-border text-muted-foreground"}`}
                >
                  <Clock className="mr-1 inline size-4" /> Lo pago con el resumen
                </button>
                <button
                  onClick={() => setTarjetaPagada(true)}
                  className={`min-h-12 rounded-xl border px-3 text-sm ${tarjetaPagada ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300" : "border-border text-muted-foreground"}`}
                >
                  <Check className="mr-1 inline size-4" /> Ya está pagado
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div>
        <p className="mb-2 text-lg font-semibold">Foto de la factura</p>
        <input
          ref={camara}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
          // En el teléfono abre la cámara directamente en vez del explorador de
          // archivos, que es lo que hace falta con la factura en la mano.
          capture="environment"
          className="hidden"
          onChange={e => setFoto(e.target.files?.[0] ?? null)}
        />
        <button
          onClick={() => camara.current?.click()}
          className={`flex min-h-14 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 text-base ${
            foto ? "border-emerald-500/50 text-emerald-400" : "border-border text-muted-foreground hover:border-primary/50"
          }`}
        >
          {foto ? <><Check className="size-5" /> {foto.name.slice(0, 28)}</> : <><Camera className="size-5" /> Sacar foto</>}
        </button>
        {foto && (
          <button onClick={() => setFoto(null)} className="mt-1 text-xs text-muted-foreground hover:text-foreground">
            Quitar la foto
          </button>
        )}
      </div>

      <details className="rounded-xl border border-border p-3">
        <summary className="cursor-pointer text-sm text-muted-foreground">Agregar detalle o cambiar la fecha</summary>
        <div className="mt-3 space-y-3">
          <input
            value={detalle}
            onChange={e => setDetalle(e.target.value)}
            placeholder="Ej: chapa C25 x 12, proveedor Acindar"
            className="min-h-12 w-full rounded-xl border border-border bg-background px-3 text-base outline-none focus:border-primary"
          />
          {otroDia ? (
            <input
              type="date"
              value={fecha}
              onChange={e => setFecha(e.target.value)}
              className="min-h-12 w-full rounded-xl border border-border bg-background px-3 text-base outline-none focus:border-primary"
            />
          ) : (
            <button onClick={() => setOtroDia(true)} className="text-sm text-primary hover:underline">
              No fue hoy, fue otro día
            </button>
          )}
        </div>
      </details>

      {error && (
        <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* Fijo abajo: en el teléfono el formulario es largo y el botón tiene que
          estar siempre a mano, sin tener que buscarlo. */}
      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-card/95 p-4 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="flex-1 text-sm text-muted-foreground">
            {concepto ? concepto.etiqueta : "Elegí qué fue"}
            {Number(monto) > 0 && <strong className="ml-2 text-foreground">{money.format(Number(monto))}</strong>}
          </div>
          <Button size="lg" className="min-h-12 px-8 text-base" disabled={!puedeGuardar} onClick={() => void guardar()}>
            {guardando ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </div>
    </div>
  )
}

function BotonGrande({ onClick, className, children }: { onClick: () => void; className?: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex min-h-32 flex-col items-center justify-center gap-1 rounded-2xl border-2 text-xl font-bold transition-colors ${className ?? ""}`}
    >
      {children}
    </button>
  )
}

function Aviso({ texto }: { texto: string }) {
  return (
    <p className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-center text-sm text-emerald-300">
      <Check className="mr-1 inline size-4" /> {texto}
    </p>
  )
}

/** Lo último cargado, para confirmar de un vistazo y poder deshacer un error. */
function Ultimos({ ultimos, onCambio }: { ultimos: Movimiento[]; onCambio: () => Promise<void> }) {
  if (ultimos.length === 0) {
    return <p className="text-center text-sm text-muted-foreground">Todavía no cargaste nada.</p>
  }

  async function borrar(m: Movimiento) {
    if (!confirm(`¿Borrar ${m.concepto} de ${money.format(Number(m.monto))}?`)) return
    await fetch(`/api/admin/finanzas/movimientos/${m.id}`, { method: "DELETE" })
    await onCambio()
  }

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Lo último que cargaste</h3>
      <div className="space-y-2">
        {ultimos.slice(0, 8).map(m => {
          const entra = m.tipo === "ingreso"
          return (
            <div key={m.id} className="flex items-center gap-3 rounded-xl border border-border px-3 py-3">
              <span className={`text-xl font-bold ${entra ? "text-emerald-400" : "text-destructive"}`}>
                {entra ? "+" : "−"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{m.concepto}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {m.fecha.split("-").reverse().join("/")}
                  {m.lead_numero && ` · ${m.lead_numero}`}
                  {m.tipo !== "ingreso" && !m.pagado && <span className="text-amber-300"> · falta pagar</span>}
                  {(m.comprobantes?.length ?? 0) > 0 && " · con foto"}
                </p>
              </div>
              <span className={`whitespace-nowrap font-semibold ${entra ? "text-emerald-400" : ""}`}>
                {money.format(Number(m.monto))}
              </span>
              <Button variant="ghost" size="sm" onClick={() => void borrar(m)}><Trash2 /></Button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
