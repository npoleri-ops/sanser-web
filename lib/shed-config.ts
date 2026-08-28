export type ShedType = "gable" | "shed" | "gable_portico" // dos aguas / una agua / pórtico
export type SheetType = "t101" | "sinusoidal"
export type WallSheetType = "same" | "t101" | "sinusoidal"
export type RoofColor = "cincalum" | "gris" | "negro"
export type EnvironmentType = "day" | "afternoon" | "night"

export interface ShedConfig {
  type: ShedType
  width: number // ancho (m)
  length: number // largo (m)
  height: number // altura libre (m)
  sheet: SheetType
  wallSheet: WallSheetType
  color: RoofColor
  environment: EnvironmentType
  walls: boolean // cerramientos laterales
  gate: boolean // portón frontal
  gateBack: boolean // portón trasero
  centralColumns?: boolean // columnas intermedias de apoyo (1 agua)
}

export const DEFAULT_CONFIG: ShedConfig = {
  type: "gable",
  width: 15,
  length: 20,
  height: 5,
  sheet: "t101",
  wallSheet: "same",
  color: "negro",
  environment: "day",
  walls: false,
  gate: false,
  gateBack: false,
  centralColumns: false,
}

export const LIMITS = {
  width: { min: 8, max: 30, step: 1 },
  length: { min: 10, max: 60, step: 1 },
  height: { min: 4, max: 8, step: 0.5 },
}

export const COLOR_HEX: Record<RoofColor, string> = {
  cincalum: "#c9ced6",
  gris: "#3b3f46",
  negro: "#141518",
}

export const COLOR_LABEL: Record<RoofColor, string> = {
  cincalum: "Cincalum (Plateado)",
  gris: "Gris Oscuro",
  negro: "Negro Mate",
}

export const SHEET_LABEL: Record<SheetType, string> = {
  t101: "Cincalum T-101",
  sinusoidal: "Sinusoidal",
}

export const TYPE_LABEL: Record<ShedType, string> = {
  gable: "A 2 Aguas (Triangular)",
  gable_portico: "A 2 Aguas (Pórtico Reticulado)",
  shed: "A 1 Agua",
}

// Roof pitch (approx) used both for geometry and area math
export const PITCH_DEG = 12
const PITCH_RAD = (PITCH_DEG * Math.PI) / 180

export interface Computo {
  columnas: number
  cabreadas: number
  frames: number
  bays: number
  superficieTecho: number
  superficiePlanta: number
  correas: number
}

export function computeMateriales(config: ShedConfig): Computo {
  const { width, length, type } = config

  // Un pórtico cada ~5 m
  const bays = Math.max(2, Math.round(length / 5))
  const frames = bays + 1

  // Cada pórtico transversal lleva 2 columnas reticuladas
  let columnas = frames * 2
  if (type === "shed" && config.centralColumns) {
    columnas += frames
  }
  const cabreadas = frames

  const superficiePlanta = width * length

  // Superficie de techo considerando la pendiente
  let superficieTecho: number
  let correas: number
  if (type === "gable" || type === "gable_portico") {
    // dos faldones: ancho inclinado total = width / cos(pitch)
    const slopeLen = (width / 2) / Math.cos(PITCH_RAD)
    superficieTecho = length * (slopeLen * 2)
    const n = Math.max(3, Math.min(14, Math.round(slopeLen / 1.6)))
    correas = (n + 1) * 2
  } else {
    const shedRise = width * Math.tan((8 * Math.PI) / 180)
    const ang = Math.atan(shedRise / width)
    const slopeLen = width / Math.cos(ang)
    superficieTecho = length * slopeLen
    const n = Math.max(3, Math.min(14, Math.round(slopeLen / 1.6)))
    correas = n + 1
  }

  return {
    columnas,
    cabreadas,
    frames,
    bays,
    superficiePlanta: Math.round(superficiePlanta),
    superficieTecho: Math.round(superficieTecho),
    correas,
  }
}

const WHATSAPP_NUMBER = "5493743487728" // 03743-487728

export function buildWhatsAppMessage(config: ShedConfig): string {
  const { width, length, height, type, color, sheet } = config
  const computo = computeMateriales(config)

  const extras: string[] = []
  if (config.walls) extras.push("con cerramientos laterales")
  if (config.gate && config.gateBack) {
    extras.push("con portón pasante (Frente y Fondo)")
  } else if (config.gate) {
    extras.push("con portón frontal")
  } else if (config.gateBack) {
    extras.push("con portón trasero")
  }
  const extrasTxt = extras.length ? ` ${extras.join(" y ")}` : ""

  return `¡Hola SANSER Metalúrgica! Quisiera cotizar un tinglado de ` +
    `${width}m x ${length}m x ${height}m ${TYPE_LABEL[type]}, ` +
    `con techo ${COLOR_LABEL[color]} de chapa ${SHEET_LABEL[sheet]}${extrasTxt}. ` +
    `(Superficie de techo aprox. ${computo.superficieTecho} m² · ` +
    `${computo.columnas} columnas · ${computo.cabreadas} cabreadas · ${computo.correas} líneas de correas). ` +
    `¿Me pasan un presupuesto?`
}

export function buildWhatsAppUrl(config: ShedConfig): string {
  const message = buildWhatsAppMessage(config)
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
}

export const CONTACT = {
  phoneDisplay: "03743-487728",
  phoneSecondaryDisplay: "03743-448876",
  phoneSecondaryRaw: "+543743448876",
  whatsappSecondaryBase: `https://wa.me/543743448876`,
  phoneRaw: WHATSAPP_NUMBER,
  whatsappBase: `https://wa.me/${WHATSAPP_NUMBER}`,
  address: "Ecuador 811, Jardín América, Misiones, Argentina.",
  email: "sansermetalurgica@gmail.com",
}
