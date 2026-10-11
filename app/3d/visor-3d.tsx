"use client"

import dynamic from "next/dynamic"
import { useState, useCallback } from "react"
import { Share2, CheckCircle2 } from "lucide-react"
import type { ShedConfig } from "@/lib/shed-config"
import { TYPE_LABEL } from "@/lib/shed-config"
import type { ThreeSceneRef } from "@/components/three/config-scene"

const ConfigScene = dynamic(
  () =>
    import("@/components/three/config-scene").then((m) => ({
      default: m.ConfigScene,
    })),
  { ssr: false }
)

export function Visor3D({ config }: { config: ShedConfig }) {
  const [sceneReady, setSceneReady] = useState(false)
  const [copied, setCopied] = useState(false)

  const onReady = useCallback((_ref: ThreeSceneRef) => {
    setSceneReady(true)
  }, [])

  const compartirEnlace = async () => {
    const url = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Visor 3D — Tinglado ${config.width}×${config.length} m`,
          text: `¡Mirá el tinglado en 3D! ${config.width}m × ${config.length}m × ${config.height}m — ${TYPE_LABEL[config.type]}`,
          url,
        })
      } else {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 3000)
      }
    } catch {
      // usuario canceló el share o el clipboard no está disponible
    }
  }

  const label = TYPE_LABEL[config.type] ?? "Tinglado"
  const dims = `${config.width} × ${config.length} × ${config.height} m`

  return (
    <div className="fixed inset-0 bg-[#12141a] flex flex-col overflow-hidden">
      {/* Barra superior compacta */}
      <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-2 bg-[#0d0f14]/90 backdrop-blur-md border-b border-white/10 z-20">
        {/* Identidad */}
        <div className="flex items-center gap-2 min-w-0">
          {/* Icono SANSER naranja simplificado */}
          <svg
            width="24"
            height="14"
            viewBox="0 0 100 50"
            fill="none"
            stroke="#f97316"
            strokeWidth="7"
            strokeLinecap="round"
            className="shrink-0"
            aria-hidden="true"
          >
            <polyline points="10,38 35,10 90,30" />
            <line x1="10" y1="38" x2="10" y2="48" />
            <line x1="35" y1="10" x2="35" y2="48" />
            <line x1="62" y1="20" x2="62" y2="48" />
            <line x1="90" y1="30" x2="90" y2="48" />
          </svg>
          <div className="min-w-0">
            <p className="text-white text-xs font-bold leading-tight truncate">
              SANSER Metalúrgica
            </p>
            <p className="text-white/50 text-[10px] leading-tight truncate">
              {label} — {dims}
            </p>
          </div>
        </div>

        {/* Botón de compartir */}
        <button
          onClick={compartirEnlace}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f97316] hover:bg-[#ea6a0a] active:scale-95 transition-all text-white text-xs font-semibold shadow-lg"
          aria-label="Compartir visor 3D"
        >
          {copied ? (
            <CheckCircle2 className="size-3.5" />
          ) : (
            <Share2 className="size-3.5" />
          )}
          <span className="hidden xs:inline">
            {copied ? "¡Copiado!" : "Compartir"}
          </span>
        </button>
      </div>

      {/* Canvas 3D — ocupa el resto de la pantalla */}
      <div className="flex-1 relative">
        {!sceneReady && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#12141a] z-10 gap-3">
            <div className="size-10 rounded-full border-2 border-[#f97316] border-t-transparent animate-spin" />
            <p className="text-white/50 text-sm">Cargando visor 3D…</p>
          </div>
        )}
        <ConfigScene config={config} onReady={onReady} />
      </div>

      {/* Pie de página */}
      <div className="shrink-0 px-4 py-2 bg-[#0d0f14]/90 backdrop-blur-md border-t border-white/10 z-20 text-center">
        <p className="text-white/40 text-[10px]">
          Tocá y arrastrá para rotar · Pellizca para hacer zoom ·{" "}
          <a
            href="/cotizar"
            className="text-[#f97316] underline underline-offset-2 hover:text-[#fb923c]"
          >
            Pedir presupuesto →
          </a>
        </p>
      </div>
    </div>
  )
}
