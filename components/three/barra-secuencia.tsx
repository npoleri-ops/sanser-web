"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, Play, Pause, ListOrdered } from "lucide-react"
import type { PasoMontaje } from "@/lib/shed-config"

interface BarraSecuenciaProps {
  pasos: PasoMontaje[]
  etapa: number
  onEtapa: (n: number | ((prev: number) => number)) => void
}

const CATEGORIA_COLOR: Record<string, string> = {
  Civil: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  Metálico: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  Estructura: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
  Cubierta: "bg-orange-500/20 text-orange-300 border-orange-500/40",
  Cerramientos: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  Aberturas: "bg-violet-500/20 text-violet-300 border-violet-500/40",
  Terminaciones: "bg-rose-500/20 text-rose-300 border-rose-500/40",
}

/**
 * Barra inferior de control de la secuencia de montaje paso a paso.
 * Se muestra superpuesta sobre el canvas 3D.
 */
export function BarraSecuencia({ pasos, etapa, onEtapa }: BarraSecuenciaProps) {
  const [abierto, setAbierto] = useState(false)
  const [reproduciendo, setReproduciendo] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // etapa 0 = "todo visible" (fuera de la secuencia)
  const total = pasos.length
  const pasoActual = etapa > 0 ? pasos[etapa - 1] : null

  // Auto-avance
  useEffect(() => {
    if (!reproduciendo) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }
    intervalRef.current = setInterval(() => {
      onEtapa((prev: number) => {
        const next = prev >= total ? 0 : prev + 1
        if (next === 0) setReproduciendo(false)
        return next
      })
    }, 3200)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reproduciendo, total])

  const irA = (n: number) => {
    setReproduciendo(false)
    onEtapa(n)
  }

  const anterior = () => irA(Math.max(0, etapa - 1))
  const siguiente = () => irA(Math.min(total, etapa + 1))

  const togglePlay = () => {
    if (reproduciendo) {
      setReproduciendo(false)
      return
    }
    // Si está en el último paso o en "todo visible", reinicia desde el paso 1
    if (etapa === 0 || etapa >= total) onEtapa(1)
    setReproduciendo(true)
  }

  const categoriaClase =
    pasoActual
      ? (CATEGORIA_COLOR[pasoActual.categoria] ?? "bg-white/10 text-white/70 border-white/20")
      : ""

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none flex flex-col items-center gap-2 pb-3 px-3">

      {/* Banner del paso activo */}
      {pasoActual && (
        <div className="pointer-events-none w-full max-w-xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="rounded-xl border border-white/10 bg-[#0d0f14]/90 backdrop-blur-md px-4 py-3 shadow-xl">
            <div className="flex items-start gap-3">
              {/* Número de paso */}
              <span className="shrink-0 size-8 rounded-lg bg-[#f97316] flex items-center justify-center text-white text-sm font-bold shadow">
                {etapa}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p className="text-white text-sm font-bold leading-tight">{pasoActual.titulo}</p>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${categoriaClase}`}>
                    {pasoActual.categoria}
                  </span>
                </div>
                <p className="text-white/60 text-[11px] leading-relaxed line-clamp-3">
                  {pasoActual.descripcion}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Barra de control */}
      <div className="pointer-events-auto w-full max-w-xl mx-auto">
        <div className="rounded-2xl border border-white/10 bg-[#0d0f14]/95 backdrop-blur-md px-3 py-2.5 shadow-xl flex items-center gap-3">

          {/* Botón toggle lista */}
          <button
            onClick={() => setAbierto(o => !o)}
            title="Ver todos los pasos"
            className="shrink-0 size-8 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center text-white/60 hover:text-white"
          >
            <ListOrdered className="size-4" />
          </button>

          {/* Anterior */}
          <button
            onClick={anterior}
            disabled={etapa <= 0}
            title="Paso anterior"
            className="shrink-0 size-8 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center text-white/70 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="size-4" />
          </button>

          {/* Indicador de paso + barra de progreso */}
          <div className="flex-1 min-w-0 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-white/50 text-[10px] font-semibold uppercase tracking-wider">
                Secuencia de armado
              </span>
              <span className="text-white/70 text-[11px] font-mono">
                {etapa === 0 ? "Completo" : `${etapa} / ${total}`}
              </span>
            </div>
            {/* Puntos de progreso */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
              <button
                onClick={() => irA(0)}
                title="Vista completa"
                className={`shrink-0 h-1.5 rounded-full transition-all ${etapa === 0 ? "w-5 bg-[#f97316]" : "w-1.5 bg-white/20 hover:bg-white/40"}`}
              />
              {pasos.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => irA(idx + 1)}
                  title={pasos[idx].titulo}
                  className={`shrink-0 h-1.5 rounded-full transition-all ${
                    etapa === idx + 1
                      ? "w-5 bg-[#f97316]"
                      : idx + 1 < etapa
                      ? "w-1.5 bg-[#f97316]/50"
                      : "w-1.5 bg-white/20 hover:bg-white/40"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Siguiente */}
          <button
            onClick={siguiente}
            disabled={etapa >= total}
            title="Paso siguiente"
            className="shrink-0 size-8 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center text-white/70 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="size-4" />
          </button>

          {/* Play / Pause */}
          <button
            onClick={togglePlay}
            title={reproduciendo ? "Pausar" : "Reproducir secuencia"}
            className="shrink-0 size-8 rounded-lg bg-[#f97316] hover:bg-[#ea6a0a] active:scale-95 transition-all flex items-center justify-center text-white shadow-md"
          >
            {reproduciendo ? <Pause className="size-4" /> : <Play className="size-4" />}
          </button>
        </div>

        {/* Panel expandible con lista de pasos */}
        {abierto && (
          <div className="mt-1 rounded-xl border border-white/10 bg-[#0d0f14]/95 backdrop-blur-md shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="max-h-56 overflow-y-auto">
              {/* Opción: vista completa */}
              <button
                onClick={() => irA(0)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  etapa === 0 ? "bg-[#f97316]/15" : "hover:bg-white/5"
                }`}
              >
                <span className={`shrink-0 size-6 rounded-md flex items-center justify-center text-[11px] font-bold ${
                  etapa === 0 ? "bg-[#f97316] text-white" : "bg-white/10 text-white/50"
                }`}>
                  ★
                </span>
                <span className={`text-xs font-medium ${etapa === 0 ? "text-white" : "text-white/60"}`}>
                  Vista completa (todo el tinglado)
                </span>
              </button>

              {pasos.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => irA(idx + 1)}
                  className={`w-full flex items-start gap-3 px-4 py-2.5 text-left transition-colors border-t border-white/5 ${
                    etapa === idx + 1 ? "bg-[#f97316]/15" : "hover:bg-white/5"
                  }`}
                >
                  <span className={`shrink-0 size-6 rounded-md flex items-center justify-center text-[11px] font-bold mt-0.5 ${
                    etapa === idx + 1 ? "bg-[#f97316] text-white" : idx + 1 < etapa ? "bg-[#f97316]/40 text-white/70" : "bg-white/10 text-white/50"
                  }`}>
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <p className={`text-xs font-semibold leading-tight ${etapa === idx + 1 ? "text-white" : "text-white/70"}`}>
                      {p.titulo}
                    </p>
                    <p className="text-[10px] text-white/40 mt-0.5">{p.categoria}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

