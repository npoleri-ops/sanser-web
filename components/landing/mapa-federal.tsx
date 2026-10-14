"use client"

import { useState, useEffect, useRef } from "react"
import { motion, useInView } from "framer-motion"
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
  getMesesActividad,
  DestinoObra,
} from "@/lib/data/obras-mapa"
import { cn } from "@/lib/utils"

interface MapaFederalProps {
  onGoEditor?: () => void
}

/**
 * Calcula el offset y transform para que el popover flote pegado al nodo sin tapar el pin ni cortarse por los bordes
 */
function getTooltipStyle(x: number, y: number) {
  let translateX = "-50%"
  let translateY = "calc(-100% - 24px)"

  // Si está a la derecha (ej. Mar del Plata x=462 o Misiones x=525), desplegar hacia la izquierda
  if (x > 380) {
    translateX = "-90%"
  } else if (x < 220) {
    // Si está a la izquierda (ej. San Juan x=162 o Villa Regina x=202), desplegar hacia la derecha
    translateX = "-10%"
  }

  // Si está cerca del borde superior (ej. Misiones y=121), desplegar hacia abajo
  if (y < 160) {
    translateY = "26px"
  }

  return {
    left: `${(x / 600) * 100}%`,
    top: `${(y / 900) * 100}%`,
    transform: `translate(${translateX}, ${translateY})`,
  }
}

