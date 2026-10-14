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
    // Si está a la izquierda (ej. San Juan x=162 o Neuquén x=175), desplegar hacia la derecha
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

  // Referencia para la animación secuencial de entrada con Framer Motion al scrollear
  const sectionRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(sectionRef, { once: true, amount: 0.25 })

  useEffect(() => {
    setMeses(getMesesActividad())
  }, [])

  const activeDestino = hoveredDestino || selectedDestino

  // Provincias con presencia activa para resaltarlas con sutil tono
  const provinciasActivas = new Set([
    "misiones",
    "san-juan",
    "cordoba",
    "buenos-aires",
    "neuquen",
  ])

  // Orden de trazado secuencial por prioridad/volumen (comenzando por San Juan con mayor volumen)
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
                  {/* Resplandor (glow) dorado aumentado para rutas principales / alta densidad */}
                  <filter id="glow-gold-mega" x="-40%" y="-40%" width="180%" height="180%">
                    <feGaussianBlur stdDeviation="4.5" result="coloredBlur" />
                    <feGaussianBlur stdDeviation="2" result="sharpBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="sharpBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>

                  {/* Resplandor para el contorno del badge del pin de alta densidad */}
                  <filter id="glow-pin-badge" x="-30%" y="-30%" width="160%" height="160%">
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

                {/* RUTAS: TRAZADO SECUENCIAL ANIMADO CON FRAMER MOTION Y ESCALA DE ALTA DENSIDAD */}
                <g id="rutas-layer">
                  {DESTINOS_OBRAS.map((destino) => {
                    // Escala de densidad: alta densidad (2+ obras) y mega densidad (5+ o 10+ obras)
                    const isMegaVolume = destino.obras >= 5
                    const isHighDensity = destino.obras >= 2 || isMegaVolume
                    const isTargeted = activeDestino?.id === destino.id

                    // Orden escalonado: San Juan (índice 0) comienza primero, luego las demás localidades
                    const orderIndex = getOrderIndex(destino.id)
                    const drawDelay = 0.2 + orderIndex * 0.35

                    return (
                      <g key={`route-${destino.id}`} className="transition-all duration-300">
                        {/* 1. Underlying glow stroke para alta densidad */}
                        {isHighDensity && (
                          <motion.path
                            d={destino.pathD}
                            fill="none"
                            stroke="#ffb700"
                            strokeWidth={isMegaVolume ? "6.5" : "5"}
                            strokeOpacity={isTargeted ? 0.75 : 0.45}
                            strokeLinecap="round"
                            filter="url(#glow-gold-mega)"
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={
                              isInView
                                ? { pathLength: 1, opacity: isTargeted ? 0.75 : 0.45 }
                                : { pathLength: 0, opacity: 0 }
                            }
                            transition={{
                              duration: isHighDensity ? 1.4 : 1.1,
                              delay: drawDelay,
                              ease: [0.16, 1, 0.3, 1],
                            }}
                          />
                        )}

                        {/* 2. Trazo continuo dibujado progresivamente desde Misiones */}
                        <motion.path
                          d={destino.pathD}
                          fill="none"
                          stroke={isHighDensity ? "#ffaa00" : "#f97316"}
                          strokeWidth={
                            isMegaVolume
                              ? isTargeted
                                ? "5"
                                : "4.2"
                              : isHighDensity
                              ? isTargeted
                                ? "4.2"
                                : "3.5"
                              : isTargeted
                              ? "2.6"
                              : "1.8"
                          }
                          strokeOpacity={isHighDensity ? (isTargeted ? 1 : 0.95) : isTargeted ? 0.9 : 0.65}
                          strokeLinecap="round"
                          filter={isHighDensity ? "url(#glow-gold-mega)" : "url(#glow-standard)"}
                          initial={{ pathLength: 0, opacity: 0 }}
                          animate={
                            isInView
                              ? { pathLength: 1, opacity: isHighDensity ? 0.95 : 0.65 }
                              : { pathLength: 0, opacity: 0 }
                          }
                          transition={{
                            duration: isHighDensity ? 1.4 : 1.1,
                            delay: drawDelay,
                            ease: [0.16, 1, 0.3, 1],
                          }}
                        />

                        {/* 3. Partículas de luz con cantidad y velocidad según volumen */}
                        {isInView && (
                          isHighDensity ? (
                            // Múltiples partículas rápidas desfasadas para alto flujo de despachos
                            <g>
                              {/* Partícula principal blanca brillante */}
                              <circle
                                r={isMegaVolume ? "4" : "3.2"}
                                fill="#ffffff"
                                filter="url(#glow-gold-mega)"
                              >
                                <animateMotion
                                  path={destino.pathD}
                                  dur={isMegaVolume ? "1.4s" : "1.7s"}
                                  repeatCount="indefinite"
                                />
                              </circle>

                              {/* Segunda partícula dorada intermedia */}
                              <circle
                                r={isMegaVolume ? "3.5" : "2.8"}
                                fill="#ffea00"
                                filter="url(#glow-gold-mega)"
                              >
                                <animateMotion
                                  path={destino.pathD}
                                  dur={isMegaVolume ? "1.4s" : "1.7s"}
                                  begin={isMegaVolume ? "0.45s" : "0.55s"}
                                  repeatCount="indefinite"
                                />
                              </circle>

                              {/* Tercera partícula ámbar */}
                              <circle
                                r={isMegaVolume ? "3" : "2.5"}
                                fill="#ffb703"
                                filter="url(#glow-gold-mega)"
                              >
                                <animateMotion
                                  path={destino.pathD}
                                  dur={isMegaVolume ? "1.4s" : "1.7s"}
                                  begin={isMegaVolume ? "0.9s" : "1.1s"}
                                  repeatCount="indefinite"
                                />
                              </circle>
                            </g>
                          ) : (
                            // Partícula suave estándar para rutas de menor densidad
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

                {/* NODOS DE DESTINOS CON ENTRADA ESCALONADA Y CONTORNO RESPLANDECIENTE */}
                <g id="destinos-layer">
                  {DESTINOS_OBRAS.map((destino) => {
                    const isMegaVolume = destino.obras >= 5
                    const isHighDensity = destino.obras >= 2 || isMegaVolume
                    const isTargeted = activeDestino?.id === destino.id
                    const { x, y } = destino.svgCoords

                    const orderIndex = getOrderIndex(destino.id)
                    const pinDelay = 0.2 + orderIndex * 0.35 + 0.7

                    return (
                      <motion.g
                        key={`pin-${destino.id}`}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={isInView ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
                        transition={{
                          delay: pinDelay,
                          duration: 0.4,
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
                        {/* Halo estático suave en hover o selección */}
                        <circle
                          cx={x}
                          cy={y}
                          r={isHighDensity ? (isTargeted ? "14" : "10") : isTargeted ? "10" : "7"}
                          fill={isHighDensity ? "rgba(255,183,3,0.3)" : "rgba(249,115,22,0.18)"}
                          stroke={isHighDensity ? "#ffb703" : "#f97316"}
                          strokeWidth={isHighDensity ? "1.8" : "1"}
                          className="transition-all duration-200"
                        />

                        {/* Punto central del nodo */}
                        <circle
                          cx={x}
                          cy={y}
                          r={isHighDensity ? "5.5" : "3.8"}
                          fill={isHighDensity ? "#ffb703" : "#f97316"}
                          stroke="#ffffff"
                          strokeWidth="1.2"
                          filter={isHighDensity ? "url(#glow-gold-mega)" : "none"}
                        />

                        {/* Etiqueta compacta en el mapa con contorno resplandeciente para alta densidad */}
                        <g transform={`translate(${x}, ${y - 12})`}>
                          {/* Contorno exterior resplandeciente para rutas principales */}
                          {isHighDensity && (
                            <rect
                              x="-44"
                              y="-16"
                              width="88"
                              height="20"
                              rx="10"
                              fill="none"
                              stroke="#ffc107"
                              strokeWidth="1.8"
                              filter="url(#glow-pin-badge)"
                              opacity="0.9"
                            />
                          )}

                          <rect
                            x={isHighDensity ? "-42" : "-34"}
                            y="-14"
                            width={isHighDensity ? "84" : "68"}
                            height="16"
                            rx="8"
                            fill={isHighDensity ? "#211608" : "#12151e"}
                            stroke={isHighDensity ? "#ffb703" : isTargeted ? "#f97316" : "#2a3346"}
                            strokeWidth={isHighDensity ? "1.8" : "0.8"}
                          />
                          <text
                            x="0"
                            y="-3"
                            textAnchor="middle"
                            fill={isHighDensity ? "#ffea00" : "#e2e8f0"}
                            fontSize={isHighDensity ? "8.8" : "7.5"}
                            fontWeight="bold"
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
                  initial={{ scale: 0, opacity: 0 }}
                  animate={isInView ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
                  transition={{ duration: 0.5, type: "spring", stiffness: 300, damping: 20 }}
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
