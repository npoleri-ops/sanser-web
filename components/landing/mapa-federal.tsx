"use client"

import { useState, useEffect } from "react"
import {
  Truck,
  Factory,
  MapPin,
  Compass,
} from "lucide-react"
import {
  ORIGEN_SANSER,
  DESTINOS_OBRAS,
  PROVINCIAS_ARGENTINA,
  TOTAL_OBRAS,
  TOTAL_DESTINOS,
  getMesesActividad,
  DestinoObra,
} from "@/lib/data/obras-mapa"
import { cn } from "@/lib/utils"

interface MapaFederalProps {
  onGoEditor?: () => void
}

export function MapaFederal({ onGoEditor }: MapaFederalProps = {}) {
  const [meses, setMeses] = useState<number>(() => getMesesActividad())
  const [selectedDestino, setSelectedDestino] = useState<DestinoObra | null>(null)
  const [hoveredDestino, setHoveredDestino] = useState<DestinoObra | null>(null)
  const [showOrigenInfo, setShowOrigenInfo] = useState(false)

  useEffect(() => {
    setMeses(getMesesActividad())
  }, [])

  const activeDestino = hoveredDestino || selectedDestino

  // Provincias con presencia activa para resaltarlas con sutil coloración
  const provinciasActivas = new Set([
    "misiones",
    "san-juan",
    "cordoba",
    "buenos-aires",
    "neuquen",
  ])

  return (
    <section
      id="envios"
      className="relative border-b border-border bg-[#0d0f15] py-20 lg:py-28 overflow-hidden"
    >
      {/* Background radial effects */}
      <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(249,115,22,0.12),transparent_70%)]" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 size-96 rounded-full bg-[#f97316]/5 blur-3xl" />
      <div className="pointer-events-none absolute -top-24 -right-24 size-96 rounded-full bg-[#ff8c00]/5 blur-3xl" />

      {/* Grid pattern background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
        {/* ENCABEZADO PRINCIPAL & BADGE CONTADOR DE TRAYECTORIA */}
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#F97316]/30 bg-[#1e2330] px-3.5 py-1 font-mono text-[11px] uppercase tracking-[0.2em] text-[#F97316]">
              <Truck className="size-3.5" />
              Logística & Cobertura Nacional
            </span>
            <h2 className="mt-4 text-balance font-display text-4xl font-700 uppercase leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Envíos <span className="text-[#F97316]">a Todo el País</span>
            </h2>
            <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
              Desde nuestra fábrica central en{" "}
              <strong className="text-foreground">Jardín América, Misiones</strong>,
              diseñamos y producimos tinglados reticulados con despacho directo a
              cualquier provincia argentina.
            </p>
          </div>

          {/* BADGE CONTADOR DE TRAYECTORIA: Desde el 9 de marzo */}
          <div className="w-full md:w-auto shrink-0">
            <div className="relative overflow-hidden rounded-xl border border-[#F97316]/40 bg-gradient-to-br from-[#181c26] via-[#12151e] to-[#0b0c10] p-5 shadow-2xl shadow-[#F97316]/10 backdrop-blur-md">
              <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#F97316] to-transparent" />

              <div className="flex items-center gap-2.5">
                <span className="relative flex size-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#F97316] opacity-75" />
                  <span className="relative inline-flex size-3 rounded-full bg-[#F97316]" />
                </span>
                <span className="font-mono text-xs uppercase tracking-wider text-[#F97316] font-semibold">
                  Presencia Federal
                </span>
              </div>

              <p className="mt-2 text-xs font-mono text-gray-300 uppercase tracking-wide">
                Desde el 9 de marzo marcando presencia en el país
              </p>

              <div className="mt-3 flex items-baseline gap-2.5 border-t border-border/40 pt-3">
                <span className="font-mono text-4xl sm:text-5xl font-700 text-white tracking-tight">
                  {meses}
                </span>
                <div className="flex flex-col">
                  <span className="font-display text-base font-700 uppercase tracking-wider text-[#F97316] leading-none">
                    Meses
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground uppercase tracking-widest mt-0.5">
                    de actividad ininterrumpida
                  </span>
                </div>
              </div>

              {/* Quick metrics */}
              <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border/40 pt-3 text-xs font-mono">
                <div className="rounded bg-[#1a1f2c]/70 p-2">
                  <div className="text-gray-400 text-[10px] uppercase">Obras Entregadas</div>
                  <div className="text-white font-bold text-base mt-0.5 flex items-center gap-1.5">
                    <span className="text-[#F97316]">{TOTAL_OBRAS}</span> Obras
                  </div>
                </div>
                <div className="rounded bg-[#1a1f2c]/70 p-2">
                  <div className="text-gray-400 text-[10px] uppercase">Destinos Federales</div>
                  <div className="text-white font-bold text-base mt-0.5 flex items-center gap-1.5">
                    <span className="text-[#F97316]">{TOTAL_DESTINOS}</span> Puntos
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* MAPA FEDERAL: PROTAGONISTA CENTRAL EN ANCHO COMPLETO */}
        <div className="mt-12 mx-auto max-w-4xl w-full">
          <div className="relative rounded-2xl border border-border/70 bg-[#0f121a] p-4 sm:p-8 shadow-2xl shadow-black/80 overflow-hidden">
            {/* Technical HUD decorations */}
            <div className="pointer-events-none absolute top-4 left-4 sm:top-6 sm:left-6 flex items-center gap-2 font-mono text-[11px] text-muted-foreground uppercase tracking-widest">
              <Compass className="size-4 text-[#F97316]" />
              <span>Mapa Federal de Entregas // Proyección Geográfica</span>
            </div>

            <div className="pointer-events-none absolute top-4 right-4 sm:top-6 sm:right-6 hidden sm:flex items-center gap-4 font-mono text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[#f97316]" /> 1 Venta
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-[#ff8c00] ring-2 ring-[#ff8c00]/40" /> 2+ Ventas (Volumen)
              </span>
            </div>

            {/* SVG MAP */}
            <div className="relative mt-8 sm:mt-10 flex justify-center items-center">
              <svg
                viewBox="0 0 600 900"
                className="w-full h-auto max-h-[760px] select-none"
                style={{ filter: "drop-shadow(0 10px 30px rgba(0,0,0,0.7))" }}
              >
                <defs>
                  {/* Glow for high volume route (San Juan) */}
                  <filter id="glow-heavy" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>

                  {/* Glow for standard routes */}
                  <filter id="glow-standard" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>

                  {/* Radial gradients for pins */}
                  <radialGradient id="grad-origen" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="45%" stopColor="#f97316" />
                    <stop offset="100%" stopColor="#c2410c" />
                  </radialGradient>

                  <radialGradient id="grad-san-juan" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="40%" stopColor="#ffb703" />
                    <stop offset="100%" stopColor="#ff8c00" />
                  </radialGradient>

                  <radialGradient id="grad-standard" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#fed7aa" />
                    <stop offset="60%" stopColor="#f97316" />
                    <stop offset="100%" stopColor="#ea580c" />
                  </radialGradient>
                </defs>

                <style>{`
                  @keyframes flowDashStandard {
                    from { stroke-dashoffset: 40; }
                    to { stroke-dashoffset: 0; }
                  }
                  @keyframes flowDashHeavy {
                    from { stroke-dashoffset: 36; }
                    to { stroke-dashoffset: 0; }
                  }
                  .flow-line-standard {
                    animation: flowDashStandard 1.8s linear infinite;
                  }
                  .flow-line-heavy {
                    animation: flowDashHeavy 1.1s linear infinite;
                  }
                `}</style>

                {/* PROVINCES BACKGROUND LAYER */}
                <g id="provincias-layer">
                  {PROVINCIAS_ARGENTINA.map((prov) => {
                    const isActiva = provinciasActivas.has(prov.id)
                    const isOrigen = prov.id === "misiones"
                    const isDestinoActivo =
                      activeDestino &&
                      (prov.id.includes(activeDestino.id) ||
                        (activeDestino.provincia === "Buenos Aires" && prov.id === "buenos-aires") ||
                        (activeDestino.provincia === "Córdoba" && prov.id === "cordoba") ||
                        (activeDestino.provincia === "San Juan" && prov.id === "san-juan") ||
                        (activeDestino.provincia === "Neuquén" && prov.id === "neuquen"))

                    return (
                      <path
                        key={prov.id}
                        d={prov.d}
                        fill={
                          isOrigen
                            ? "rgba(249, 115, 22, 0.22)"
                            : isDestinoActivo
                            ? "rgba(255, 140, 0, 0.2)"
                            : isActiva
                            ? "#1b212e"
                            : "#141720"
                        }
                        stroke={
                          isOrigen
                            ? "#f97316"
                            : isDestinoActivo
                            ? "#ff8c00"
                            : isActiva
                            ? "#2b3447"
                            : "#1f2636"
                        }
                        strokeWidth={isOrigen || isDestinoActivo ? "1.5" : "0.75"}
                        className="transition-colors duration-300"
                      />
                    )
                  })}
                </g>

                {/* LATITUDE / LONGITUDE GUIDE MARKS */}
                <g id="grid-guides" opacity="0.15" stroke="#94a3b8" strokeDasharray="2 4">
                  <line x1="50" y1="200" x2="550" y2="200" strokeWidth="0.5" />
                  <line x1="50" y1="400" x2="550" y2="400" strokeWidth="0.5" />
                  <line x1="50" y1="600" x2="550" y2="600" strokeWidth="0.5" />
                  <line x1="300" y1="50" x2="300" y2="850" strokeWidth="0.5" />
                </g>

                {/* CONNECTION LINES FROM MISIONES TO DESTINATIONS */}
                <g id="rutas-layer">
                  {DESTINOS_OBRAS.map((destino) => {
                    const isHighVolume = destino.obras >= 2
                    const isTargeted = activeDestino?.id === destino.id

                    return (
                      <g key={`route-${destino.id}`} className="transition-all duration-300">
                        {/* 1. Underlying glow stroke */}
                        <path
                          d={destino.pathD}
                          fill="none"
                          stroke={isHighVolume ? "#ff8c00" : "#f97316"}
                          strokeWidth={isHighVolume ? (isTargeted ? "7" : "5") : isTargeted ? "4" : "2.5"}
                          strokeOpacity={isHighVolume ? (isTargeted ? 0.95 : 0.75) : isTargeted ? 0.8 : 0.45}
                          filter={isHighVolume ? "url(#glow-heavy)" : "url(#glow-standard)"}
                        />

                        {/* 2. Core continuous stroke */}
                        <path
                          d={destino.pathD}
                          fill="none"
                          stroke={isHighVolume ? "#ffa200" : "#f97316"}
                          strokeWidth={isHighVolume ? "3.5" : "1.8"}
                          strokeOpacity={isTargeted ? 1 : 0.85}
                          strokeLinecap="round"
                        />

                        {/* 3. Animated flow dash line */}
                        <path
                          d={destino.pathD}
                          fill="none"
                          stroke={isHighVolume ? "#fff275" : "#fed7aa"}
                          strokeWidth={isHighVolume ? "3.5" : "2"}
                          strokeDasharray={isHighVolume ? "8 14" : "6 16"}
                          className={isHighVolume ? "flow-line-heavy" : "flow-line-standard"}
                          strokeOpacity={isTargeted ? 1 : 0.7}
                          strokeLinecap="round"
                        />

                        {/* 4. Native travelling particle (Comet beacon) */}
                        <circle
                          r={isHighVolume ? "4.5" : "3"}
                          fill={isHighVolume ? "#ffe600" : "#ffffff"}
                          filter={isHighVolume ? "url(#glow-heavy)" : "url(#glow-standard)"}
                        >
                          <animateMotion
                            path={destino.pathD}
                            dur={isHighVolume ? "2.2s" : "3.2s"}
                            repeatCount="indefinite"
                          />
                        </circle>

                        {/* Second staggered comet for high-volume San Juan */}
                        {isHighVolume && (
                          <circle r="3.5" fill="#ff9100">
                            <animateMotion
                              path={destino.pathD}
                              dur="2.2s"
                              begin="1.1s"
                              repeatCount="indefinite"
                            />
                          </circle>
                        )}
                      </g>
                    )
                  })}
                </g>

                {/* DESTINATION NODES / PINS */}
                <g id="destinos-layer">
                  {DESTINOS_OBRAS.map((destino) => {
                    const isHighVolume = destino.obras >= 2
                    const isTargeted = activeDestino?.id === destino.id
                    const { x, y } = destino.svgCoords

                    return (
                      <g
                        key={`pin-${destino.id}`}
                        className="cursor-pointer group"
                        onMouseEnter={() => setHoveredDestino(destino)}
                        onMouseLeave={() => setHoveredDestino(null)}
                        onClick={() =>
                          setSelectedDestino((curr) => (curr?.id === destino.id ? null : destino))
                        }
                        tabIndex={0}
                        role="button"
                        aria-label={`Ver información de ${destino.ciudad}, ${destino.provincia}`}
                      >
                        {/* Pulse ring for high volume */}
                        {isHighVolume && (
                          <circle
                            cx={x}
                            cy={y}
                            r="16"
                            fill="none"
                            stroke="#ff8c00"
                            strokeWidth="1.5"
                            opacity="0.4"
                            className="animate-ping"
                            style={{ animationDuration: "2.2s" }}
                          />
                        )}

                        {/* Outer highlight halo */}
                        <circle
                          cx={x}
                          cy={y}
                          r={isHighVolume ? (isTargeted ? "14" : "11") : isTargeted ? "11" : "8"}
                          fill={isHighVolume ? "rgba(255,140,0,0.25)" : "rgba(249,115,22,0.18)"}
                          stroke={isHighVolume ? "#ff8c00" : "#f97316"}
                          strokeWidth={isHighVolume ? "2" : "1.2"}
                          className="transition-all duration-300"
                        />

                        {/* Core pin dot */}
                        <circle
                          cx={x}
                          cy={y}
                          r={isHighVolume ? "6.5" : "4.5"}
                          fill={isHighVolume ? "url(#grad-san-juan)" : "url(#grad-standard)"}
                          stroke="#ffffff"
                          strokeWidth="1.2"
                          filter={isHighVolume ? "url(#glow-heavy)" : "none"}
                        />

                        {/* Node label pill on map */}
                        <g transform={`translate(${x}, ${y - 14})`}>
                          <rect
                            x={isHighVolume ? "-44" : "-38"}
                            y="-16"
                            width={isHighVolume ? "88" : "76"}
                            height="18"
                            rx="9"
                            fill={isHighVolume ? "#1e1708" : "#12151e"}
                            stroke={isHighVolume ? "#ff8c00" : isTargeted ? "#f97316" : "#2b3447"}
                            strokeWidth={isHighVolume ? "1.5" : "1"}
                          />
                          <text
                            x="0"
                            y="-4"
                            textAnchor="middle"
                            fill={isHighVolume ? "#ffc107" : "#e2e8f0"}
                            fontSize={isHighVolume ? "9.5" : "8.5"}
                            fontWeight={isHighVolume ? "bold" : "600"}
                            fontFamily="monospace"
                          >
                            {destino.ciudad} ({destino.obras})
                          </text>
                        </g>
                      </g>
                    )
                  })}
                </g>

                {/* ORIGEN MISIONES (FÁBRICA SANSER) - NODO PRINCIPAL DESTACADO CON PULSO */}
                <g
                  id="origen-misiones"
                  className="cursor-pointer"
                  onMouseEnter={() => setShowOrigenInfo(true)}
                  onMouseLeave={() => setShowOrigenInfo(false)}
                  onClick={() => setShowOrigenInfo((prev) => !prev)}
                  role="button"
                  tabIndex={0}
                  aria-label="Ver detalles de Fábrica Sanser en Jardín América, Misiones"
                >
                  {/* Concentric radar pulse rings */}
                  <circle
                    cx={ORIGEN_SANSER.svgCoords.x}
                    cy={ORIGEN_SANSER.svgCoords.y}
                    r="28"
                    fill="none"
                    stroke="#f97316"
                    strokeWidth="1.5"
                    opacity="0.25"
                    className="animate-ping"
                    style={{ animationDuration: "2.6s" }}
                  />
                  <circle
                    cx={ORIGEN_SANSER.svgCoords.x}
                    cy={ORIGEN_SANSER.svgCoords.y}
                    r="16"
                    fill="none"
                    stroke="#f97316"
                    strokeWidth="2"
                    opacity="0.45"
                    className="animate-ping"
                    style={{ animationDuration: "1.8s" }}
                  />

                  {/* Outer glowing halo */}
                  <circle
                    cx={ORIGEN_SANSER.svgCoords.x}
                    cy={ORIGEN_SANSER.svgCoords.y}
                    r="12"
                    fill="rgba(249, 115, 22, 0.35)"
                    stroke="#f97316"
                    strokeWidth="2.5"
                    filter="url(#glow-heavy)"
                  />

                  {/* Core node */}
                  <circle
                    cx={ORIGEN_SANSER.svgCoords.x}
                    cy={ORIGEN_SANSER.svgCoords.y}
                    r="6.5"
                    fill="url(#grad-origen)"
                    stroke="#ffffff"
                    strokeWidth="1.8"
                  />

                  {/* Prominent label badge for Fábrica Sanser */}
                  <g transform={`translate(${ORIGEN_SANSER.svgCoords.x}, ${ORIGEN_SANSER.svgCoords.y - 18})`}>
                    <rect
                      x="-70"
                      y="-22"
                      width="140"
                      height="22"
                      rx="11"
                      fill="#1f160f"
                      stroke="#f97316"
                      strokeWidth="1.8"
                      filter="url(#glow-standard)"
                    />
                    <circle cx="-56" cy="-11" r="3" fill="#22c55e" className="animate-pulse" />
                    <text
                      x="-46"
                      y="-7.5"
                      fill="#ffffff"
                      fontSize="9.5"
                      fontWeight="bold"
                      fontFamily="monospace"
                      letterSpacing="0.05em"
                    >
                      FÁBRICA SANSER
                    </text>
                    <text
                      x="56"
                      y="-7.5"
                      fill="#f97316"
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      [MNES]
                    </text>
                  </g>
                </g>
              </svg>

              {/* TOOLTIP / TARJETA FLOTANTE AJUSTADA Y LIMPIA */}
              {activeDestino && (
                <div
                  className="absolute z-20 pointer-events-auto rounded-xl border border-[#F97316]/60 bg-[#121520]/95 p-4 shadow-2xl shadow-black backdrop-blur-md transition-all duration-200 animate-in fade-in zoom-in-95 w-[90%] max-w-sm"
                  style={{
                    left: "50%",
                    bottom: "20px",
                    transform: "translateX(-50%)",
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <MapPin className="size-4 text-[#F97316] shrink-0" />
                        <h4 className="font-display text-lg font-700 uppercase tracking-wide text-white">
                          {activeDestino.ciudad}
                        </h4>
                      </div>
                      <p className="text-xs font-mono text-[#F97316] uppercase tracking-wider mt-0.5">
                        {activeDestino.provincia}
                      </p>
                    </div>

                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2.5 py-1 font-mono text-xs font-bold uppercase",
                        activeDestino.obras >= 2
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/50"
                          : "bg-[#F97316]/20 text-[#F97316] border border-[#F97316]/40",
                      )}
                    >
                      {activeDestino.obras === 1 ? "1 Obra" : `${activeDestino.obras} Obras`}
                    </span>
                  </div>

                  <div className="mt-3 border-t border-border/50 pt-2.5 space-y-2 text-xs">
                    <div className="flex items-center justify-between font-mono">
                      <span className="text-muted-foreground">Estructura:</span>
                      <span className="text-foreground font-semibold text-right">
                        {activeDestino.tipoEstructura}
                      </span>
                    </div>

                    {activeDestino.etiquetaClimatica && (
                      <div className="flex items-center justify-between font-mono">
                        <span className="text-muted-foreground">Condición:</span>
                        <span className="text-amber-400/90 font-medium text-right">
                          {activeDestino.etiquetaClimatica}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between font-mono text-[11px] border-t border-border/30 pt-1 text-muted-foreground">
                      <span>Distancia:</span>
                      <span className="text-gray-300 font-mono">
                        ~{activeDestino.distanciaKm.toLocaleString("es-AR")} km desde fábrica
                      </span>
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-center justify-end border-t border-border/40 pt-1.5 text-[10px] font-mono">
                    <button
                      onClick={() => setSelectedDestino(null)}
                      className="text-gray-400 hover:text-white underline cursor-pointer"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              )}

              {/* ORIGEN TOOLTIP */}
              {showOrigenInfo && !activeDestino && (
                <div
                  className="absolute z-20 pointer-events-auto rounded-xl border border-[#F97316] bg-[#17130f]/95 p-4 shadow-2xl shadow-black backdrop-blur-md transition-all duration-200 animate-in fade-in zoom-in-95 w-[90%] max-w-sm"
                  style={{
                    left: "50%",
                    bottom: "20px",
                    transform: "translateX(-50%)",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Factory className="size-4 text-[#F97316] shrink-0" />
                    <div>
                      <h4 className="font-display text-lg font-700 uppercase tracking-wide text-white">
                        {ORIGEN_SANSER.nombre}
                      </h4>
                      <p className="text-xs font-mono text-[#F97316]">
                        {ORIGEN_SANSER.ciudad}, {ORIGEN_SANSER.provincia}
                      </p>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-gray-300">
                    {ORIGEN_SANSER.descripcion}
                  </p>
                  <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2 text-[10px] font-mono text-muted-foreground">
                    <span className="text-amber-400 font-semibold">Planta Matriz de Despacho</span>
                    <button
                      onClick={() => setShowOrigenInfo(false)}
                      className="text-gray-400 hover:text-white underline cursor-pointer"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
