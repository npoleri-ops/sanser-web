"use client"

import { Columns3, Layers, MessageCircle, SquareStack, Triangle, AlignJustify } from "lucide-react"
import {
  buildWhatsAppMessage,
  computeMateriales,
  SHEET_LABEL,
  TYPE_LABEL,
  type ShedConfig,
} from "@/lib/shed-config"
import { openWhatsAppModal } from "@/components/site/whatsapp-modal"

export function QuoteCard({ config }: { config: ShedConfig }) {
  const c = computeMateriales(config)
  const rows = [
    { icon: Columns3, label: "Columnas reticuladas", value: `${c.columnas} u.` },
    { icon: Triangle, label: "Cabreadas principales", value: `${c.cabreadas} u.` },
    { icon: AlignJustify, label: "Líneas de correas (Perfil C)", value: `${c.correas} u.` },
    { icon: SquareStack, label: "Superficie de techo", value: `${c.superficieTecho} m²` },
    { icon: Layers, label: "Superficie de planta", value: `${c.superficiePlanta} m²` },
  ]

  return (
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
        onClick={(e) => openWhatsAppModal(e, buildWhatsAppMessage(config))}
        className="flex items-center justify-center gap-2 rounded-md bg-[#F97316] hover:bg-[#EA580C] text-white px-5 py-4 font-display text-sm font-600 uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-100"
      >
        <MessageCircle className="size-5" />
        Solicitar Presupuesto por WhatsApp
      </button>
      <p className="text-center text-[11px] text-muted-foreground">
        Te respondemos con un presupuesto detallado sin cargo.
      </p>
    </div>
  )
}
