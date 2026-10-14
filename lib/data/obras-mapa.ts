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
  tipoObra: string
  descripcion: string
  año: number
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
 * Origen: Misiones (Fábrica Sanser - Jardín América)
 */
export const ORIGEN_SANSER: UbicacionOrigen = {
  id: "misiones-jardin-america",
  nombre: "Fábrica Sanser Metalúrgica",
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
  descripcion: "Planta industrial de corte, perfilado, reticulado y armado con despacho a todo el país.",
  badge: "Fábrica Matriz",
}

/**
 * Destinos con volumen de obras entregadas
 */
export const DESTINOS_OBRAS: DestinoObra[] = [
  {
    id: "san-juan",
    ciudad: "San Juan Capital",
    provincia: "San Juan",
    obras: 2,
    coordenadas: { lat: -31.5375, lng: -68.5364 },
    svgCoords: { x: 162.6, y: 224.9 },
    pathD: "M 525.6 121.7 Q 325.5 108 162.6 224.9",
    distanciaKm: 1580,
    tipoObra: "Galpones Reticulados a Dos Aguas",
    descripcion: "2 estructuras metálicas completas fabricadas a medida con traslado y montaje especializado.",
    año: 2026,
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
    tipoObra: "Nave Industrial Comercial",
    descripcion: "Tinglado en perfil C reticulado para almacenamiento logístico y distribución.",
    año: 2026,
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
    tipoObra: "Galpón Industrial Costero",
    descripcion: "Estructura con tratamiento anticorrosivo especial para zona marítima y vientos costeros.",
    año: 2026,
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
    tipoObra: "Tinglado Agropecuario",
    descripcion: "Nave para resguardo de maquinaria y granos con luces libres sin columnas intermedias.",
    año: 2026,
  },
  {
    id: "neuquen",
    ciudad: "Neuquén",
    provincia: "Neuquén",
    obras: 1,
    coordenadas: { lat: -38.9516, lng: -68.0591 },
    svgCoords: { x: 175.7, y: 406.7 },
    pathD: "M 525.6 121.7 Q 299.3 201.2 175.7 406.7",
    distanciaKm: 1950,
    tipoObra: "Galpón Comercial Patagónico",
    descripcion: "Estructura reforzada para sobrecargas de viento y clima riguroso en el norte patagónico.",
    año: 2026,
  },
]

export const PROVINCIAS_ARGENTINA: ProvinciaPath[] = provinciasData as ProvinciaPath[]

// Métricas consolidadas
export const TOTAL_OBRAS = DESTINOS_OBRAS.reduce((acc, d) => acc + d.obras, 0)
export const TOTAL_DESTINOS = DESTINOS_OBRAS.length
export const PROVINCIAS_ALCANZADAS = Array.from(new Set(DESTINOS_OBRAS.map((d) => d.provincia))).length + 1 // +1 por Misiones
