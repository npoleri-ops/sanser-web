import provinciasData from "./provincias-argentina.json"

export const FECHA_INICIO = new Date("2026-03-09T00:00:00")

export interface ProvinciaPath {
  id: string
  name: string
  d: string
}

export interface UbicacionOrigen {
  id: string
  nombre: string
  ciudad: string
  provincia: string
  pais: string
  coordenadas: {
    lat: number
    lng: number
  }
  svgCoords: {
    x: number
    y: number
  }
  descripcion: string
  badge: string
}

export interface DestinoObra {
  id: string
  ciudad: string
  provincia: string
  obras: number
  coordenadas: {
    lat: number
    lng: number
  }
  svgCoords: {
    x: number
    y: number
  }
  pathD: string // Arco Bézier desde el origen
  distanciaKm: number
  estructuras: string[]
  tipoEstructura?: string
  labelOffset?: {
    x?: number
    y?: number
  }
}

/**
 * Calcula los meses de actividad ininterrumpida desde la fecha de inicio (9 de marzo de 2026)
 */
export function getMesesActividad(fechaInicio: Date = FECHA_INICIO, fechaActual: Date = new Date()): number {
  const anios = fechaActual.getFullYear() - fechaInicio.getFullYear()
  let meses = anios * 12 + (fechaActual.getMonth() - fechaInicio.getMonth())
  if (fechaActual.getDate() < fechaInicio.getDate()) {
    meses -= 1
  }
  return Math.max(1, meses)
}

/**
 * Origen: Misiones (Fábrica Central - Jardín América)
 */
export const ORIGEN_SANSER: UbicacionOrigen = {
  id: "misiones-jardin-america",
  nombre: "Fábrica Central Sanser",
  ciudad: "Jardín América",
  provincia: "Misiones",
  pais: "Argentina",
  coordenadas: {
    lat: -27.0425,
    lng: -55.2289,
  },
  svgCoords: {
    x: 525.6,
    y: 121.7,
  },
  descripcion: "Fábrica Central | Jardín América, Misiones",
  badge: "Fábrica Central",
}

/**
 * Destinos con volumen de obras entregadas
 */
export const DESTINOS_OBRAS: DestinoObra[] = [
  {
    id: "san-juan",
    ciudad: "San Juan",
    provincia: "San Juan",
    obras: 2,
    coordenadas: { lat: -31.5375, lng: -68.5364 },
    svgCoords: { x: 162.6, y: 224.9 },
    pathD: "M 525.6 121.7 Q 325.5 108 162.6 224.9",
    distanciaKm: 1580,
    estructuras: [
      "Tinglado 10x15m a 2 Aguas",
      "Tinglado 10x20m a 2 Aguas",
    ],
    tipoEstructura: "Tinglados Reticulados (2 Obras)",
  },
  {
    id: "barreal",
    ciudad: "Barreal",
    provincia: "San Juan",
    obras: 1,
    coordenadas: { lat: -31.6483, lng: -69.4708 },
    svgCoords: { x: 137.1, y: 227.7 },
    pathD: "M 525.6 121.7 Q 315.0 105.0 137.1 227.7",
    distanciaKm: 1690,
    estructuras: [
      "Nuevo tinglado metálico instalado",
    ],
    tipoEstructura: "Tinglado Metálico Instalado",
    labelOffset: { x: -4, y: 20 },
  },
  {
    id: "cordoba",
    ciudad: "Córdoba",
    provincia: "Córdoba",
    obras: 1,
    coordenadas: { lat: -31.4201, lng: -64.1888 },
    svgCoords: { x: 281.2, y: 222.1 },
    pathD: "M 525.6 121.7 Q 385.3 127.9 281.2 222.1",
    distanciaKm: 1120,
    estructuras: [
      "Tinglado 10x20m a 1 Agua",
    ],
    tipoEstructura: "Tinglado 10x20m a 1 Agua",
  },
  {
    id: "mar-del-plata",
    ciudad: "Mar del Plata",
    provincia: "Buenos Aires",
    obras: 1,
    coordenadas: { lat: -38.0055, lng: -57.5562 },
    svgCoords: { x: 462.1, y: 382.5 },
    pathD: "M 525.6 121.7 Q 446.9 240.7 462.1 382.5",
    distanciaKm: 1480,
    estructuras: [
      "Tinglado 10x30m a 2 Aguas",
    ],
    tipoEstructura: "Tinglado 10x30m a 2 Aguas",
  },
  {
    id: "trenque-lauquen",
    ciudad: "Trenque Lauquen",
    provincia: "Buenos Aires",
    obras: 1,
    coordenadas: { lat: -35.9725, lng: -62.7344 },
    svgCoords: { x: 320.9, y: 331.6 },
    pathD: "M 525.6 121.7 Q 385.5 189.8 320.9 331.6",
    distanciaKm: 1340,
    estructuras: [
      "Tinglado 20x30m a 2 Aguas",
    ],
    tipoEstructura: "Tinglado 20x30m a 2 Aguas",
  },
  {
    id: "villa-regina",
    ciudad: "Villa Regina",
    provincia: "Río Negro",
    obras: 2,
    coordenadas: { lat: -39.1000, lng: -67.0644 },
    svgCoords: { x: 202.8, y: 410.2 },
    pathD: "M 525.6 121.7 Q 312.5 204.0 202.8 410.2",
    distanciaKm: 1860,
    estructuras: [
      "Tinglado 10x20m a 1 Agua",
      "Tinglado 10x20m a 1 Agua",
    ],
    tipoEstructura: "Tinglados Reticulados (2 Obras)",
  },
]

export const PROVINCIAS_ARGENTINA: ProvinciaPath[] = provinciasData as ProvinciaPath[]

// Métricas consolidadas
export const TOTAL_OBRAS = DESTINOS_OBRAS.reduce((acc, d) => acc + d.obras, 0)
export const TOTAL_DESTINOS = DESTINOS_OBRAS.length
export const PROVINCIAS_ALCANZADAS = Array.from(new Set(DESTINOS_OBRAS.map((d) => d.provincia))).length + 1 // +1 por Misiones
