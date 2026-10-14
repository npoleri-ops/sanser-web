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

  // Provincias con presencia activa para resaltarlas sutilmente
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
      {/* Background radial glow effects */}
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
        {/* ENCABEZADO CENTRADO CON MÉTRICA MINIMALISTA */}
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#F97316]/30 bg-[#1e2330] px-3.5 py-1 font-mono text-[11px] uppercase tracking-[0.2em] text-[#F97316]">
            <Truck className="size-3.5" />
            Envíos y Cobertura Nacional
          </span>

          <h2 className="mt-4 text-balance font-display text-4xl font-700 uppercase leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Envíos y <span className="text-[#F97316]">Cobertura Nacional</span>
          </h2>

          <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            Desde nuestra fábrica central en{" "}
            <strong className="text-foreground">Jardín América, Misiones</strong>,
            diseñamos y producimos tinglados reticulados con despacho directo a cualquier provincia argentina.
          </p>

          {/* BADGE MINIMALISTA: 7 Meses de Actividad Ininterrumpida • 6 Obras */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
            <div className="inline-flex items-center gap-2.5 rounded-full border border-[#F97316]/30 bg-[#151922]/90 px-4 py-2 font-mono text-xs text-gray-200 shadow-lg shadow-black/40 backdrop-blur-md">
              <span className="flex size-2 rounded-full bg-[#F97316]" />
              <span>
                <strong className="text-[#F97316] font-semibold">{meses} Meses</strong> de Actividad Ininterrumpida
              </span>
              <span className="text-gray-500">•</span>
              <span>
                <strong className="text-white font-semibold">{TOTAL_OBRAS} Obras</strong> Entregadas
              </span>
              <span className="text-gray-500">•</span>
              <span className="text-gray-400">
                Desde el 9 de marzo
              </span>
            </div>
          </div>
        </div>

        {/* MAPA FEDERAL: CUADRO PRINCIPAL CENTRADO */}
        <div className="mt-12 mx-auto max-w-4xl w-full">
          <div className="relative rounded-2xl border border-border/70 bg-[#0f121a] p-4 sm:p-8 shadow-2xl shadow-black/80 overflow-hidden">
            {/* Technical HUD tags */}
            <div className="pointer-events-none absolute top-4 left-4 sm:top-5 sm:left-6 flex items-center gap-2 font-mono text-[11px] text-muted-foreground uppercase tracking-widest">
              <Compass className="size-3.5 text-[#F97316]" />
              <span>Mapa Federal de Entregas</span>
            </div>

            <div className="pointer-events-none absolute top-4 right-4 sm:top-5 sm:right-6 hidden sm:flex items-center gap-4 font-mono text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[#f97316]" /> 1 Venta
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-[#ff8c00] ring-1 ring-[#ff8c00]/50" /> 2+ Ventas (Volumen)
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
                  {/* Glow filter for high-volume San Juan route */}
                  <filter id="glow-heavy" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>

                  {/* Subtle glow filter for standard routes */}
                  <filter id="glow-standard" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="1.5" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

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

                {/* RUTAS: TRAZO CONTINUO LIMPIO Y PARTÍCULAS SUAVES */}
                <g id="rutas-layer">
                  {DESTINOS_OBRAS.map((destino) => {
                    const isHighVolume = destino.obras >= 2
                    const isTargeted = activeDestino?.id === destino.id

                    return (
                      <g key={`route-${destino.id}`} className="transition-all duration-300">
                        {/* Trazo continuo elegante */}
                        <path
                          d={destino.pathD}
                          fill="none"
                          stroke={isHighVolume ? "#ff8c00" : "#f97316"}
                          strokeWidth={isHighVolume ? (isTargeted ? "4" : "3.2") : isTargeted ? "2.6" : "1.8"}
                          strokeOpacity={isHighVolume ? (isTargeted ? 1 : 0.85) : isTargeted ? 0.9 : 0.65}
                          strokeLinecap="round"
                          filter={isHighVolume ? "url(#glow-heavy)" : "url(#glow-standard)"}
                        />

                        {/* Partícula suave viajando por la curva */}
                        <circle
                          r={isHighVolume ? "3.5" : "2.5"}
                          fill={isHighVolume ? "#fff275" : "#fed7aa"}
                          filter={isHighVolume ? "url(#glow-heavy)" : "none"}
                        >
                          <animateMotion
                            path={destino.pathD}
                            dur={isHighVolume ? "2.6s" : "3.6s"}
                            repeatCount="indefinite"
                          />
                        </circle>
                      </g>
                    )
                  })}
                </g>

                {/* NODOS DE DESTINOS (SIN AROS RADIALES CONSTANTES) */}
                <g id="destinos-layer">
                  {DESTINOS_OBRAS.map((destino) => {
                    const isHighVolume = destino.obras >= 2
                    const isTargeted = activeDestino?.id === destino.id
                    const { x, y } = destino.svgCoords

                    return (
                      <g
                        key={`pin-${destino.id}`}
                        className="cursor-pointer group"
                        onMouseEnter={() => {
                          setHoveredDestino(destino)
                          setShowOrigenInfo(false)
                        }}
                        onMouseLeave={() => setHoveredDestino(null)}
                        onClick={() => {
                          setShowOrigenInfo(false)
                          setSelectedDestino((curr) => (curr?.id === destino.id ? null : destino))
                        }}
                        tabIndex={0}
                        role="button"
                        aria-label={`Ver información de ${destino.ciudad}, ${destino.provincia}`}
                      >
                        {/* Halo estático suave en hover o selección */}
                        <circle
                          cx={x}
                          cy={y}
                          r={isHighVolume ? (isTargeted ? "12" : "9") : isTargeted ? "10" : "7"}
                          fill={isHighVolume ? "rgba(255,140,0,0.22)" : "rgba(249,115,22,0.18)"}
                          stroke={isHighVolume ? "#ff8c00" : "#f97316"}
                          strokeWidth={isHighVolume ? "1.6" : "1"}
                          className="transition-all duration-200"
                        />

                        {/* Punto central del nodo */}
                        <circle
                          cx={x}
                          cy={y}
                          r={isHighVolume ? "5" : "3.8"}
                          fill={isHighVolume ? "#ffb703" : "#f97316"}
                          stroke="#ffffff"
                          strokeWidth="1.2"
                        />

                        {/* Etiqueta compacta en el mapa */}
                        <g transform={`translate(${x}, ${y - 12})`}>
                          <rect
                            x={isHighVolume ? "-40" : "-34"}
                            y="-14"
                            width={isHighVolume ? "80" : "68"}
                            height="16"
                            rx="8"
                            fill={isHighVolume ? "#1c150a" : "#12151e"}
                            stroke={isHighVolume ? "#ff8c00" : isTargeted ? "#f97316" : "#2a3346"}
                            strokeWidth={isHighVolume ? "1.2" : "0.8"}
                          />
                          <text
                            x="0"
                            y="-3"
                            textAnchor="middle"
                            fill={isHighVolume ? "#ffc107" : "#e2e8f0"}
                            fontSize={isHighVolume ? "8.5" : "7.5"}
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

                {/* ORIGEN MISIONES (FÁBRICA CENTRAL - LIMPIO Y SUTIL) */}
                <g
                  id="origen-misiones"
                  className="cursor-pointer"
                  onMouseEnter={() => {
                    setShowOrigenInfo(true)
                    setHoveredDestino(null)
                  }}
                  onMouseLeave={() => setShowOrigenInfo(false)}
                  onClick={() => {
                    setSelectedDestino(null)
                    setShowOrigenInfo((prev) => !prev)
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label="Fábrica Central | Jardín América, Misiones"
                >
                  <title>Fábrica Central | Jardín América, Misiones</title>

                  {/* Halo sutil estático */}
                  <circle
                    cx={ORIGEN_SANSER.svgCoords.x}
                    cy={ORIGEN_SANSER.svgCoords.y}
                    r="11"
                    fill="rgba(249, 115, 22, 0.25)"
                    stroke="#f97316"
                    strokeWidth="1.8"
                  />

                  {/* Core node */}
                  <circle
                    cx={ORIGEN_SANSER.svgCoords.x}
                    cy={ORIGEN_SANSER.svgCoords.y}
                    r="5"
                    fill="#ffffff"
                  />
                  <circle
                    cx={ORIGEN_SANSER.svgCoords.x}
                    cy={ORIGEN_SANSER.svgCoords.y}
                    r="3.5"
                    fill="#f97316"
                  />

                  {/* Etiqueta sutil de Fábrica Central */}
                  <g transform={`translate(${ORIGEN_SANSER.svgCoords.x}, ${ORIGEN_SANSER.svgCoords.y - 14})`}>
                    <rect
                      x="-46"
                      y="-14"
                      width="92"
                      height="16"
                      rx="8"
                      fill="#19130c"
                      stroke="#f97316"
                      strokeWidth="1"
                    />
                    <text
                      x="0"
                      y="-3"
                      textAnchor="middle"
                      fill="#f97316"
                      fontSize="7.5"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      FÁBRICA CENTRAL
                    </text>
                  </g>
                </g>
              </svg>

              {/* TOOLTIP SUTIL FLOTANTE AL PASAR SOBRE MISIONES */}
              {showOrigenInfo && !activeDestino && (
                <div
                  className="absolute pointer-events-none rounded-md border border-[#F97316]/60 bg-[#16120b]/95 px-3 py-1.5 shadow-xl backdrop-blur-md transition-all animate-in fade-in zoom-in-95"
                  style={{
                    top: "8%",
                    right: "6%",
                  }}
                >
                  <p className="font-mono text-xs font-semibold text-white whitespace-nowrap">
                    Fábrica Central <span className="text-[#F97316]">|</span> Jardín América, Misiones
                  </p>
                </div>
              )}

              {/* CONTENEDOR DE INFORMACIÓN DE OBRAS: FIJADO LIMPIAMENTE EN ESQUINA INFERIOR IZQUIERDA */}
              <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 z-20 pointer-events-auto w-[250px] sm:w-[280px] rounded-xl border border-border/70 bg-[#10131d]/95 p-3.5 shadow-2xl backdrop-blur-md transition-all duration-200">
                {activeDestino ? (
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="size-3.5 text-[#F97316] shrink-0" />
                          <h4 className="font-display text-base font-700 uppercase tracking-wide text-white">
                            {activeDestino.ciudad}
                          </h4>
                        </div>
                        <p className="text-[11px] font-mono text-[#F97316] uppercase tracking-wider mt-0.5">
                          {activeDestino.provincia}
                        </p>
                      </div>

                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] font-bold uppercase",
                          activeDestino.obras >= 2
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                            : "bg-[#F97316]/20 text-[#F97316] border border-[#F97316]/30",
                        )}
                      >
                        {activeDestino.obras === 1 ? "1 Obra" : `${activeDestino.obras} Obras`}
                      </span>
                    </div>

                    <div className="mt-2.5 space-y-1.5 border-t border-border/40 pt-2 font-mono text-xs">
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase block">Estructura</span>
                        <span className="text-gray-200 font-semibold text-[11px] sm:text-xs">
                          {activeDestino.tipoEstructura}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/20">
                        <span>Distancia:</span>
                        <span className="text-gray-300">
                          ~{activeDestino.distanciaKm.toLocaleString("es-AR")} km desde fábrica
                        </span>
                      </div>
                    </div>

                    {selectedDestino && (
                      <div className="mt-2 flex justify-end">
                        <button
                          onClick={() => setSelectedDestino(null)}
                          className="text-[10px] font-mono text-gray-400 hover:text-white underline cursor-pointer"
                        >
                          Cerrar
                        </button>
                      </div>
                    )}
                  </div>
                ) : showOrigenInfo ? (
                  <div>
                    <div className="flex items-center gap-2">
                      <Factory className="size-4 text-[#F97316] shrink-0" />
                      <div>
                        <h4 className="font-display text-sm font-700 uppercase text-white">
                          Fábrica Central
                        </h4>
                        <p className="text-[11px] font-mono text-[#F97316]">
                          Jardín América, Misiones
                        </p>
                      </div>
                    </div>
                    <p className="mt-2 text-[11px] font-mono text-muted-foreground border-t border-border/40 pt-1.5">
                      Planta matriz de cálculo, fabricación y logística a todo el país.
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground py-0.5">
                    <Compass className="size-3.5 text-[#F97316] shrink-0" />
                    <span className="text-[11px]">Pasá el cursor o tocá un destino para ver el detalle de obra</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