export function MapaFederal({ onGoEditor }: MapaFederalProps = {}) {
  const [meses, setMeses] = useState<number>(() => getMesesActividad())
  const [selectedDestino, setSelectedDestino] = useState<DestinoObra | null>(null)
  const [hoveredDestino, setHoveredDestino] = useState<DestinoObra | null>(null)
  const [showOrigenInfo, setShowOrigenInfo] = useState(false)

  // Referencia para reiniciar la animación secuencial al entrar y salir del viewport (once: false)
  const sectionRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(sectionRef, { once: false, amount: 0.25 })

  // Contador de reinicio para resetear SVG animateMotion en cada re-entrada al viewport
  const [animationKey, setAnimationKey] = useState(0)
  const prevInView = useRef(false)

  useEffect(() => {
    setMeses(getMesesActividad())
  }, [])

  useEffect(() => {
    if (isInView && !prevInView.current) {
      setAnimationKey((k) => k + 1)
    }
    prevInView.current = isInView
  }, [isInView])

  const activeDestino = hoveredDestino || selectedDestino

  // Provincias con presencia activa para resaltarlas con sutil tono
  const provinciasActivas = new Set([
    "misiones",
    "san-juan",
    "cordoba",
    "buenos-aires",
    "rio-negro",
  ])

  // Orden de trazado secuencial por prioridad/volumen (comenzando por San Juan)
  const destinosOrdenados = [...DESTINOS_OBRAS].sort((a, b) => b.obras - a.obras)
  const getOrderIndex = (id: string) => destinosOrdenados.findIndex((d) => d.id === id)

  return (
    <section
      id="envios"
      ref={sectionRef}
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
        {/* ENCABEZADO CENTRADO CON MÉTRICA SIMÉTRICA */}
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

          {/* BADGE CENTRAL DE TRAYECTORIA CON TIPOGRAFÍA UNIFICADA */}
          <div className="mt-7 flex flex-wrap items-center justify-center">
            <div className="inline-flex flex-wrap items-center justify-center gap-2.5 sm:gap-4 rounded-full border border-[#F97316]/40 bg-gradient-to-r from-[#171b26]/95 via-[#1a1f2c]/95 to-[#171b26]/95 px-5 sm:px-7 py-2.5 sm:py-3 font-mono shadow-xl shadow-black/50 backdrop-blur-md ring-1 ring-[#F97316]/20">
              <span className="flex size-2 rounded-full bg-[#F97316] shadow-sm shadow-[#F97316] shrink-0" />

              {/* Primer bloque: Meses fabricando */}
              <span className="inline-flex items-baseline gap-1.5 text-xs sm:text-sm text-gray-200">
                <span className="text-base sm:text-lg font-bold font-mono text-[#F97316] leading-none">
                  {meses}
                </span>
                <span>Meses fabricando</span>
              </span>

              <span className="text-gray-600 font-bold">•</span>

              {/* Segundo bloque: Obras entregadas */}
              <span className="inline-flex items-baseline gap-1.5 text-xs sm:text-sm text-gray-200">
                <span className="text-base sm:text-lg font-bold font-mono text-[#F97316] leading-none">
                  {TOTAL_OBRAS}
                </span>
                <span>Obras entregadas</span>
              </span>

              <span className="text-gray-600 font-bold">•</span>

              {/* Tercer bloque: Desde el 9 de marzo de 2026 */}
              <span className="text-xs sm:text-sm text-gray-200">
                Desde el 9 de marzo de 2026
              </span>
            </div>
          </div>
        </div>

        {/* MAPA FEDERAL: CUADRO PRINCIPAL CENTRADO */}
        <div className="mt-12 mx-auto max-w-4xl w-full">
          <div className="relative rounded-2xl border border-border/70 bg-[#0f121a] p-4 sm:p-8 shadow-2xl shadow-black/80 overflow-hidden">
            {/* Technical HUD tag */}
            <div className="pointer-events-none absolute top-4 left-4 sm:top-5 sm:left-6 flex items-center gap-2 font-mono text-[11px] text-muted-foreground uppercase tracking-widest">
              <Compass className="size-3.5 text-[#F97316]" />
              <span>Mapa Federal de Entregas</span>
            </div>

            {/* CONTENEDOR DEL MAPA CON ASPECT RATIO EXACTO PARA POPOVERS RELATIVOS */}
            <div className="relative mx-auto mt-8 sm:mt-10 w-full max-w-[540px] aspect-[2/3]">
              <svg
                viewBox="0 0 600 900"
                className="w-full h-full select-none cursor-default"
                style={{ filter: "drop-shadow(0 10px 30px rgba(0,0,0,0.7))" }}
                onClick={() => {
                  setSelectedDestino(null)
                  setShowOrigenInfo(false)
                }}
              >
                <defs>
                  {/* Sutil resplandor estándar unificado en naranja */}
                  <filter id="glow-standard" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
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
                        (activeDestino.provincia === "Río Negro" && prov.id === "rio-negro"))

                    return (
                      <path
                        key={prov.id}
                        d={prov.d}
                        fill={
                          isOrigen
                            ? "rgba(249, 115, 22, 0.22)"
                            : isDestinoActivo
                            ? "rgba(249, 115, 22, 0.18)"
                            : isActiva
                            ? "#1b212e"
                            : "#141720"
                        }
                        stroke={
                          isOrigen
                            ? "#f97316"
                            : isDestinoActivo
                            ? "#f97316"
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

                {/* RUTAS: TRAZADO SECUENCIAL REINICIABLE Y COLOR NARANJA UNIFICADO */}
                <g id="rutas-layer" key={`routes-${animationKey}`}>
                  {DESTINOS_OBRAS.map((destino) => {
                    const isHighVolume = destino.obras >= 2
                    const isTargeted = activeDestino?.id === destino.id

                    // Orden escalonado: San Juan (índice 0) comienza primero, luego las demás localidades
                    const orderIndex = getOrderIndex(destino.id)
                    const drawDelay = 0.2 + orderIndex * 0.35

                    return (
                      <g key={`route-${destino.id}`} className="transition-all duration-300">
                        {/* Trazo continuo dibujado progresivamente desde Misiones (Naranja unificado para todas) */}
                        <motion.path
                          d={destino.pathD}
                          fill="none"
                          stroke="#f97316"
                          strokeWidth={isTargeted ? "2.6" : "1.8"}
                          strokeOpacity={isTargeted ? 0.95 : 0.75}
                          strokeLinecap="round"
                          filter="url(#glow-standard)"
                          initial={{ pathLength: 0, opacity: 0 }}
                          animate={
                            isInView
                              ? { pathLength: 1, opacity: isTargeted ? 0.95 : 0.75 }
                              : { pathLength: 0, opacity: 0 }
                          }
                          transition={{
                            duration: 1.2,
                            delay: drawDelay,
                            ease: [0.16, 1, 0.3, 1],
                          }}
                        />

                        {/* Flujo de partículas: San Juan se diferencia sutilmente con dos pelotitas juntas en tándem */}
                        {isInView && (
                          isHighVolume ? (
                            // San Juan: Dos pelotitas juntas que viajan en tándem por la ruta
                            <g>
                              <circle r="2.8" fill="#fed7aa">
                                <animateMotion
                                  path={destino.pathD}
                                  dur="3.4s"
                                  begin="0s"
                                  repeatCount="indefinite"
                                />
                              </circle>
                              <circle r="2.8" fill="#fed7aa">
                                <animateMotion
                                  path={destino.pathD}
                                  dur="3.4s"
                                  begin="0.28s"
                                  repeatCount="indefinite"
                                />
                              </circle>
                            </g>
                          ) : (
                            // Rutas estándar: 1 sola pelotita suave
                            <circle r="2.5" fill="#fed7aa">
                              <animateMotion
                                path={destino.pathD}
                                dur="3.8s"
                                repeatCount="indefinite"
                              />
                            </circle>
                          )
                        )}
                      </g>
                    )
                  })}
                </g>

                {/* NODOS DE DESTINOS: ESTILO Y COLOR NARANJA UNIFICADOS CON ENTRADA ESCALONADA */}
                <g id="destinos-layer" key={`pins-${animationKey}`}>
                  {DESTINOS_OBRAS.map((destino) => {
                    const isTargeted = activeDestino?.id === destino.id
                    const { x, y } = destino.svgCoords

                    const orderIndex = getOrderIndex(destino.id)
                    const pinDelay = 0.2 + orderIndex * 0.35 + 0.65

                    return (
                      <motion.g
                        key={`pin-${destino.id}`}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={isInView ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
                        transition={{
                          delay: pinDelay,
                          duration: 0.35,
                          type: "spring",
                          stiffness: 280,
                          damping: 22,
                        }}
                        className="cursor-pointer group"
                        onMouseEnter={() => {
                          setHoveredDestino(destino)
                          setShowOrigenInfo(false)
                        }}
                        onMouseLeave={() => setHoveredDestino(null)}
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowOrigenInfo(false)
                          setSelectedDestino((curr) => (curr?.id === destino.id ? null : destino))
                        }}
                        onTouchStart={(e) => {
                          e.stopPropagation()
                          setShowOrigenInfo(false)
                          setSelectedDestino(destino)
                        }}
                        tabIndex={0}
                        role="button"
                        aria-label={`Ver información de ${destino.ciudad}, ${destino.provincia}`}
                      >
                        {/* Halo estático suave unificado */}
                        <circle
                          cx={x}
                          cy={y}
                          r={isTargeted ? "11" : "8"}
                          fill="rgba(249,115,22,0.2)"
                          stroke="#f97316"
                          strokeWidth={isTargeted ? "1.6" : "1"}
                          className="transition-all duration-200"
                        />

                        {/* Punto central del nodo */}
                        <circle
                          cx={x}
                          cy={y}
                          r="4"
                          fill="#f97316"
                          stroke="#ffffff"
                          strokeWidth="1.2"
                        />

                        {/* Etiqueta compacta en el mapa (Diseño y tipografía armonizados) */}
                        <g transform={`translate(${x}, ${y - 12})`}>
                          <rect
                            x="-36"
                            y="-14"
                            width="72"
                            height="16"
                            rx="8"
                            fill="#12151e"
                            stroke={isTargeted ? "#f97316" : "#2a3346"}
                            strokeWidth={isTargeted ? "1.2" : "0.8"}
                          />
                          <text
                            x="0"
                            y="-3"
                            textAnchor="middle"
                            fill={isTargeted ? "#f97316" : "#e2e8f0"}
                            fontSize="7.8"
                            fontWeight="600"
                            fontFamily="monospace"
                          >
                            {destino.ciudad} ({destino.obras})
                          </text>
                        </g>
                      </motion.g>
                    )
                  })}
                </g>

                {/* ORIGEN MISIONES (FÁBRICA CENTRAL) */}
                <motion.g
                  id="origen-misiones"
                  key={`origen-${animationKey}`}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={isInView ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
                  transition={{ duration: 0.4, type: "spring", stiffness: 300, damping: 20 }}
                  className="cursor-pointer"
                  onMouseEnter={() => {
                    setShowOrigenInfo(true)
                    setHoveredDestino(null)
                  }}
                  onMouseLeave={() => setShowOrigenInfo(false)}
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedDestino(null)
                    setShowOrigenInfo((prev) => !prev)
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation()
                    setSelectedDestino(null)
                    setShowOrigenInfo(true)
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
                </motion.g>
              </svg>

              {/* TOOLTIP FLOTANTE PEGADO A MISIONES (POINTER-EVENTS: NONE PARA NO PARPADEAR) */}
              {showOrigenInfo && !activeDestino && (
                <div
                  className="pointer-events-none absolute z-30 w-[230px] sm:w-[250px] rounded-xl border border-[#F97316]/60 bg-[#14120f]/95 p-3.5 shadow-2xl shadow-black/90 backdrop-blur-md transition-all duration-200 animate-in fade-in zoom-in-95"
                  style={getTooltipStyle(ORIGEN_SANSER.svgCoords.x, ORIGEN_SANSER.svgCoords.y)}
                >
                  <div className="flex items-center gap-1.5 border-b border-border/40 pb-2">
                    <Factory className="size-3.5 text-[#F97316] shrink-0" />
                    <span className="font-display text-sm font-700 uppercase tracking-wide text-white">
                      Fábrica Central
                    </span>
                  </div>
                  <p className="mt-1.5 font-mono text-xs font-semibold text-[#F97316]">
                    Jardín América, Misiones
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-gray-300 leading-relaxed">
                    Planta matriz de cálculo, fabricación y logística a todo el país.
                  </p>
                </div>
              )}

              {/* TOOLTIP FLOTANTE PEGADO AL NODO DESTINO CON DESGLOSE DE OBRAS (POINTER-EVENTS: NONE) */}
              {activeDestino && (
                <div
                  className="pointer-events-none absolute z-30 w-[230px] sm:w-[260px] rounded-xl border border-[#F97316]/50 bg-[#121520]/95 p-3.5 shadow-2xl shadow-black/90 backdrop-blur-md transition-all duration-200 animate-in fade-in zoom-in-95"
                  style={getTooltipStyle(activeDestino.svgCoords.x, activeDestino.svgCoords.y)}
                >
                  {/* Encabezado del Popover */}
                  <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <MapPin className="size-3.5 text-[#F97316] shrink-0" />
                      <span className="font-display text-sm font-700 uppercase tracking-wide text-white truncate">
                        {activeDestino.ciudad}
                      </span>
                    </div>

                    <span className="shrink-0 rounded-full bg-[#F97316]/20 text-[#F97316] border border-[#F97316]/30 px-2 py-0.5 font-mono text-[10px] font-bold uppercase">
                      {activeDestino.obras === 1 ? "1 Obra" : `${activeDestino.obras} Obras`}
                    </span>
                  </div>

                  {/* Desglose de obras con viñetas limpias */}
                  <div className="mt-2 space-y-1 text-xs font-mono">
                    {activeDestino.estructuras.map((est, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-gray-200">
                        <span className="text-[#F97316] text-[11px] leading-snug">•</span>
                        <span className="leading-snug">{est}</span>
                      </div>
                    ))}
                  </div>

                  {/* Distancia */}
                  <div className="mt-2.5 pt-1.5 border-t border-border/30 text-[11px] font-mono text-muted-foreground flex items-center justify-between">
                    <span className="text-gray-400">Distancia:</span>
                    <span className="text-gray-200">
                      ~{activeDestino.distanciaKm.toLocaleString("es-AR")} km desde fábrica
                    </span>
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
