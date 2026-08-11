"use client"

import { useCallback, useState } from "react"
import dynamic from "next/dynamic"
import { RotateCcw } from "lucide-react"
import { Controls } from "./controls"
import { QuoteCard } from "./quote-card"
import { DEFAULT_CONFIG, type ShedConfig } from "@/lib/shed-config"
import { cn } from "@/lib/utils"

// Dynamic import: never run ConfigScene on the server (Three.js / WebGL)
const ConfigScene = dynamic(
  () => import("@/components/three/config-scene").then((m) => ({ default: m.ConfigScene })),
  { ssr: false, loading: () => <div className="h-full w-full bg-[#101115]" /> },
)

export function Configurator() {
  const [config, setConfig] = useState<ShedConfig>(DEFAULT_CONFIG)

  const update = useCallback(
    <K extends keyof ShedConfig>(key: K, value: ShedConfig[K]) => {
      setConfig((prev) => ({ ...prev, [key]: value }))
    },
    [],
  )

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col items-start lg:flex-row w-full overflow-hidden">
      {/* Left: controls */}
      <aside className="h-full order-2 w-full shrink-0 overflow-y-auto border-b border-border bg-card/40 p-5 lg:order-1 lg:w-[340px] lg:border-b-0 lg:border-r">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-700 uppercase tracking-wide text-[#F97316]">
              Configurador
            </h2>
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              Diseñá tu tinglado
            </p>
          </div>
          <button
            onClick={() => setConfig(DEFAULT_CONFIG)}
            className="flex items-center gap-1.5 rounded-sm border border-border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
          >
            <RotateCcw className="size-3.5" />
            Reset
          </button>
        </div>
        <Controls config={config} update={update} />
      </aside>

      {/* Center: 3D scene */}
      <div className="relative order-1 h-full min-h-[320px] w-full lg:order-2 lg:flex-1">
        <ConfigScene config={config} />
        
        {/* Floating overlays */}
        <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-3">
          <div className="rounded-sm border border-border bg-background/70 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground backdrop-blur">
            Arrastrá para rotar · Scroll para zoom
          </div>
        </div>
      </div>

      {/* Right: quote */}
      <aside className="h-full order-3 w-full shrink-0 overflow-y-auto border-t border-border bg-card/40 p-5 lg:w-[340px] lg:border-l lg:border-t-0">
        <QuoteCard config={config} />
      </aside>
    </div>
  )
}
