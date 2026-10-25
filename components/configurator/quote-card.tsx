"use client"

import { useState } from "react"
import { Columns3, FileText, Layers, MessageCircle, SquareStack, Triangle, AlignJustify } from "lucide-react"
import {
  buildWhatsAppMessage,
  computeMateriales,
  SHEET_LABEL,
  TYPE_LABEL,
  type ShedConfig,
} from "@/lib/shed-config"
import { reportarSolicitudPresupuesto } from "@/lib/google-ads"
import { problemaDeContacto } from "@/lib/crm/contacto"
import { CampoEmail, CampoTelefono } from "@/components/site/campos-contacto"

export function QuoteCard({ config }: { config: ShedConfig }) {
  const c = computeMateriales(config)
  const [showModal, setShowModal] = useState(false)
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [intentado, setIntentado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const rows = [
    { icon: Columns3, label: config.type.includes("varillas") ? "Columnas reticuladas (Varilla)" : "Columnas reticuladas", value: `${c.columnas} u.` },
    { icon: Triangle, label: config.type.includes("varillas") ? "Cabreadas reticuladas (Varilla)" : "Cabreadas principales", value: `${c.cabreadas} u.` },
    { icon: AlignJustify, label: "Líneas de correas (Perfil C)", value: `${c.correas} u.` },
    { icon: SquareStack, label: "Superficie de techo", value: `${c.superficieTecho} m²` },
    { icon: Layers, label: "Superficie de planta", value: `${c.superficiePlanta} m²` },
  ]

  const handleOpenWhatsApp = () => {
    setShowModal(true)
  }

  const handleSubmit = async () => {
    setIntentado(true)
    const problema = problemaDeContacto({ name, phone, email, exigirEmail: true })
    if (problema) {
      setError(problema)
      return
    }

    setEnviando(true)
    setError(null)
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "presupuesto",
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          quoteTitle: `Tinglado ${config.width}x${config.length}`,
          quoteConfig: config,
          sourcePath: window.location.pathname,
        }),
      })
      // Sólo frena lo que el servidor rechaza a propósito (datos o límite); si
      // la base se cae, que el cliente llegue igual a WhatsApp.
      if (res.status === 400) {
        const { message } = await res.json().catch(() => ({ message: null }))
        setError(message || "Revisá tus datos.")
        return
      }
      if (res.status === 429) {
        const { message } = await res.json().catch(() => ({ message: null }))
        setError(message || "Ya recibimos tu pedido.")
        return
      }
    } catch {
    } finally {
      setEnviando(false)
    }
    reportarSolicitudPresupuesto()

    const message = buildWhatsAppMessage(config, { name, phone, email })
    window.open(`https://wa.me/5493743487728?text=${encodeURIComponent(message)}`, "_blank")
    setShowModal(false)
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#F97316]">
            Cómputo de materiales
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">Estimación en tiempo real</p>
        </div>

        <div className="rounded-md border border-border bg-secondary/30">
          {rows.map((r, i) => (
            <div
              key={r.label}
              className={`flex items-center justify-between gap-3 px-4 py-3 ${
                i < rows.length - 1 ? "border-b border-border/60" : ""
              }`}
            >
              <span className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <r.icon className="size-4 text-[#F97316]" />
                {r.label}
              </span>
              <span className="font-mono text-sm font-600 text-foreground">{r.value}</span>
            </div>
          ))}
        </div>

        <div className="rounded-md border border-border bg-background/40 px-4 py-3">
          <p className="font-mono text-[11px] uppercase leading-relaxed tracking-wide text-muted-foreground">
            {config.width}m × {config.length}m × {config.height}m ·{" "}
            <span className="text-foreground">{TYPE_LABEL[config.type]}</span> ·{" "}
            {SHEET_LABEL[config.sheet]}
          </p>
        </div>

        <button
          onClick={handleOpenWhatsApp}
          className="flex items-center justify-center gap-2 rounded-md bg-[#F97316] hover:bg-[#EA580C] text-white px-5 py-4 font-display text-sm font-600 uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-100"
        >
          <MessageCircle className="size-5" />
          Solicitar Presupuesto por WhatsApp
        </button>
        <p className="text-center text-[11px] text-muted-foreground">
          Te respondemos con un presupuesto detallado sin cargo.
        </p>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md overflow-hidden rounded-xl border border-border/50 bg-card shadow-2xl p-6">
            <h3 className="font-display text-lg font-semibold uppercase tracking-wide text-foreground mb-4">
              Completá tus datos
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase text-foreground/80">Nombre completo</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm mt-1" 
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-foreground/80">Teléfono (WhatsApp)</label>
                <CampoTelefono
                  value={phone}
                  onChange={setPhone}
                  mostrarErrores={intentado}
                  className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-foreground/80">Correo electrónico</label>
                <CampoEmail
                  value={email}
                  onChange={setEmail}
                  mostrarErrores={intentado}
                  className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm mt-1"
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div className="flex gap-3 justify-end mt-6">
                <button 
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-md text-sm font-semibold border border-border"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSubmit}
                  disabled={enviando}
                  className="px-4 py-2 rounded-md text-sm font-semibold bg-[#F97316] text-white flex gap-2 items-center disabled:opacity-60"
                >
                  <MessageCircle className="size-4" />
                  Enviar y abrir WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
